using LimpiApp.Api.Common.Email;
using LimpiApp.Api.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace LimpiApp.IntegrationTests.Infrastructure;

/// <summary>The API on the shared test Postgres, with the prototype's fixed clock (Wed 14 Oct 2026 09:00 Europe/Madrid).</summary>
public class ApiFactory(PostgresFixture db) : WebApplicationFactory<Program>
{
    public static readonly DateTimeOffset PrototypeNow = new(2026, 10, 14, 7, 0, 0, TimeSpan.Zero);

    public TestClock Time { get; } = new(PrototypeNow);

    public PostgresFixture Db => db;

    public RecordingEmailSender Emails { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Not "Development": the developer exception page would leak stack traces.
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:Db", db.ConnectionString);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Time);
            services.AddSingleton<IStartupFilter, ThrowingEndpointFilter>();
            services.RemoveAll<IEmailSender>();
            services.AddSingleton<IEmailSender>(Emails);
            FakeGoogleExternalHandler.Use(services);
        });
    }

    /// <summary>An HTTPS client (the session cookie is Secure) that keeps cookies and does not follow redirects.</summary>
    public HttpClient CreateBrowser() => CreateClient(new WebApplicationFactoryClientOptions
    {
        BaseAddress = new Uri("https://localhost"),
        AllowAutoRedirect = false,
        HandleCookies = true,
    });

    public AppDbContext CreateDbContext() => Services.CreateScope().ServiceProvider.GetRequiredService<AppDbContext>();

    /// <summary>Adds GET /__test/throw at the end of the pipeline to exercise the exception handler.</summary>
    private sealed class ThrowingEndpointFilter : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
        {
            next(app);
            app.Use((HttpContext ctx, RequestDelegate nextDelegate) =>
                ctx.Request.Path == "/__test/throw"
                    ? throw new InvalidOperationException("secret internal detail")
                    : nextDelegate(ctx));
        };
    }
}

/// <summary>Base class: every test starts with the app migrated and the tables empty.</summary>
public abstract class IntegrationTest(ApiFactory factory) : IClassFixture<ApiFactory>, IAsyncLifetime
{
    protected ApiFactory Factory => factory;

    protected static CancellationToken Ct => TestContext.Current.CancellationToken;

    public async ValueTask InitializeAsync()
    {
        _ = factory.Server; // starts the host, which applies the migrations
        await factory.Db.ResetAsync();
        factory.Time.SetUtcNow(ApiFactory.PrototypeNow);
        factory.Emails.Clear();
    }

    public ValueTask DisposeAsync()
    {
        GC.SuppressFinalize(this);
        return ValueTask.CompletedTask;
    }
}

/// <summary>Keeps the emails instead of sending them: tests never talk to an SMTP server.</summary>
public sealed class RecordingEmailSender : IEmailSender
{
    private readonly List<EmailMessage> _sent = [];

    public IReadOnlyList<EmailMessage> Sent
    {
        get { lock (_sent) { return [.. _sent]; } }
    }

    public Task SendAsync(EmailMessage message, CancellationToken ct)
    {
        lock (_sent) { _sent.Add(message); }
        return Task.CompletedTask;
    }

    public void Clear()
    {
        lock (_sent) { _sent.Clear(); }
    }

    /// <summary>The token of the last link sent to `to`.</summary>
    public string LastToken(string to) =>
        System.Text.RegularExpressions.Regex.Match(Sent.Last(m => m.To == to).TextBody, @"token=([A-Za-z0-9_-]+)").Groups[1].Value;
}

/// <summary>A clock tests can set and move, also backwards (the factory is shared by the tests of a class).</summary>
public sealed class TestClock(DateTimeOffset now) : TimeProvider
{
    private DateTimeOffset _now = now;

    public override DateTimeOffset GetUtcNow() => _now;

    public void SetUtcNow(DateTimeOffset value) => _now = value;

    public void Advance(TimeSpan by) => _now += by;
}

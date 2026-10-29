using System.Net.Http.Json;
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

    /// <summary>An HTTPS client (the session cookie is Secure) that keeps cookies and does not follow redirects.
    /// Like the SPA, it sends the CSRF header on every request.</summary>
    public HttpClient CreateBrowser()
    {
        var client = CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false,
            HandleCookies = true,
        });
        client.DefaultRequestHeaders.Add("X-Requested-With", "limpiapp");
        return client;
    }

    /// <summary>A browser signed in as `email` (created if needed), through the emailed link.</summary>
    public async Task<HttpClient> SignedInAsync(string email = "josep@example.com")
    {
        var client = CreateBrowser();
        await client.PostAsJsonAsync("/auth/magic-link", new { email }, TestContext.Current.CancellationToken);
        await client.GetAsync($"/auth/magic?token={Emails.LastToken(email)}", TestContext.Current.CancellationToken);
        return client;
    }

    /// <summary>Creates a household through the API (Europe/Madrid) and returns its id.</summary>
    public static async Task<Guid> CreateHouseholdAsync(HttpClient client, string name = "Casa Pau y Josep", params string[] templates)
    {
        var response = await client.PostAsJsonAsync("/households", new { name, timeZone = "Europe/Madrid", templates }, TestContext.Current.CancellationToken);
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>(TestContext.Current.CancellationToken);
        return body.GetProperty("id").GetGuid();
    }

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

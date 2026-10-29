using LimpiApp.Api.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;

namespace LimpiApp.IntegrationTests.Infrastructure;

/// <summary>The API on the shared test Postgres, with the prototype's fixed clock (Wed 14 Oct 2026 09:00 Europe/Madrid).</summary>
public class ApiFactory(PostgresFixture db) : WebApplicationFactory<Program>
{
    public static readonly DateTimeOffset PrototypeNow = new(2026, 10, 14, 7, 0, 0, TimeSpan.Zero);

    public FakeTimeProvider Time { get; } = new(PrototypeNow);

    public PostgresFixture Db => db;

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
        });
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
    }

    public ValueTask DisposeAsync()
    {
        GC.SuppressFinalize(this);
        return ValueTask.CompletedTask;
    }
}

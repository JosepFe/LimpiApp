using LimpiApp.Api.Common;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;

namespace LimpiApp.IntegrationTests.Infrastructure;

/// <summary>The API with the prototype's fixed clock (Wed 14 Oct 2026 09:00 Europe/Madrid).</summary>
public class ApiFactory : WebApplicationFactory<Program>
{
    public static readonly DateTimeOffset PrototypeNow = new(2026, 10, 14, 7, 0, 0, TimeSpan.Zero);

    public FakeTimeProvider Time { get; } = new(PrototypeNow);

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Not "Development": the developer exception page would leak stack traces.
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Time);
            services.AddSingleton<IStartupFilter, ThrowingEndpointFilter>();
        });
    }

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

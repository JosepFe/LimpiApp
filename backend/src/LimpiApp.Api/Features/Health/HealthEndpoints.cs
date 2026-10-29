using System.Reflection;

namespace LimpiApp.Api.Features.Health;

public static class HealthEndpoints
{
    private static readonly string Version =
        typeof(HealthEndpoints).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion.Split('+')[0]
        ?? "0.0.0";

    public sealed record HealthResponse(string Status, string Version);

    public static IEndpointRouteBuilder MapHealth(this IEndpointRouteBuilder app)
    {
        app.MapGet("/health", () => TypedResults.Ok(new HealthResponse("ok", Version))).AllowAnonymous();
        return app;
    }
}

using LimpiApp.Api.Data;
using LimpiApp.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.Api.Features.Auth;

/// <summary>Who is signed in and their households (E02/US-004), and signing out.</summary>
public static class MeEndpoints
{
    public sealed record HouseholdSummary(Guid Id, string Name, MemberRole Role, int MemberCount);

    public sealed record MeResponse(Guid Id, string Email, string Name, string AvatarColor, Theme Theme, IReadOnlyList<HouseholdSummary> Households);

    public static IEndpointRouteBuilder MapMe(this IEndpointRouteBuilder app)
    {
        app.MapGet("/auth/me", MeAsync).RequireAuthorization();
        app.MapPost("/auth/logout", async (HttpContext http, SessionService sessions, CancellationToken ct) =>
        {
            await sessions.SignOutAsync(http, ct);
            return TypedResults.NoContent();
        }).AllowAnonymous();
        return app;
    }

    private static async Task<IResult> MeAsync(HttpContext http, AppDbContext db, CancellationToken ct)
    {
        var userId = http.User.UserId();
        var user = await db.Users.SingleAsync(u => u.Id == userId, ct);
        var households = await db.Memberships
            .Where(m => m.UserId == userId)
            .OrderBy(m => m.JoinedAt)
            .Select(m => new HouseholdSummary(m.HouseholdId, m.Household.Name, m.Role, m.Household.Memberships.Count))
            .ToListAsync(ct);
        return TypedResults.Ok(new MeResponse(user.Id, user.Email, user.Name, user.AvatarColor, user.Theme, households));
    }
}

/// <summary>
/// CSRF for a cookie session with SameSite=Lax: every request that changes something must carry
/// `X-Requested-With: limpiapp`, which a cross-site form cannot send (E02 D4).
/// </summary>
public static class CsrfHeader
{
    public const string Name = "X-Requested-With";
    public const string Value = "limpiapp";

    public static IApplicationBuilder UseCsrfHeader(this IApplicationBuilder app) => app.Use(async (ctx, next) =>
    {
        if (!HttpMethods.IsGet(ctx.Request.Method) && !HttpMethods.IsHead(ctx.Request.Method) && !HttpMethods.IsOptions(ctx.Request.Method)
            && ctx.Request.Headers[Name] != Value)
        {
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            return;
        }

        await next(ctx);
    });
}

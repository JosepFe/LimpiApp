using LimpiApp.Api.Data;
using LimpiApp.Api.Data.Entities;
using LimpiApp.Api.Features.Auth;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.Api.Common;

/// <summary>
/// Every `/households/{hid}/…` route: signed in and member of that household, or 404 (never reveal that it exists).
/// Handlers read the membership with `HouseholdAccess.Current(http)`.
/// </summary>
public static class HouseholdAccess
{
    private const string Key = "household-membership";

    public static RouteGroupBuilder MapHouseholdGroup(this IEndpointRouteBuilder app, string prefix = "")
    {
        var group = app.MapGroup($"/households/{{hid:guid}}{prefix}").RequireAuthorization();
        group.AddEndpointFilter(async (ctx, next) =>
        {
            var http = ctx.HttpContext;
            var hid = Guid.Parse((string)http.Request.RouteValues["hid"]!);
            var userId = http.User.UserId();
            var db = http.RequestServices.GetRequiredService<AppDbContext>();
            var membership = await db.Memberships.Include(m => m.Household)
                .SingleOrDefaultAsync(m => m.HouseholdId == hid && m.UserId == userId, http.RequestAborted);
            if (membership is null)
            {
                return TypedResults.NotFound();
            }

            http.Items[Key] = membership;
            return await next(ctx);
        });
        return group;
    }

    public static Membership Current(HttpContext http) =>
        http.Items[Key] as Membership ?? throw new InvalidOperationException("Not inside a household route.");
}

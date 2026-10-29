using LimpiApp.Api.Common;
using LimpiApp.Api.Data;
using LimpiApp.Api.Data.Entities;
using LimpiApp.Api.Features.Auth;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.Api.Features.Members;

/// <summary>List the members of a household, leave it or remove someone (E06/US-001).</summary>
public static class MembersEndpoints
{
    /// <summary>`JoinedOn` is the calendar day in the household time zone («Desde 2 mar 2026»).</summary>
    public sealed record MemberResponse(Guid Id, string Name, string AvatarColor, MemberRole Role, DateOnly JoinedOn);

    public static IEndpointRouteBuilder MapMembers(this IEndpointRouteBuilder app)
    {
        var group = app.MapHouseholdGroup("/members");
        group.MapGet("/", ListAsync);
        group.MapDelete("/{uid:guid}", RemoveAsync);
        return app;
    }

    private static async Task<IResult> ListAsync(HttpContext http, AppDbContext db, CancellationToken ct)
    {
        var household = HouseholdAccess.Current(http).Household;
        var zone = TimeZoneInfo.FindSystemTimeZoneById(household.TimeZone);
        var members = await db.Memberships.Where(m => m.HouseholdId == household.Id).OrderBy(m => m.JoinedAt).ThenBy(m => m.User.Name)
            .Select(m => new { m.UserId, m.User.Name, m.User.AvatarColor, m.Role, m.JoinedAt }).ToListAsync(ct);
        return TypedResults.Ok(members.Select(m => new MemberResponse(m.UserId, m.Name, m.AvatarColor, m.Role,
            DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(m.JoinedAt, zone).DateTime))).ToList());
    }

    /// <summary>
    /// Anyone can leave; only owners remove others (D1). The last owner cannot leave while others stay (D2).
    /// The tasks of whoever goes become «Sin asignar».
    /// </summary>
    private static async Task<IResult> RemoveAsync(Guid uid, HttpContext http, AppDbContext db, CancellationToken ct)
    {
        var me = HouseholdAccess.Current(http);
        var hid = me.HouseholdId;
        var leaving = uid == http.User.UserId();
        if (!leaving && me.Role != MemberRole.Owner)
        {
            return TypedResults.Problem("Solo los propietarios pueden quitar a alguien del hogar.", statusCode: StatusCodes.Status403Forbidden);
        }

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        // Serialises leaves and removals of one household, so that two owners cannot both leave at once.
        await db.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM households WHERE id = {hid} FOR UPDATE", ct);
        var members = await db.Memberships.Where(m => m.HouseholdId == hid).ToListAsync(ct);
        var target = members.SingleOrDefault(m => m.UserId == uid);
        if (target is null)
        {
            return TypedResults.NotFound();
        }

        if (leaving && target.Role == MemberRole.Owner && members.Count > 1 && members.Count(m => m.Role == MemberRole.Owner) == 1)
        {
            return TypedResults.Problem("Eres el único propietario: no puedes salir mientras haya otros miembros.", statusCode: StatusCodes.Status409Conflict);
        }

        db.Memberships.Remove(target);
        await db.SaveChangesAsync(ct);
        await db.Tasks.Where(t => t.HouseholdId == hid && t.AssigneeId == uid).ExecuteUpdateAsync(s => s.SetProperty(t => t.AssigneeId, (Guid?)null), ct);
        await tx.CommitAsync(ct);
        return TypedResults.NoContent();
    }
}

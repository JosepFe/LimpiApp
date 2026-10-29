using System.Security.Cryptography;
using LimpiApp.Api.Common;
using LimpiApp.Api.Data;
using LimpiApp.Api.Data.Entities;
using LimpiApp.Api.Features.Auth;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.Api.Features.Invites;

/// <summary>
/// Invite links (E06/US-003): owners create, read and revoke the household's link; anyone sees an invite by its code,
/// and a signed-in person accepts it as «Miembro».
/// </summary>
public static class InvitesEndpoints
{
    private const string Base62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    /// <summary>`Expired` covers revoked and used up too: the sheet shows «Caducado».</summary>
    public sealed record InviteResponse(Guid Id, string Code, string Url, DateTimeOffset ExpiresAt, int Uses, int MaxUses, bool Expired);

    public sealed record InviteMember(string Name, string AvatarColor);

    /// <summary>`Status`: valid, invalid, expired or already-member. Only a valid or already-member invite says which household.</summary>
    public sealed record InvitePreview(string Status, Guid? HouseholdId = null, string? HouseholdName = null, string? InviterName = null,
        IReadOnlyList<InviteMember>? Members = null, int MemberCount = 0, int RoomCount = 0);

    public sealed record AcceptResponse(string Status, Guid? HouseholdId = null);

    public static IEndpointRouteBuilder MapInvites(this IEndpointRouteBuilder app)
    {
        var group = app.MapHouseholdGroup("/invites");
        group.MapGet("/current", CurrentAsync);
        group.MapPost("/", CreateAsync);
        group.MapDelete("/{id:guid}", RevokeAsync);
        app.MapGet("/invites/{code}", PreviewAsync).AllowAnonymous();
        app.MapPost("/invites/{code}/accept", AcceptAsync).RequireAuthorization();
        return app;
    }

    public static string NewCode() => RandomNumberGenerator.GetString(Base62, 14);

    private static Microsoft.AspNetCore.Http.HttpResults.ProblemHttpResult? OwnersOnly(Membership me) => me.Role == MemberRole.Owner
        ? null
        : TypedResults.Problem("Solo los propietarios pueden invitar.", statusCode: StatusCodes.Status403Forbidden);

    /// <summary>The household's latest link that was not revoked (it may have expired), or 404.</summary>
    private static async Task<IResult> CurrentAsync(HttpContext http, AppDbContext db, Clock clock, IConfiguration config, CancellationToken ct)
    {
        var me = HouseholdAccess.Current(http);
        if (OwnersOnly(me) is { } forbidden)
        {
            return forbidden;
        }

        var invite = await db.Invites.Where(i => i.HouseholdId == me.HouseholdId && i.RevokedAt == null)
            .OrderByDescending(i => i.CreatedAt).FirstOrDefaultAsync(ct);
        return invite is null ? TypedResults.NotFound() : TypedResults.Ok(ToResponse(invite, clock.Now, config));
    }

    /// <summary>A new link revokes the previous one: at most one active link per household (approved by Josep, 2026-10-29).</summary>
    private static async Task<IResult> CreateAsync(HttpContext http, AppDbContext db, Clock clock, IConfiguration config, CancellationToken ct)
    {
        var me = HouseholdAccess.Current(http);
        if (OwnersOnly(me) is { } forbidden)
        {
            return forbidden;
        }

        var now = clock.Now;
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        // Serialises link creation per household: two owners opening «Invitar» at once must not leave two active links.
        await db.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM households WHERE id = {me.HouseholdId} FOR UPDATE", ct);
        await db.Invites.Where(i => i.HouseholdId == me.HouseholdId && i.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(i => i.RevokedAt, now), ct);
        var invite = new Invite { HouseholdId = me.HouseholdId, Code = NewCode(), CreatedBy = me.UserId, CreatedAt = now, ExpiresAt = now + Invite.Lifetime };
        db.Invites.Add(invite);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return TypedResults.Created($"/households/{me.HouseholdId}/invites/{invite.Id}", ToResponse(invite, now, config));
    }

    private static async Task<IResult> RevokeAsync(Guid id, HttpContext http, AppDbContext db, Clock clock, CancellationToken ct)
    {
        var me = HouseholdAccess.Current(http);
        if (OwnersOnly(me) is { } forbidden)
        {
            return forbidden;
        }

        var now = clock.Now;
        var found = await db.Invites.Where(i => i.Id == id && i.HouseholdId == me.HouseholdId)
            .ExecuteUpdateAsync(s => s.SetProperty(i => i.RevokedAt, i => i.RevokedAt ?? now), ct);
        return found == 0 ? TypedResults.NotFound() : TypedResults.NoContent();
    }

    private static async Task<IResult> PreviewAsync(string code, HttpContext http, AppDbContext db, Clock clock, CancellationToken ct)
    {
        var invite = await db.Invites.Include(i => i.Household).Include(i => i.Creator).SingleOrDefaultAsync(i => i.Code == code, ct);
        if (invite is null)
        {
            return TypedResults.Ok(new InvitePreview("invalid"));
        }

        var hid = invite.HouseholdId;
        var userId = http.User.Identity?.IsAuthenticated == true ? http.User.UserId() : (Guid?)null;
        var isMember = userId is not null && await db.Memberships.AnyAsync(m => m.HouseholdId == hid && m.UserId == userId, ct);
        if (!isMember && !invite.IsUsable(clock.Now))
        {
            return TypedResults.Ok(new InvitePreview("expired"));
        }

        var members = await db.Memberships.Where(m => m.HouseholdId == hid).OrderBy(m => m.JoinedAt).ThenBy(m => m.User.Name)
            .Select(m => new InviteMember(m.User.Name, m.User.AvatarColor)).ToListAsync(ct);
        var rooms = await db.Rooms.CountAsync(r => r.HouseholdId == hid && r.ArchivedAt == null, ct);
        return TypedResults.Ok(new InvitePreview(isMember ? "already-member" : "valid", hid, invite.Household.Name, invite.Creator.Name, members, members.Count, rooms));
    }

    /// <summary>Joins as «Miembro» (A1). The use is counted with a conditional UPDATE so that 5 uses are never exceeded.</summary>
    private static async Task<IResult> AcceptAsync(string code, HttpContext http, AppDbContext db, Clock clock, CancellationToken ct)
    {
        var invite = await db.Invites.AsNoTracking().SingleOrDefaultAsync(i => i.Code == code, ct);
        if (invite is null)
        {
            return TypedResults.Json(new AcceptResponse("invalid"), statusCode: StatusCodes.Status404NotFound);
        }

        var userId = http.User.UserId();
        var hid = invite.HouseholdId;
        if (await db.Memberships.AnyAsync(m => m.HouseholdId == hid && m.UserId == userId, ct))
        {
            return TypedResults.Json(new AcceptResponse("already-member", hid), statusCode: StatusCodes.Status409Conflict);
        }

        var now = clock.Now;
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var counted = await db.Invites
            .Where(i => i.Id == invite.Id && i.RevokedAt == null && i.ExpiresAt > now && i.Uses < i.MaxUses)
            .ExecuteUpdateAsync(s => s.SetProperty(i => i.Uses, i => i.Uses + 1), ct);
        if (counted == 0)
        {
            return TypedResults.Json(new AcceptResponse("expired"), statusCode: StatusCodes.Status410Gone);
        }

        db.Memberships.Add(new Membership { HouseholdId = hid, UserId = userId, Role = MemberRole.Member, JoinedAt = now });
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // The same person accepted twice at once: the other request already joined (and counted the use).
            return TypedResults.Json(new AcceptResponse("already-member", hid), statusCode: StatusCodes.Status409Conflict);
        }

        await tx.CommitAsync(ct);
        return TypedResults.Ok(new AcceptResponse("joined", hid));
    }

    private static InviteResponse ToResponse(Invite invite, DateTimeOffset now, IConfiguration config) =>
        new(invite.Id, invite.Code, $"{MagicLinkEndpoints.PublicUrl(config)}/join/{invite.Code}", invite.ExpiresAt, invite.Uses, invite.MaxUses, !invite.IsUsable(now));
}

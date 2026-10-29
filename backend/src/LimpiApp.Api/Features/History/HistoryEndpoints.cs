using System.Globalization;
using LimpiApp.Api.Common;
using LimpiApp.Api.Data;
using LimpiApp.Api.Features.Auth;
using LimpiApp.Api.Features.Photos;
using LimpiApp.Api.Features.Tasks;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.Api.Features.History;

/// <summary>What was done in the household (E05/US-001): the last 30 days, newest first, 20 at a time (E05 D1).</summary>
public static class HistoryEndpoints
{
    public const int Days = 30;
    public const int PageSize = 20;

    public sealed record HistoryItem(
        Guid Id, DateTimeOffset At, DateOnly On, TasksEndpoints.PersonDto By, Guid TaskId, string TaskTitle, string RoomName, string RoomEmoji,
        int Minutes, int Points, string? Note, int PhotoCount, bool Undone);

    public sealed record RoomOption(Guid Id, string Name, string Emoji);

    public sealed record HistoryPage(DateOnly Today, IReadOnlyList<HistoryItem> Items, string? NextCursor, IReadOnlyList<RoomOption> Rooms);

    public sealed record HistoryEntry(
        Guid Id, DateTimeOffset At, TasksEndpoints.PersonDto By, Guid TaskId, string TaskTitle, string RoomName, string RoomEmoji,
        int SubtasksDone, int SubtasksTotal, int Minutes, int Points, string? Note, IReadOnlyList<PhotosEndpoints.PhotoDto> Photos,
        bool Undone, bool Mine);

    public static IEndpointRouteBuilder MapHistory(this IEndpointRouteBuilder app)
    {
        var history = app.MapHouseholdGroup("/history");
        history.MapGet("/", ListAsync);
        history.MapGet("/{id:guid}", GetAsync);
        return app;
    }

    /// <summary>`mine=true` (done by me), `room=<id>`; `cursor` is the `nextCursor` of the previous page.</summary>
    private static async Task<IResult> ListAsync(bool? mine, Guid? room, string? cursor, HttpContext http, AppDbContext db, Clock clock, CancellationToken ct)
    {
        var household = HouseholdAccess.Current(http).Household;
        var userId = http.User.UserId();
        var today = clock.Today(household.TimeZone);
        var since = today.AddDays(-(Days - 1));

        var query = db.Completions.AsNoTracking()
            .Where(c => c.HouseholdId == household.Id && c.CompletedOn >= since)
            .Where(c => mine != true || c.UserId == userId)
            .Where(c => room == null || c.Task.RoomId == room);
        if (Cursor.TryParse(cursor, out var at, out var afterId))
        {
            query = query.Where(c => c.CompletedAt < at || (c.CompletedAt == at && c.Id.CompareTo(afterId) < 0));
        }

        var rows = await query.OrderByDescending(c => c.CompletedAt).ThenByDescending(c => c.Id).Take(PageSize + 1)
            .Select(c => new
            {
                c.Id,
                c.CompletedAt,
                c.CompletedOn,
                c.UserId,
                c.User.Name,
                c.User.AvatarColor,
                c.TaskId,
                Title = c.Task.Title,
                RoomName = c.Task.Room.Name,
                RoomEmoji = c.Task.Room.Emoji,
                c.Minutes,
                c.Points,
                c.Note,
                Photos = c.Photos.Count,
                c.UndoneAt,
            })
            .ToListAsync(ct);
        var items = rows.Take(PageSize).Select(c => new HistoryItem(
            c.Id, c.CompletedAt, c.CompletedOn, new TasksEndpoints.PersonDto(c.UserId, c.Name, c.AvatarColor), c.TaskId, c.Title, c.RoomName, c.RoomEmoji,
            c.Minutes, c.UndoneAt is null ? c.Points : 0, c.Note, c.Photos, c.UndoneAt is not null)).ToList();
        var next = rows.Count > PageSize ? Cursor.Format(items[^1].At, items[^1].Id) : null;

        var rooms = await db.Rooms.AsNoTracking().Where(r => r.HouseholdId == household.Id && r.ArchivedAt == null).OrderBy(r => r.Position)
            .Select(r => new RoomOption(r.Id, r.Name, r.Emoji)).ToListAsync(ct);
        return TypedResults.Ok(new HistoryPage(today, items, next, rooms));
    }

    private static async Task<IResult> GetAsync(Guid id, HttpContext http, AppDbContext db, CancellationToken ct)
    {
        var householdId = HouseholdAccess.Current(http).HouseholdId;
        var c = await db.Completions.AsNoTracking().Include(x => x.User).Include(x => x.Task).ThenInclude(t => t.Room).Include(x => x.Photos)
            .SingleOrDefaultAsync(x => x.Id == id && x.HouseholdId == householdId, ct);
        if (c is null)
        {
            return TypedResults.NotFound();
        }

        return TypedResults.Ok(new HistoryEntry(
            c.Id, c.CompletedAt, new TasksEndpoints.PersonDto(c.UserId, c.User.Name, c.User.AvatarColor), c.TaskId, c.Task.Title, c.Task.Room.Name, c.Task.Room.Emoji,
            c.SubtasksDone, c.SubtasksTotal, c.Minutes, c.UndoneAt is null ? c.Points : 0, c.Note,
            [.. c.Photos.OrderBy(p => p.Position).Select(p => new PhotosEndpoints.PhotoDto(p.Id, PhotosEndpoints.Url(householdId, p.Id)))],
            c.UndoneAt is not null, c.UserId == http.User.UserId()));
    }

    /// <summary>Keyset cursor «ticks.guid» of the last item returned (stable under new completions).</summary>
    public static class Cursor
    {
        public static string Format(DateTimeOffset at, Guid id) => $"{at.UtcTicks.ToString(CultureInfo.InvariantCulture)}.{id:N}";

        public static bool TryParse(string? value, out DateTimeOffset at, out Guid id)
        {
            at = default;
            id = default;
            var parts = value?.Split('.');
            if (parts is not { Length: 2 } || !long.TryParse(parts[0], NumberStyles.None, CultureInfo.InvariantCulture, out var ticks)
                || ticks < DateTimeOffset.MinValue.UtcTicks || ticks > DateTimeOffset.MaxValue.UtcTicks || !Guid.TryParseExact(parts[1], "N", out id))
            {
                return false;
            }

            at = new DateTimeOffset(ticks, TimeSpan.Zero);
            return true;
        }
    }
}

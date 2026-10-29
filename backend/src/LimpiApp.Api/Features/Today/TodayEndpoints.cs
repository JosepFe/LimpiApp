using LimpiApp.Api.Common;
using LimpiApp.Api.Data;
using LimpiApp.Api.Features.Auth;
using LimpiApp.Api.Features.Completions;
using LimpiApp.Api.Features.Rooms;
using LimpiApp.Api.Features.Tasks;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.Api.Features.Today;

/// <summary>Hoy (E04/US-001): household health, what is pending today, my streak, and the groups of the day.</summary>
public static class TodayEndpoints
{
    public const int UpcomingDays = 7;

    public sealed record TodaySummary(RoomsEndpoints.HealthDto? Health, int PendingToday, int Streak);

    public sealed record TodayGroups(
        IReadOnlyList<TasksEndpoints.TaskSummary> Overdue,
        IReadOnlyList<TasksEndpoints.TaskSummary> Today,
        IReadOnlyList<TasksEndpoints.TaskSummary> Upcoming);

    /// <summary>A room to filter by («Habitación»).</summary>
    public sealed record RoomOption(Guid Id, string Name, string Emoji);

    public sealed record TodayResponse(DateOnly Date, TodaySummary Summary, TodayGroups Groups, IReadOnlyList<RoomOption> Rooms);

    public static IEndpointRouteBuilder MapToday(this IEndpointRouteBuilder app)
    {
        app.MapHouseholdGroup("/today").MapGet("/", GetAsync);
        return app;
    }

    /// <summary>`filter=mine` (assigned to me), `room=<id>`, `max=15` (estimated ≤ 15 min, E04 D4). The summary ignores them.</summary>
    private static async Task<IResult> GetAsync(string? filter, Guid? room, int? max, HttpContext http, AppDbContext db, Clock clock, CancellationToken ct)
    {
        var household = HouseholdAccess.Current(http).Household;
        var userId = http.User.UserId();
        var today = clock.Today(household.TimeZone);

        var tasks = await TasksEndpoints.Summaries(db, household, today, null, ct);
        var rooms = await RoomsEndpoints.Summaries(db, household, today, null, ct);
        var health = HealthRules.Average(rooms.Where(r => r.Health is not null).Select(r => r.Health!.Value));
        var since = today.AddDays(-400);
        var myDays = await db.Completions
            .Where(c => c.HouseholdId == household.Id && c.UserId == userId && c.UndoneAt == null && c.CompletedOn >= since)
            .Select(c => c.CompletedOn).Distinct().ToListAsync(ct);
        var summary = new TodaySummary(RoomsEndpoints.ToDto(health), tasks.Count(t => t.NextDue <= today), StreakRules.Count(myDays, today));

        var shown = tasks
            .Where(t => filter != "mine" || t.Assignee?.Id == userId)
            .Where(t => room is null || t.RoomId == room)
            .Where(t => max is null || t.EstimatedMinutes <= max)
            .ToList();
        var groups = new TodayGroups(
            shown.Where(t => t.NextDue < today).ToList(),
            shown.Where(t => t.NextDue == today).ToList(),
            shown.Where(t => t.NextDue > today && t.NextDue <= today.AddDays(UpcomingDays)).ToList());
        return TypedResults.Ok(new TodayResponse(today, summary, groups, [.. rooms.Select(r => new RoomOption(r.Id, r.Name, r.Emoji))]));
    }
}

using System.Globalization;
using LimpiApp.Api.Common;
using LimpiApp.Api.Data;
using LimpiApp.Api.Features.Rooms;
using LimpiApp.Api.Features.Tasks;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.Api.Features.Stats;

/// <summary>How the household is doing (E05/US-004, D2): last 30 days, health by room, 12 ISO weeks and this week's share.</summary>
public static class StatsEndpoints
{
    public const int Days = 30;
    public const int Weeks = 12;

    public sealed record RoomHealth(string Name, string Emoji, RoomsEndpoints.HealthDto? Health);

    public sealed record WeekCount(int Week, int Count);

    public sealed record Share(TasksEndpoints.PersonDto Person, int Points, int Percent);

    public sealed record StatsResponse(int Completed, int Minutes, int Overdue, IReadOnlyList<RoomHealth> Rooms, IReadOnlyList<WeekCount> Weeks, IReadOnlyList<Share> Share);

    public static IEndpointRouteBuilder MapStats(this IEndpointRouteBuilder app)
    {
        app.MapHouseholdGroup("/stats").MapGet("/", GetAsync);
        return app;
    }

    private static async Task<IResult> GetAsync(HttpContext http, AppDbContext db, Clock clock, CancellationToken ct)
    {
        var household = HouseholdAccess.Current(http).Household;
        var today = clock.Today(household.TimeZone);
        var weekStart = MondayOf(today);
        var firstWeek = weekStart.AddDays(-7 * (Weeks - 1));
        var since = today.AddDays(-(Days - 1));
        var from = firstWeek < since ? firstWeek : since;

        var done = await db.Completions.AsNoTracking()
            .Where(c => c.HouseholdId == household.Id && c.UndoneAt == null && c.CompletedOn >= from)
            .Select(c => new { c.CompletedOn, c.Minutes, c.Points, c.UserId, c.User.Name, c.User.AvatarColor })
            .ToListAsync(ct);
        var last30 = done.Where(c => c.CompletedOn >= since).ToList();

        var rooms = await RoomsEndpoints.Summaries(db, household, today, null, ct);
        var weeks = WeekMondays(today).Select(w => new WeekCount(w.Week, done.Count(c => MondayOf(c.CompletedOn) == w.Monday))).ToList();
        var thisWeek = done.Where(c => c.CompletedOn >= weekStart)
            .GroupBy(c => new TasksEndpoints.PersonDto(c.UserId, c.Name, c.AvatarColor))
            .Select(g => (Person: g.Key, Points: g.Sum(c => c.Points)))
            .OrderByDescending(p => p.Points).ThenBy(p => p.Person.Name, StringComparer.Ordinal)
            .ToList();
        var percents = Percentages([.. thisWeek.Select(p => p.Points)]);

        return TypedResults.Ok(new StatsResponse(
            last30.Count,
            last30.Sum(c => c.Minutes),
            rooms.Sum(r => r.OverdueCount),
            [.. rooms.Select(r => new RoomHealth(r.Name, r.Emoji, r.Health))],
            weeks,
            [.. thisWeek.Select((p, i) => new Share(p.Person, p.Points, percents[i]))]));
    }

    /// <summary>The Mondays of the last 12 ISO weeks (this one last) with their ISO week number (…52/53, 1 across New Year).</summary>
    public static IReadOnlyList<(DateOnly Monday, int Week)> WeekMondays(DateOnly today)
    {
        var first = MondayOf(today).AddDays(-7 * (Weeks - 1));
        return [.. Enumerable.Range(0, Weeks).Select(i => first.AddDays(7 * i)).Select(m => (m, ISOWeek.GetWeekOfYear(m.ToDateTime(TimeOnly.MinValue))))];
    }

    public static DateOnly MondayOf(DateOnly day) => day.AddDays(-(((int)day.DayOfWeek + 6) % 7));

    /// <summary>Whole percentages that always add up to 100 (largest remainder); all zero when there is nothing.</summary>
    public static int[] Percentages(IReadOnlyList<int> values)
    {
        var total = values.Sum();
        if (total == 0)
        {
            return new int[values.Count];
        }

        var exact = values.Select(v => v * 100.0 / total).ToArray();
        var result = exact.Select(e => (int)Math.Floor(e)).ToArray();
        foreach (var i in Enumerable.Range(0, values.Count).OrderByDescending(i => exact[i] - result[i]).Take(100 - result.Sum()))
        {
            result[i]++;
        }

        return result;
    }
}

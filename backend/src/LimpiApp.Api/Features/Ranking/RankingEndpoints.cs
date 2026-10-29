using LimpiApp.Api.Common;
using LimpiApp.Api.Data;
using LimpiApp.Api.Features.Completions;
using LimpiApp.Api.Features.Stats;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.Api.Features.Ranking;

/// <summary>Points per member by ISO week, calendar month or all time, with personal and household streaks (E06/US-006).</summary>
public static class RankingEndpoints
{
    public sealed record RankingRow(Guid Id, string Name, string AvatarColor, int Points, int Tasks, int Streak);

    /// <summary>`HasPoints`: someone ever scored in this household (otherwise the screen shows «Aún no hay puntos»).</summary>
    public sealed record RankingResponse(string Period, int HouseholdStreak, bool HasPoints, IReadOnlyList<RankingRow> Rows);

    private const int StreakLookbackDays = 400;

    public static IEndpointRouteBuilder MapRanking(this IEndpointRouteBuilder app)
    {
        app.MapHouseholdGroup("/ranking").MapGet("/", GetAsync);
        return app;
    }

    /// <summary>First day counted: Monday of this week, the 1st of this month, or none (D3).</summary>
    public static DateOnly? PeriodStart(string period, DateOnly today) => period switch
    {
        "week" => StatsEndpoints.MondayOf(today),
        "month" => new DateOnly(today.Year, today.Month, 1),
        _ => null,
    };

    /// <summary>
    /// Every current member, with 0 when they did nothing; by points, then by name (D3). Undone completions do not count.
    /// </summary>
    private static async Task<IResult> GetAsync(string? period, HttpContext http, AppDbContext db, Clock clock, CancellationToken ct)
    {
        period ??= "week";
        if (period is not ("week" or "month" or "all"))
        {
            return TypedResults.ValidationProblem(new Dictionary<string, string[]> { ["period"] = ["Periodo desconocido."] });
        }

        var household = HouseholdAccess.Current(http).Household;
        var today = clock.Today(household.TimeZone);
        var start = PeriodStart(period, today);
        var members = await db.Memberships.AsNoTracking().Where(m => m.HouseholdId == household.Id)
            .Select(m => new { m.UserId, m.User.Name, m.User.AvatarColor }).ToListAsync(ct);
        var done = db.Completions.AsNoTracking().Where(c => c.HouseholdId == household.Id && c.UndoneAt == null);
        var totals = await (start is { } from ? done.Where(c => c.CompletedOn >= from) : done)
            .GroupBy(c => c.UserId)
            .Select(g => new { UserId = g.Key, Points = g.Sum(c => c.Points), Tasks = g.Count() })
            .ToDictionaryAsync(t => t.UserId, ct);
        var since = today.AddDays(-StreakLookbackDays);
        var days = await done.Where(c => c.CompletedOn >= since).Select(c => new { c.UserId, c.CompletedOn }).Distinct().ToListAsync(ct);

        var rows = members
            .Select(m =>
            {
                var total = totals.GetValueOrDefault(m.UserId);
                var streak = StreakRules.Count(days.Where(d => d.UserId == m.UserId).Select(d => d.CompletedOn), today);
                return new RankingRow(m.UserId, m.Name, m.AvatarColor, total?.Points ?? 0, total?.Tasks ?? 0, streak);
            })
            .OrderByDescending(r => r.Points).ThenBy(r => r.Name, StringComparer.Ordinal)
            .ToList();
        var hasPoints = start is null ? totals.Values.Any(t => t.Points > 0) : await done.AnyAsync(c => c.Points > 0, ct);
        return TypedResults.Ok(new RankingResponse(period, StreakRules.Count(days.Select(d => d.CompletedOn), today), hasPoints, rows));
    }
}

namespace LimpiApp.Api.Features.Completions;

/// <summary>Days in a row with at least one task done (not undone), in the household's time zone (E04 D2).</summary>
public static class StreakRules
{
    /// <summary>Counts back from today; if nothing is done yet today, from yesterday (the day is not over).</summary>
    public static int Count(IEnumerable<DateOnly> daysWithSomethingDone, DateOnly today)
    {
        var days = daysWithSomethingDone.ToHashSet();
        var day = days.Contains(today) ? today : today.AddDays(-1);
        var streak = 0;
        while (days.Contains(day))
        {
            streak++;
            day = day.AddDays(-1);
        }

        return streak;
    }
}

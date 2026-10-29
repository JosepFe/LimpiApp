using LimpiApp.Api.Data.Entities;

namespace LimpiApp.Api.Features.Tasks;

/// <summary>When a task is due and how it is shown (E03 D1-D2; texts of the prototype).</summary>
public static class DueRules
{
    public enum DueKind
    {
        Overdue,
        Today,
        Soon,
        Ok,
    }

    public sealed record Due(DueKind Kind, string Label, int Days);

    /// <summary>«Atrasada 6 d», «Hoy», «Mañana», «En 2 d», «En 2 sem»; the kind is the badge class (soon up to 3 days).</summary>
    public static Due Of(DateOnly nextDue, DateOnly today)
    {
        var days = nextDue.DayNumber - today.DayNumber;
        return days switch
        {
            < 0 => new Due(DueKind.Overdue, $"Atrasada {-days} d", days),
            0 => new Due(DueKind.Today, "Hoy", days),
            1 => new Due(DueKind.Soon, "Mañana", days),
            <= 3 => new Due(DueKind.Soon, $"En {days} d", days),
            < 14 => new Due(DueKind.Ok, $"En {days} d", days),
            _ => new Due(DueKind.Ok, $"En {days / 7} sem", days),
        };
    }

    /// <summary>Next time after doing it on `doneOn`: counted from the day it is done (A2 of E04).</summary>
    public static DateOnly Next(DateOnly doneOn, int every, FrequencyUnit unit) => unit switch
    {
        FrequencyUnit.Day => doneOn.AddDays(every),
        FrequencyUnit.Week => doneOn.AddDays(7 * every),
        _ => doneOn.AddMonths(every), // 31 Jan + 1 month = 28 Feb
    };

    /// <summary>Approximate length of a frequency in days (a month counts as 30).</summary>
    public static int PeriodDays(int every, FrequencyUnit unit) => every * unit switch
    {
        FrequencyUnit.Day => 1,
        FrequencyUnit.Week => 7,
        _ => 30,
    };
}

/// <summary>How clean something is, 0-100, and its label (E03 D2; thresholds of the UI kit).</summary>
public static class HealthRules
{
    public sealed record Health(int Value, string Label, string Level);

    /// <summary>100 while not overdue; then falls linearly to 0 after one whole period overdue.</summary>
    public static int OfTask(DateOnly nextDue, DateOnly today, int periodDays)
    {
        var overdue = today.DayNumber - nextDue.DayNumber;
        return overdue <= 0 ? 100 : (int)Math.Max(0, Math.Round(100 - (100.0 * overdue / Math.Max(1, periodDays)), MidpointRounding.AwayFromZero));
    }

    /// <summary>Average of the values (a room's tasks, or a household's rooms); null when there is nothing to measure.</summary>
    public static int? Average(IEnumerable<int> values)
    {
        var list = values.ToList();
        return list.Count == 0 ? null : (int)Math.Round(list.Average(), MidpointRounding.AwayFromZero);
    }

    /// <summary>Impecable ≥ 90 · Bien 70-89 · Atención 40-69 · Urgente &lt; 40, with the CSS level of the ring (h-ok…).</summary>
    public static Health Describe(int value) => value switch
    {
        >= 90 => new Health(value, "Impecable", "ok"),
        >= 70 => new Health(value, "Bien", "good"),
        >= 40 => new Health(value, "Atención", "warn"),
        _ => new Health(value, "Urgente", "bad"),
    };
}

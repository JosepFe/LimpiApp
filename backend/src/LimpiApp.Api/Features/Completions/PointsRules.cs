namespace LimpiApp.Api.Features.Completions;

/// <summary>Points of a task (E04 D1): proportional to its estimated time; partial when subtasks are left.</summary>
public static class PointsRules
{
    public static int Base(int estimatedMinutes) => Math.Max(1, (int)Math.Round(estimatedMinutes * 0.3, MidpointRounding.AwayFromZero));

    /// <summary>`max(1, round(base × done / total))`, as the prototype computes «+5 pts» for 3 of 5.</summary>
    public static int Earned(int estimatedMinutes, int subtasksDone, int subtasksTotal)
    {
        var points = Base(estimatedMinutes);
        return subtasksTotal == 0 ? points : Math.Max(1, (int)Math.Round(points * (double)subtasksDone / subtasksTotal, MidpointRounding.AwayFromZero));
    }
}

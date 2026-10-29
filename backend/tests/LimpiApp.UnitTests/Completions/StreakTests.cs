using LimpiApp.Api.Features.Completions;

namespace LimpiApp.UnitTests.Completions;

public class StreakTests
{
    private static readonly DateOnly Today = new(2026, 10, 14);

    private static DateOnly[] Days(params int[] daysAgo) => [.. daysAgo.Select(d => Today.AddDays(-d))];

    [Fact]
    public void DaysInARowEndingToday_Count() => Assert.Equal(5, StreakRules.Count(Days(0, 1, 2, 3, 4, 6), Today));

    [Fact]
    public void NothingYetToday_CountsUntilYesterday() => Assert.Equal(4, StreakRules.Count(Days(1, 2, 3, 4), Today));

    [Fact]
    public void AGapBeforeYesterday_BreaksIt()
    {
        Assert.Equal(0, StreakRules.Count(Days(2, 3), Today));
        Assert.Equal(0, StreakRules.Count([], Today));
        Assert.Equal(1, StreakRules.Count(Days(0, 0, 2), Today));
    }
}

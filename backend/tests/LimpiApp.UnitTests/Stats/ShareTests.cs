using LimpiApp.Api.Features.Stats;

namespace LimpiApp.UnitTests.Stats;

public class ShareTests
{
    [Fact]
    public void Percentages_AreWholeAndAddUpTo100()
    {
        Assert.Equal([46, 38, 16], StatsEndpoints.Percentages([46, 38, 16]));
        Assert.Equal([34, 33, 33], StatsEndpoints.Percentages([1, 1, 1]));
        Assert.Equal([67, 33], StatsEndpoints.Percentages([2, 1]));
        Assert.Equal(100, StatsEndpoints.Percentages([46, 38, 17]).Sum());
        Assert.Equal([0, 0], StatsEndpoints.Percentages([0, 0]));
    }

    [Fact]
    public void MondayOf_IsTheStartOfTheIsoWeek()
    {
        Assert.Equal(new DateOnly(2026, 10, 12), StatsEndpoints.MondayOf(new DateOnly(2026, 10, 14)));
        Assert.Equal(new DateOnly(2026, 10, 12), StatsEndpoints.MondayOf(new DateOnly(2026, 10, 18)));
        Assert.Equal(new DateOnly(2026, 10, 12), StatsEndpoints.MondayOf(new DateOnly(2026, 10, 12)));
    }
}

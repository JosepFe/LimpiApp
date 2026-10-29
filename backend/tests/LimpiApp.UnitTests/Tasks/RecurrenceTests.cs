using LimpiApp.Api.Data.Entities;
using LimpiApp.Api.Features.Tasks;

namespace LimpiApp.UnitTests.Tasks;

public class RecurrenceTests
{
    [Fact]
    public void Next_CountsFromTheDayItIsDone()
    {
        Assert.Equal(new DateOnly(2026, 10, 21), DueRules.Next(new DateOnly(2026, 10, 14), 1, FrequencyUnit.Week));
        Assert.Equal(new DateOnly(2026, 10, 17), DueRules.Next(new DateOnly(2026, 10, 14), 3, FrequencyUnit.Day));
        Assert.Equal(new DateOnly(2026, 12, 14), DueRules.Next(new DateOnly(2026, 10, 14), 2, FrequencyUnit.Month));
    }

    [Fact]
    public void Next_ForMonths_KeepsToTheLastDayOfShortMonths()
    {
        Assert.Equal(new DateOnly(2027, 2, 28), DueRules.Next(new DateOnly(2027, 1, 31), 1, FrequencyUnit.Month));
        Assert.Equal(new DateOnly(2028, 2, 29), DueRules.Next(new DateOnly(2028, 1, 31), 1, FrequencyUnit.Month));
    }

    [Fact]
    public void PeriodDays_CountsAMonthAs30()
    {
        Assert.Equal((3, 14, 30), (DueRules.PeriodDays(3, FrequencyUnit.Day), DueRules.PeriodDays(2, FrequencyUnit.Week), DueRules.PeriodDays(1, FrequencyUnit.Month)));
    }
}

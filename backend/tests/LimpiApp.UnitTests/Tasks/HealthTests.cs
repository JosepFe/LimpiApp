using LimpiApp.Api.Features.Tasks;

namespace LimpiApp.UnitTests.Tasks;

public class HealthTests
{
    private static readonly DateOnly Today = new(2026, 10, 14);

    [Theory]
    [InlineData(14, 100)] // due today: not overdue
    [InlineData(20, 100)] // future
    [InlineData(11, 57)] // weekly, 3 days overdue
    [InlineData(7, 0)] // weekly, a whole week overdue
    [InlineData(1, 0)] // more than a period: never below 0
    public void TaskHealth_FallsLinearlyWithTheDaysOverdue(int nextDueDay, int health)
    {
        Assert.Equal(health, HealthRules.OfTask(new DateOnly(2026, 10, nextDueDay), Today, 7));
    }

    [Theory]
    [InlineData(95, "Impecable", "ok")]
    [InlineData(90, "Impecable", "ok")]
    [InlineData(78, "Bien", "good")]
    [InlineData(70, "Bien", "good")]
    [InlineData(55, "Atención", "warn")]
    [InlineData(40, "Atención", "warn")]
    [InlineData(34, "Urgente", "bad")]
    public void Describe_UsesTheUiKitThresholds(int value, string label, string level)
    {
        Assert.Equal((label, level), (HealthRules.Describe(value).Label, HealthRules.Describe(value).Level));
    }

    [Fact]
    public void Average_RoundsAndIsNullWithoutTasks()
    {
        Assert.Equal(62, HealthRules.Average([100, 0, 57, 91]));
        Assert.Null(HealthRules.Average([]));
    }
}

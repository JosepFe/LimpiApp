using LimpiApp.Api.Features.Completions;

namespace LimpiApp.UnitTests.Completions;

public class PointsTests
{
    [Theory]
    [InlineData(30, 5, 5, 9)] // «Limpiar nevera por dentro»: +9 pts
    [InlineData(30, 3, 5, 5)] // 3 of 5 subtasks: +5 pts (the prototype's partial state)
    [InlineData(30, 0, 5, 1)] // never below 1
    [InlineData(20, 0, 0, 6)] // no subtasks: the whole base
    [InlineData(1, 0, 0, 1)]
    [InlineData(45, 4, 4, 14)]
    public void Earned_IsProportionalToTimeAndToTheSubtasksDone(int minutes, int done, int total, int points) =>
        Assert.Equal(points, PointsRules.Earned(minutes, done, total));
}

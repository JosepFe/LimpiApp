using LimpiApp.Api.Features.Tasks;
using static LimpiApp.Api.Features.Tasks.DueRules;

namespace LimpiApp.UnitTests.Tasks;

public class DueLabelTests
{
    private static readonly DateOnly Today = new(2026, 10, 14);

    [Theory]
    [InlineData(8, DueKind.Overdue, "Atrasada 6 d")]
    [InlineData(13, DueKind.Overdue, "Atrasada 1 d")]
    [InlineData(14, DueKind.Today, "Hoy")]
    [InlineData(15, DueKind.Soon, "Mañana")]
    [InlineData(16, DueKind.Later, "En 2 d")]
    [InlineData(27, DueKind.Later, "En 13 d")]
    [InlineData(28, DueKind.Later, "En 2 sem")]
    [InlineData(31, DueKind.Later, "En 2 sem")]
    public void Label_UsesThePrototypeTexts(int day, DueKind kind, string label)
    {
        var due = DueRules.Of(new DateOnly(2026, 10, day), Today);

        Assert.Equal((kind, label), (due.Kind, due.Label));
    }
}

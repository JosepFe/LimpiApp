using LimpiApp.Api.Common;
using Microsoft.Extensions.Time.Testing;

namespace LimpiApp.UnitTests;

public class ClockTests
{
    [Fact]
    public void Today_UsesTheHouseholdTimeZone()
    {
        // 14 Oct 2026 09:00 in Madrid (UTC+2 in summer time).
        var time = new FakeTimeProvider(new DateTimeOffset(2026, 10, 14, 7, 0, 0, TimeSpan.Zero));

        Assert.Equal(new DateOnly(2026, 10, 14), new Clock(time).Today("Europe/Madrid"));
    }

    [Fact]
    public void Today_ChangesDayAtLocalMidnight()
    {
        // 23:30 UTC on the 13th is already 01:30 on the 14th in Madrid.
        var time = new FakeTimeProvider(new DateTimeOffset(2026, 10, 13, 23, 30, 0, TimeSpan.Zero));
        var clock = new Clock(time);

        Assert.Equal(new DateOnly(2026, 10, 14), clock.Today("Europe/Madrid"));
        Assert.Equal(new DateOnly(2026, 10, 14), clock.Today("Atlantic/Canary"));
        Assert.Equal(new DateOnly(2026, 10, 13), clock.Today("UTC"));
    }
}

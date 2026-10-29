namespace LimpiApp.Api.Common;

/// <summary>Current instant and calendar day in a household's time zone. Never use DateTime.Now.</summary>
public sealed class Clock(TimeProvider time)
{
    public DateTimeOffset Now => time.GetUtcNow();

    public DateOnly Today(string timeZoneId)
    {
        var zone = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        return DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(Now, zone).DateTime);
    }
}

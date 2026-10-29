namespace LimpiApp.Api.Data.Entities;

public sealed class Household
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public required string Name { get; set; }

    /// <summary>IANA id; defines when the day changes for recurrences and streaks.</summary>
    public string TimeZone { get; set; } = "Europe/Madrid";

    public DateTimeOffset CreatedAt { get; set; }

    public List<Membership> Memberships { get; } = [];
}

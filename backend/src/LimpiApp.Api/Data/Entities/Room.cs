namespace LimpiApp.Api.Data.Entities;

public sealed class Room
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public Guid HouseholdId { get; set; }

    public Household Household { get; set; } = null!;

    public required string Name { get; set; }

    public required string Emoji { get; set; }

    /// <summary>Token key of the prototype room colours (`--rc-*`): green, orange, blue…</summary>
    public required string Color { get; set; }

    public int Position { get; set; }

    public DateTimeOffset? ArchivedAt { get; set; }

    public List<Zone> Zones { get; } = [];
}

public sealed class Zone
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public Guid RoomId { get; set; }

    public required string Name { get; set; }

    public int Position { get; set; }
}

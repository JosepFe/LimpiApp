namespace LimpiApp.Api.Data.Entities;

/// <summary>A cleaning product of the household («🧴 Desincrustante»), linked to the tasks that use it.</summary>
public sealed class Product
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public Guid HouseholdId { get; set; }

    public required string Name { get; set; }

    public required string Emoji { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? ArchivedAt { get; set; }

    public List<CleaningTask> Tasks { get; } = [];
}

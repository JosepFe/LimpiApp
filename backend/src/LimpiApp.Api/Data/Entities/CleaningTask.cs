namespace LimpiApp.Api.Data.Entities;

/// <summary>A recurring cleaning task (table `tasks`; named so it does not clash with System.Threading.Tasks.Task).</summary>
public sealed class CleaningTask
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public Guid HouseholdId { get; set; }

    public Guid RoomId { get; set; }

    public Room Room { get; set; } = null!;

    public Guid? ZoneId { get; set; }

    public required string Title { get; set; }

    public int FreqValue { get; set; } = 1;

    public FrequencyUnit FreqUnit { get; set; } = FrequencyUnit.Week;

    /// <summary>Calendar day (household time zone) when it is due next.</summary>
    public DateOnly NextDue { get; set; }

    public int EstimatedMinutes { get; set; } = 15;

    public Priority Priority { get; set; } = Priority.Medium;

    public Guid? AssigneeId { get; set; }

    public string? Notes { get; set; }

    public DateTimeOffset? ArchivedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public List<Subtask> Subtasks { get; } = [];
}

public sealed class Subtask
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public Guid TaskId { get; set; }

    public required string Title { get; set; }

    public int Position { get; set; }
}

public enum FrequencyUnit
{
    Day,
    Week,
    Month,
}

public enum Priority
{
    Low,
    Medium,
    High,
}

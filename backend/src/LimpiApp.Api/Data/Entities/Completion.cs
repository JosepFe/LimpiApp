namespace LimpiApp.Api.Data.Entities;

/// <summary>A task marked as done: history, points and streaks. Undone ones stay, with <see cref="UndoneAt"/>.</summary>
public sealed class Completion
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public Guid HouseholdId { get; set; }

    public Guid TaskId { get; set; }

    public CleaningTask Task { get; set; } = null!;

    public Guid UserId { get; set; }

    public User User { get; set; } = null!;

    /// <summary>Calendar day in the household's time zone (streaks, next time).</summary>
    public DateOnly CompletedOn { get; set; }

    public DateTimeOffset CompletedAt { get; set; }

    public int Minutes { get; set; }

    public string? Note { get; set; }

    public int SubtasksDone { get; set; }

    public int SubtasksTotal { get; set; }

    public int Points { get; set; }

    /// <summary>The task's next due before this completion, restored by undo.</summary>
    public DateOnly PrevNextDue { get; set; }

    public DateTimeOffset? UndoneAt { get; set; }
}

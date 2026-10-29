namespace LimpiApp.Api.Data.Entities;

/// <summary>A photo of a completion (max 3), stored in PHOTOS_DIR; only its relative path is kept.</summary>
public sealed class CompletionPhoto
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public Guid CompletionId { get; set; }

    public Completion Completion { get; set; } = null!;

    public required string Path { get; set; }

    public required string ContentType { get; set; }

    public long SizeBytes { get; set; }

    public int Position { get; set; }
}

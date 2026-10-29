namespace LimpiApp.Api.Data.Entities;

public sealed class Session
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    /// <summary>SHA-256 of the cookie token; the token itself is never stored.</summary>
    public required byte[] TokenHash { get; set; }

    public Guid UserId { get; set; }

    public User User { get; set; } = null!;

    public DateTimeOffset ExpiresAt { get; set; }

    public string? UserAgent { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}

namespace LimpiApp.Api.Data.Entities;

public sealed class MagicLink
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public required string Email { get; set; }

    public required byte[] TokenHash { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }

    public DateTimeOffset? UsedAt { get; set; }

    public string? ReturnUrl { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}

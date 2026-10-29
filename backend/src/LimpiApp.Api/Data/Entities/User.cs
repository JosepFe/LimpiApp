namespace LimpiApp.Api.Data.Entities;

public sealed class User
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    /// <summary>Always stored lower-case.</summary>
    public required string Email { get; set; }

    public required string Name { get; set; }

    public string AvatarColor { get; set; } = "teal";

    public Theme Theme { get; set; } = Theme.System;

    public string? GoogleSub { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public List<Membership> Memberships { get; } = [];
}

public enum Theme
{
    System,
    Light,
    Dark,
}

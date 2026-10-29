namespace LimpiApp.Api.Data.Entities;

/// <summary>A link to join a household: 7 days, 5 uses, revocable. At most one active per household.</summary>
public sealed class Invite
{
    public const int MaxUsesDefault = 5;

    public static readonly TimeSpan Lifetime = TimeSpan.FromDays(7);

    public Guid Id { get; set; } = Guid.CreateVersion7();

    public Guid HouseholdId { get; set; }

    public Household Household { get; set; } = null!;

    /// <summary>14 random base62 characters.</summary>
    public required string Code { get; set; }

    public Guid CreatedBy { get; set; }

    public User Creator { get; set; } = null!;

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }

    public int MaxUses { get; set; } = MaxUsesDefault;

    public int Uses { get; set; }

    public DateTimeOffset? RevokedAt { get; set; }

    public bool IsUsable(DateTimeOffset now) => RevokedAt is null && ExpiresAt > now && Uses < MaxUses;
}

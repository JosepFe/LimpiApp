namespace LimpiApp.Api.Data.Entities;

public sealed class Membership
{
    public Guid HouseholdId { get; set; }

    public Household Household { get; set; } = null!;

    public Guid UserId { get; set; }

    public User User { get; set; } = null!;

    public MemberRole Role { get; set; } = MemberRole.Member;

    public DateTimeOffset JoinedAt { get; set; }
}

public enum MemberRole
{
    Member,
    Owner,
}

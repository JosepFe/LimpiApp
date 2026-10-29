using LimpiApp.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LimpiApp.Api.Data.Configurations;

internal sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> b)
    {
        b.Property(u => u.Email).HasMaxLength(320);
        b.HasIndex(u => u.Email).IsUnique();
        b.Property(u => u.Name).HasMaxLength(80);
        b.Property(u => u.AvatarColor).HasMaxLength(20);
        b.Property(u => u.Theme).HasConversion<string>().HasMaxLength(10);
        b.Property(u => u.GoogleSub).HasMaxLength(255);
        b.HasIndex(u => u.GoogleSub).IsUnique();
    }
}

internal sealed class SessionConfiguration : IEntityTypeConfiguration<Session>
{
    public void Configure(EntityTypeBuilder<Session> b)
    {
        b.HasIndex(s => s.TokenHash).IsUnique();
        b.Property(s => s.UserAgent).HasMaxLength(512);
        b.HasOne(s => s.User).WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class MagicLinkConfiguration : IEntityTypeConfiguration<MagicLink>
{
    public void Configure(EntityTypeBuilder<MagicLink> b)
    {
        b.Property(m => m.Email).HasMaxLength(320);
        b.HasIndex(m => m.TokenHash).IsUnique();
        b.HasIndex(m => new { m.Email, m.CreatedAt });
        b.Property(m => m.ReturnUrl).HasMaxLength(512);
    }
}

internal sealed class HouseholdConfiguration : IEntityTypeConfiguration<Household>
{
    public void Configure(EntityTypeBuilder<Household> b)
    {
        b.Property(h => h.Name).HasMaxLength(80);
        b.Property(h => h.TimeZone).HasMaxLength(64);
    }
}

internal sealed class MembershipConfiguration : IEntityTypeConfiguration<Membership>
{
    public void Configure(EntityTypeBuilder<Membership> b)
    {
        b.HasKey(m => new { m.HouseholdId, m.UserId });
        b.Property(m => m.Role).HasConversion<string>().HasMaxLength(10);
        b.HasOne(m => m.Household).WithMany(h => h.Memberships).HasForeignKey(m => m.HouseholdId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(m => m.User).WithMany(u => u.Memberships).HasForeignKey(m => m.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class InviteConfiguration : IEntityTypeConfiguration<Invite>
{
    public void Configure(EntityTypeBuilder<Invite> b)
    {
        b.Property(i => i.Code).HasMaxLength(14);
        b.HasIndex(i => i.Code).IsUnique();
        b.HasIndex(i => new { i.HouseholdId, i.CreatedAt });
        b.HasOne(i => i.Household).WithMany().HasForeignKey(i => i.HouseholdId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(i => i.Creator).WithMany().HasForeignKey(i => i.CreatedBy).OnDelete(DeleteBehavior.Cascade);
        b.ToTable(t => t.HasCheckConstraint("ck_invites_uses", "uses >= 0 AND uses <= max_uses"));
    }
}

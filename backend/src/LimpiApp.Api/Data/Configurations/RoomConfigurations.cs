using LimpiApp.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LimpiApp.Api.Data.Configurations;

internal sealed class RoomConfiguration : IEntityTypeConfiguration<Room>
{
    public void Configure(EntityTypeBuilder<Room> b)
    {
        b.Property(r => r.Name).HasMaxLength(60);
        b.Property(r => r.Emoji).HasMaxLength(16);
        b.Property(r => r.Color).HasMaxLength(20);
        b.HasIndex(r => new { r.HouseholdId, r.Position });
        b.HasOne(r => r.Household).WithMany().HasForeignKey(r => r.HouseholdId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(r => r.Zones).WithOne().HasForeignKey(z => z.RoomId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class ZoneConfiguration : IEntityTypeConfiguration<Zone>
{
    public void Configure(EntityTypeBuilder<Zone> b) => b.Property(z => z.Name).HasMaxLength(60);
}

internal sealed class CleaningTaskConfiguration : IEntityTypeConfiguration<CleaningTask>
{
    public void Configure(EntityTypeBuilder<CleaningTask> b)
    {
        b.ToTable("tasks");
        b.Property(t => t.Title).HasMaxLength(120);
        b.Property(t => t.FreqUnit).HasConversion<string>().HasMaxLength(10);
        b.Property(t => t.Priority).HasConversion<string>().HasMaxLength(10);
        b.Property(t => t.Notes).HasMaxLength(2000);
        b.HasIndex(t => new { t.HouseholdId, t.NextDue });
        b.HasOne<Household>().WithMany().HasForeignKey(t => t.HouseholdId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(t => t.Room).WithMany().HasForeignKey(t => t.RoomId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(t => t.Zone).WithMany().HasForeignKey(t => t.ZoneId).OnDelete(DeleteBehavior.SetNull);
        b.HasOne<User>().WithMany().HasForeignKey(t => t.AssigneeId).OnDelete(DeleteBehavior.SetNull);
        b.HasMany(t => t.Subtasks).WithOne().HasForeignKey(s => s.TaskId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(t => t.Products).WithMany(p => p.Tasks).UsingEntity("task_products");
    }
}

internal sealed class SubtaskConfiguration : IEntityTypeConfiguration<Subtask>
{
    public void Configure(EntityTypeBuilder<Subtask> b) => b.Property(s => s.Title).HasMaxLength(120);
}

internal sealed class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> b)
    {
        b.Property(p => p.Name).HasMaxLength(60);
        b.Property(p => p.Emoji).HasMaxLength(16);
        b.HasOne<Household>().WithMany().HasForeignKey(p => p.HouseholdId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class CompletionConfiguration : IEntityTypeConfiguration<Completion>
{
    public void Configure(EntityTypeBuilder<Completion> b)
    {
        b.Property(c => c.Note).HasMaxLength(1000);
        b.HasIndex(c => new { c.HouseholdId, c.CompletedOn });
        b.HasIndex(c => new { c.TaskId, c.CompletedAt });
        b.HasOne<Household>().WithMany().HasForeignKey(c => c.HouseholdId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(c => c.Task).WithMany().HasForeignKey(c => c.TaskId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(c => c.User).WithMany().HasForeignKey(c => c.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

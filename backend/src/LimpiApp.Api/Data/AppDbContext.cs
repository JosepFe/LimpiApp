using LimpiApp.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace LimpiApp.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    public DbSet<Session> Sessions => Set<Session>();

    public DbSet<MagicLink> MagicLinks => Set<MagicLink>();

    public DbSet<Household> Households => Set<Household>();

    public DbSet<Membership> Memberships => Set<Membership>();

    public DbSet<Room> Rooms => Set<Room>();

    public DbSet<Zone> Zones => Set<Zone>();

    public DbSet<CleaningTask> Tasks => Set<CleaningTask>();

    public DbSet<Subtask> Subtasks => Set<Subtask>();

    public DbSet<Product> Products => Set<Product>();

    public DbSet<Completion> Completions => Set<Completion>();

    public DbSet<CompletionPhoto> CompletionPhotos => Set<CompletionPhoto>();

    public DbSet<Invite> Invites => Set<Invite>();

    protected override void OnModelCreating(ModelBuilder modelBuilder) =>
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

    public static void Configure(DbContextOptionsBuilder options, string connectionString) =>
        options.UseNpgsql(connectionString).UseSnakeCaseNamingConvention();
}

/// <summary>Lets `dotnet ef` build the model without starting the app or reaching a database.</summary>
internal sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>();
        AppDbContext.Configure(options, "Host=localhost;Database=limpiapp_design");
        return new AppDbContext(options.Options);
    }
}

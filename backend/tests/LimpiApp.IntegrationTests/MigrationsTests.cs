using LimpiApp.IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.IntegrationTests;

public class MigrationsTests(ApiFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Startup_AppliesMigrations_AndCreatesTheAccountTables()
    {
        await using var db = Factory.CreateDbContext();

        Assert.Empty(await db.Database.GetPendingMigrationsAsync(Ct));
        var tables = await db.Database
            .SqlQueryRaw<string>("SELECT table_name AS \"Value\" FROM information_schema.tables WHERE table_schema = 'public'")
            .ToListAsync(Ct);
        Assert.Superset(new HashSet<string> { "users", "sessions", "magic_links", "households", "memberships" }, tables.ToHashSet());
    }
}

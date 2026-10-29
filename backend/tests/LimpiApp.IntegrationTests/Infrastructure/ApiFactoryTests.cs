using LimpiApp.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.IntegrationTests.Infrastructure;

public class ApiFactoryTests(ApiFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Database_IsAnEphemeralPostgres17()
    {
        await using var db = Factory.CreateDbContext();

        var version = await db.Database.SqlQueryRaw<string>("SELECT current_setting('server_version') AS \"Value\"").SingleAsync(Ct);
        Assert.StartsWith("17.", version, StringComparison.Ordinal);
        Assert.Equal(Factory.Db.ConnectionString, db.Database.GetConnectionString());
    }

    [Fact]
    public async Task Reset_EmptiesTheTables_ButKeepsTheMigrationsHistory()
    {
        await using (var db = Factory.CreateDbContext())
        {
            db.Users.Add(new User { Email = "josep@example.com", Name = "Josep", CreatedAt = ApiFactory.PrototypeNow });
            await db.SaveChangesAsync(Ct);
        }

        await Factory.Db.ResetAsync();

        await using var after = Factory.CreateDbContext();
        Assert.Equal(0, await after.Users.CountAsync(Ct));
        Assert.NotEmpty(await after.Database.GetAppliedMigrationsAsync(Ct));
    }
}

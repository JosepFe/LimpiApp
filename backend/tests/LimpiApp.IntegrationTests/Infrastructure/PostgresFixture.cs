using Npgsql;
using Respawn;
using Testcontainers.PostgreSql;

[assembly: AssemblyFixture(typeof(LimpiApp.IntegrationTests.Infrastructure.PostgresFixture))]

namespace LimpiApp.IntegrationTests.Infrastructure;

/// <summary>One ephemeral Postgres 17 for the whole test assembly.</summary>
public sealed class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:17").Build();
    private Respawner? _respawner;

    public string ConnectionString => _container.GetConnectionString();

    public async ValueTask InitializeAsync() => await _container.StartAsync();

    public async ValueTask DisposeAsync() => await _container.DisposeAsync();

    /// <summary>Empties every table except the migrations history. Call after the app has migrated.</summary>
    public async Task ResetAsync()
    {
        await using var conn = new NpgsqlConnection(ConnectionString);
        await conn.OpenAsync();
        _respawner ??= await Respawner.CreateAsync(conn, new RespawnerOptions
        {
            DbAdapter = DbAdapter.Postgres,
            SchemasToInclude = ["public"],
            TablesToIgnore = ["__EFMigrationsHistory"],
        });
        await _respawner.ResetAsync(conn);
    }
}

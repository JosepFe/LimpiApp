using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.Api.Data.Entities;
using LimpiApp.IntegrationTests.Infrastructure;
using LimpiApp.IntegrationTests.Members;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.IntegrationTests.Ranking;

public class RankingTests(ApiFactory factory) : IntegrationTest(factory)
{
    private static readonly DateOnly Today = new(2026, 10, 14); // Wednesday; the ISO week starts on Monday 12

    [Fact]
    public async Task Week_SumsTheIsoWeeksPointsNotUndone_WithTasksAndPersonalStreak_ByPoints()
    {
        var data = await SeedAsync();

        var ranking = await data.Marta.GetFromJsonAsync<JsonElement>(Url(data, "week"), Ct);

        Assert.Equal(("week", 4, true), (ranking.GetProperty("period").GetString(), ranking.GetProperty("householdStreak").GetInt32(), ranking.GetProperty("hasPoints").GetBoolean()));
        Assert.Equal([("Josep", 12, 3, 3), ("Pau", 8, 1, 1), ("Marta", 0, 0, 0)], Rows(ranking));
        Assert.Equal([data.JosepId, data.PauId, data.MartaId], ranking.GetProperty("rows").EnumerateArray().Select(r => r.GetProperty("id").GetGuid()));
    }

    [Fact]
    public async Task Month_AndAll_CountTheCalendarMonthAndEverything()
    {
        var data = await SeedAsync();

        var month = await data.Josep.GetFromJsonAsync<JsonElement>(Url(data, "month"), Ct);
        var all = await data.Josep.GetFromJsonAsync<JsonElement>(Url(data, "all"), Ct);

        Assert.Equal([("Pau", 14, 2, 1), ("Josep", 12, 3, 3), ("Marta", 0, 0, 0)], Rows(month));
        Assert.Equal([("Josep", 22, 4, 3), ("Pau", 14, 2, 1), ("Marta", 0, 0, 0)], Rows(all));
    }

    [Fact]
    public async Task Ties_GoInAlphabeticalOrder_AndPeopleWhoLeftAreNotListed()
    {
        var data = await MembersTestData.CreateAsync(Factory);
        await AddAsync(data, (data.PauId, Today, 5), (data.JosepId, Today, 5), (data.MartaId, Today, 9));
        await data.Marta.DeleteAsync(data.Url(data.MartaId), Ct);

        var ranking = await data.Pau.GetFromJsonAsync<JsonElement>($"/households/{data.HouseholdId}/ranking", Ct);

        Assert.Equal("week", ranking.GetProperty("period").GetString());
        Assert.Equal([("Josep", 5, 1, 1), ("Pau", 5, 1, 1)], Rows(ranking));
    }

    [Fact]
    public async Task WithoutPointsEver_HasPointsIsFalse_ButAQuietWeekAfterPointsIsNot()
    {
        var data = await MembersTestData.CreateAsync(Factory);
        var empty = await data.Josep.GetFromJsonAsync<JsonElement>(Url(data, "week"), Ct);
        await AddAsync(data, (data.PauId, new DateOnly(2026, 9, 1), 4));

        var quietWeek = await data.Josep.GetFromJsonAsync<JsonElement>(Url(data, "week"), Ct);
        var quietAll = await data.Josep.GetFromJsonAsync<JsonElement>(Url(data, "all"), Ct);

        Assert.False(empty.GetProperty("hasPoints").GetBoolean());
        Assert.Equal(0, empty.GetProperty("householdStreak").GetInt32());
        Assert.True(quietWeek.GetProperty("hasPoints").GetBoolean());
        Assert.True(quietAll.GetProperty("hasPoints").GetBoolean());
        Assert.Equal([("Josep", 0, 0, 0), ("Marta", 0, 0, 0), ("Pau", 0, 0, 0)], Rows(quietWeek));
    }

    [Fact]
    public async Task UnknownPeriod_Is400_AndAnotherHousehold_Is404()
    {
        var data = await MembersTestData.CreateAsync(Factory);
        var stranger = await Factory.SignedInAsync("ana@example.com");

        Assert.Equal(HttpStatusCode.BadRequest, (await data.Josep.GetAsync(Url(data, "year"), Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync(Url(data, "week"), Ct)).StatusCode);
    }

    /// <summary>
    /// Josep: Mon 12, Tue 13, Wed 14 (3 + 4 + 5) and Wed 30 Sep (10); an undone 50 today.
    /// Pau: Sun 11 (6, last week) and Tue 13 (8). Marta: nothing.
    /// </summary>
    private async Task<MembersTestData> SeedAsync()
    {
        var data = await MembersTestData.CreateAsync(Factory);
        await AddAsync(data,
            (data.JosepId, Today.AddDays(-2), 3), (data.JosepId, Today.AddDays(-1), 4), (data.JosepId, Today, 5), (data.JosepId, new DateOnly(2026, 9, 30), 10),
            (data.PauId, Today.AddDays(-3), 6), (data.PauId, Today.AddDays(-1), 8));
        await AddAsync(data, undone: true, (data.JosepId, Today, 50));
        return data;
    }

    private Task AddAsync(MembersTestData data, params (Guid User, DateOnly Day, int Points)[] done) => AddAsync(data, false, done);

    private async Task AddAsync(MembersTestData data, bool undone, params (Guid User, DateOnly Day, int Points)[] done)
    {
        await using var db = Factory.CreateDbContext();
        var task = await db.Tasks.FirstAsync(t => t.HouseholdId == data.HouseholdId, Ct);
        db.Completions.AddRange(done.Select(d => new Completion
        {
            HouseholdId = data.HouseholdId,
            TaskId = task.Id,
            UserId = d.User,
            CompletedOn = d.Day,
            CompletedAt = new DateTimeOffset(d.Day.ToDateTime(new TimeOnly(8, 0)), TimeSpan.Zero),
            Minutes = 10,
            Points = d.Points,
            PrevNextDue = Today,
            UndoneAt = undone ? ApiFactory.PrototypeNow : null,
        }));
        await db.SaveChangesAsync(Ct);
    }

    private static string Url(MembersTestData data, string period) => $"/households/{data.HouseholdId}/ranking?period={period}";

    private static IEnumerable<(string?, int, int, int)> Rows(JsonElement ranking) => ranking.GetProperty("rows").EnumerateArray()
        .Select(r => (r.GetProperty("name").GetString(), r.GetProperty("points").GetInt32(), r.GetProperty("tasks").GetInt32(), r.GetProperty("streak").GetInt32()));
}

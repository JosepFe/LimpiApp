using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.Api.Data.Entities;
using LimpiApp.IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.IntegrationTests.Today;

public class TodayTests(ApiFactory factory) : IntegrationTest(factory)
{
    private static string[] Titles(JsonElement group) => [.. group.EnumerateArray().Select(t => t.GetProperty("title").GetString()!)];

    [Fact]
    public async Task Today_GivesHealth_PendingToday_Streak_AndTheThreeGroupsByDate()
    {
        var (josep, hid, _, _) = await TodayTestData.CreateAsync(Factory);

        var body = await josep.GetFromJsonAsync<JsonElement>($"/households/{hid}/today", Ct);

        Assert.Equal("2026-10-14", body.GetProperty("date").GetString());
        var summary = body.GetProperty("summary");
        Assert.Equal((6, 5), (summary.GetProperty("pendingToday").GetInt32(), summary.GetProperty("streak").GetInt32()));
        Assert.True(summary.GetProperty("health").GetProperty("value").GetInt32() < 100);
        var groups = body.GetProperty("groups");
        Assert.Equal(["Limpiar horno", "Limpiar nevera por dentro", "Limpiar juntas y mamparas"], Titles(groups.GetProperty("overdue")));
        Assert.Equal(["Cambiar toallas", "Fregar suelo", "Limpiar WC"], Titles(groups.GetProperty("today")));
        Assert.Equal(["Limpiar lavabo y espejo", "Limpiar fregadero", "Limpiar microondas"], Titles(groups.GetProperty("upcoming")));
        var oven = groups.GetProperty("overdue")[0];
        Assert.Equal(("overdue", "Atrasada 6 d", "Horno"), (oven.GetProperty("due").GetProperty("kind").GetString(), oven.GetProperty("due").GetProperty("label").GetString(), oven.GetProperty("zone").GetProperty("name").GetString()));
    }

    [Fact]
    public async Task UndoneCompletions_DoNotCountForTheStreak()
    {
        var (josep, hid, _, _) = await TodayTestData.CreateAsync(Factory);
        await using (var db = Factory.CreateDbContext())
        {
            await db.Completions.Where(c => c.CompletedOn == TodayTestData.Today.AddDays(-3)).ExecuteUpdateAsync(c => c.SetProperty(x => x.UndoneAt, ApiFactory.PrototypeNow), Ct);
        }

        var body = await josep.GetFromJsonAsync<JsonElement>($"/households/{hid}/today", Ct);

        Assert.Equal(2, body.GetProperty("summary").GetProperty("streak").GetInt32());
    }

    [Fact]
    public async Task ArchivedTasksAndRooms_AreNotInToday()
    {
        var (josep, hid, _, bathroom) = await TodayTestData.CreateAsync(Factory);
        await josep.DeleteAsync($"/households/{hid}/rooms/{bathroom}", Ct);

        var body = await josep.GetFromJsonAsync<JsonElement>($"/households/{hid}/today", Ct);

        Assert.DoesNotContain("Limpiar WC", Titles(body.GetProperty("groups").GetProperty("today")));
        Assert.Equal(3, body.GetProperty("summary").GetProperty("pendingToday").GetInt32()); // kitchen only: horno, nevera, fregar suelo
    }
}

public class TodayFiltersTests(ApiFactory factory) : IntegrationTest(factory)
{
    private static string[] All(JsonElement body) =>
        [.. new[] { "overdue", "today", "upcoming" }.SelectMany(g => body.GetProperty("groups").GetProperty(g).EnumerateArray().Select(t => t.GetProperty("title").GetString()!))];

    [Fact]
    public async Task Mine_Room_And15Minutes_FilterTheGroups_ButNotTheSummary()
    {
        var (josep, hid, _, bathroom) = await TodayTestData.CreateAsync(Factory);

        var mine = await josep.GetFromJsonAsync<JsonElement>($"/households/{hid}/today?filter=mine", Ct);
        var room = await josep.GetFromJsonAsync<JsonElement>($"/households/{hid}/today?room={bathroom}", Ct);
        var quick = await josep.GetFromJsonAsync<JsonElement>($"/households/{hid}/today?max=15", Ct);

        Assert.Equal(["Limpiar nevera por dentro", "Fregar suelo", "Limpiar fregadero"], All(mine));
        Assert.Equal(["Limpiar juntas y mamparas", "Cambiar toallas", "Limpiar WC", "Limpiar lavabo y espejo"], All(room));
        Assert.All(quick.GetProperty("groups").EnumerateObject().SelectMany(g => g.Value.EnumerateArray()), t => Assert.True(t.GetProperty("estimatedMinutes").GetInt32() <= 15));
        Assert.Contains("Limpiar WC", All(quick));
        Assert.DoesNotContain("Limpiar horno", All(quick));
        Assert.Equal(6, mine.GetProperty("summary").GetProperty("pendingToday").GetInt32());
    }
}

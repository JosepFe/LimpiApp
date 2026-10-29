using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.Api.Data.Entities;
using LimpiApp.IntegrationTests.Infrastructure;
using LimpiApp.IntegrationTests.Today;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.IntegrationTests.History;

public class HistoryTests(ApiFactory factory) : IntegrationTest(factory)
{
    /// <summary>Josep's household (TodayTestData: 5 completions by him, days -1…-5) plus Marta and older or extra ones.</summary>
    private async Task<(HttpClient Josep, Guid Hid, Guid BathroomId)> DataAsync(int extra = 0, bool sameTime = false)
    {
        var (josep, hid, _, bathroom) = await TodayTestData.CreateAsync(Factory);
        await using var db = Factory.CreateDbContext();
        var marta = new User { Email = "marta@example.com", Name = "Marta", AvatarColor = "amber", CreatedAt = ApiFactory.PrototypeNow };
        db.Memberships.Add(new Membership { User = marta, HouseholdId = hid, JoinedAt = ApiFactory.PrototypeNow });
        var wc = await db.Tasks.SingleAsync(t => t.Title == "Limpiar WC", Ct);
        Completion Done(int daysAgo, int hour, string? note = null) => new()
        {
            HouseholdId = hid,
            TaskId = wc.Id,
            User = marta,
            CompletedOn = TodayTestData.Today.AddDays(-daysAgo),
            CompletedAt = ApiFactory.PrototypeNow.AddDays(-daysAgo).AddHours(hour),
            Minutes = 8,
            Points = 2,
            PrevNextDue = TodayTestData.Today,
            Note = note,
        };
        db.Completions.AddRange(Done(0, -1, "Con lejía"), Done(29, 0), Done(30, 0)); // today; the 30th day back; out of the window
        for (var i = 0; i < extra; i++)
        {
            var done = Done(2, -(i + 1));
            if (sameTime)
            {
                done.CompletedAt = ApiFactory.PrototypeNow.AddDays(-2); // all at the same instant: the order falls to the id
            }

            db.Completions.Add(done);
        }

        await db.SaveChangesAsync(Ct);
        return (josep, hid, bathroom);
    }

    private static List<JsonElement> Items(JsonElement page) => [.. page.GetProperty("items").EnumerateArray()];

    [Fact]
    public async Task History_TheLast30Days_NewestFirst_WithWhoWhatAndPoints()
    {
        var (josep, hid, _) = await DataAsync();

        var page = await josep.GetFromJsonAsync<JsonElement>($"/households/{hid}/history", Ct);

        var items = Items(page);
        Assert.Equal(7, items.Count); // 5 by Josep + Marta today + Marta 29 days ago (30 days ago is out)
        Assert.Equal(items.Select(i => i.GetProperty("at").GetDateTimeOffset()).OrderDescending(), items.Select(i => i.GetProperty("at").GetDateTimeOffset()));
        var first = items[0];
        Assert.Equal(("Marta", "amber", "Limpiar WC", "Baño", "🛁"), (first.GetProperty("by").GetProperty("name").GetString(), first.GetProperty("by").GetProperty("avatarColor").GetString(),
            first.GetProperty("taskTitle").GetString(), first.GetProperty("roomName").GetString(), first.GetProperty("roomEmoji").GetString()));
        Assert.Equal((8, 2, "Con lejía", 0, false), (first.GetProperty("minutes").GetInt32(), first.GetProperty("points").GetInt32(), first.GetProperty("note").GetString(),
            first.GetProperty("photoCount").GetInt32(), first.GetProperty("undone").GetBoolean()));
        Assert.Null(page.GetProperty("nextCursor").GetString());
        Assert.Equal(["Cocina", "Baño"], page.GetProperty("rooms").EnumerateArray().Select(r => r.GetProperty("name").GetString()));
    }

    [Fact]
    public async Task History_Pages20AtATime_WithACursor_WithoutRepeatsOrGaps()
    {
        var (josep, hid, _) = await DataAsync(extra: 20);

        var first = await josep.GetFromJsonAsync<JsonElement>($"/households/{hid}/history", Ct);
        var cursor = first.GetProperty("nextCursor").GetString();
        var second = await josep.GetFromJsonAsync<JsonElement>($"/households/{hid}/history?cursor={cursor}", Ct);

        Assert.Equal(20, Items(first).Count);
        Assert.Equal(7, Items(second).Count);
        Assert.Null(second.GetProperty("nextCursor").GetString());
        var ids = Items(first).Concat(Items(second)).Select(i => i.GetProperty("id").GetGuid()).ToList();
        Assert.Equal(27, ids.Distinct().Count());
        var garbage = await josep.GetFromJsonAsync<JsonElement>($"/households/{hid}/history?cursor=not-a-cursor", Ct);
        Assert.Equal(20, Items(garbage).Count); // an unreadable cursor starts from the top
    }

    [Fact]
    public async Task History_Pages_WhenManyEntriesShareTheSameTime_WithoutRepeatsOrGaps()
    {
        var (josep, hid, _) = await DataAsync(extra: 25, sameTime: true);

        var ids = new List<Guid>();
        string? cursor = null;
        do
        {
            var page = await josep.GetFromJsonAsync<JsonElement>($"/households/{hid}/history{(cursor is null ? "" : $"?cursor={cursor}")}", Ct);
            ids.AddRange(Items(page).Select(i => i.GetProperty("id").GetGuid()));
            cursor = page.GetProperty("nextCursor").GetString();
        }
        while (cursor is not null);

        await using var db = Factory.CreateDbContext();
        Assert.Equal(await db.Completions.CountAsync(c => c.CompletedOn >= TodayTestData.Today.AddDays(-29), Ct), ids.Count);
        Assert.Equal(ids.Count, ids.Distinct().Count());
    }

    [Fact]
    public async Task History_Mine_AndRoom_Filter()
    {
        var (josep, hid, bathroom) = await DataAsync();

        var mine = await josep.GetFromJsonAsync<JsonElement>($"/households/{hid}/history?mine=true", Ct);
        var bath = await josep.GetFromJsonAsync<JsonElement>($"/households/{hid}/history?room={bathroom}", Ct);

        Assert.All(Items(mine), i => Assert.Equal("Josep", i.GetProperty("by").GetProperty("name").GetString()));
        Assert.Equal(5, Items(mine).Count);
        Assert.All(Items(bath), i => Assert.Equal("Baño", i.GetProperty("roomName").GetString()));
        await using var db = Factory.CreateDbContext();
        var since = TodayTestData.Today.AddDays(-29);
        Assert.Equal(await db.Completions.CountAsync(c => c.Task.RoomId == bathroom && c.CompletedOn >= since, Ct), Items(bath).Count);
        Assert.True(Items(bath).Count >= 2);
    }

    [Fact]
    public async Task UndoneEntries_StayWithoutPoints()
    {
        var (josep, hid, _) = await DataAsync();
        await using (var db = Factory.CreateDbContext())
        {
            await db.Completions.Where(c => c.Note == "Con lejía").ExecuteUpdateAsync(c => c.SetProperty(x => x.UndoneAt, ApiFactory.PrototypeNow), Ct);
        }

        var first = Items(await josep.GetFromJsonAsync<JsonElement>($"/households/{hid}/history", Ct))[0];

        Assert.Equal((true, 0), (first.GetProperty("undone").GetBoolean(), first.GetProperty("points").GetInt32()));
    }
}

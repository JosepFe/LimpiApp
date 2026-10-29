using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.IntegrationTests.Infrastructure;
using LimpiApp.IntegrationTests.Photos;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.IntegrationTests.History;

public class HistoryEntryTests(ApiFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Entry_HasTaskRoomSubtasksTimeNotePhotos_AndWhetherItIsUndone()
    {
        var (josep, hid, completion) = await PhotoTestData.CompletedAsync(Factory);
        await PhotoTestData.UploadAsync(josep, hid, completion, PhotoTestData.Jpeg);
        await PhotoTestData.UploadAsync(josep, hid, completion, PhotoTestData.Png, "x.png", "image/png");

        var entry = await josep.GetFromJsonAsync<JsonElement>($"/households/{hid}/history/{completion}", Ct);

        Assert.Equal(("Limpiar nevera por dentro", "Cocina", "Josep"), (entry.GetProperty("taskTitle").GetString(), entry.GetProperty("roomName").GetString(), entry.GetProperty("by").GetProperty("name").GetString()));
        Assert.Equal((0, 0, 30, false, true), (entry.GetProperty("subtasksDone").GetInt32(), entry.GetProperty("subtasksTotal").GetInt32(), entry.GetProperty("minutes").GetInt32(),
            entry.GetProperty("undone").GetBoolean(), entry.GetProperty("mine").GetBoolean()));
        var photos = entry.GetProperty("photos").EnumerateArray().Select(p => p.GetProperty("url").GetString()!).ToList();
        Assert.Equal(2, photos.Count);
        Assert.Equal(HttpStatusCode.OK, (await josep.GetAsync(photos[0], Ct)).StatusCode);

        await josep.PostAsync($"/households/{hid}/completions/{completion}/undo", null, Ct);
        var undone = await josep.GetFromJsonAsync<JsonElement>($"/households/{hid}/history/{completion}", Ct);
        Assert.True(undone.GetProperty("undone").GetBoolean());
    }

    [Fact]
    public async Task Entry_OfAnotherHousehold_Is404()
    {
        var (_, hid, completion) = await PhotoTestData.CompletedAsync(Factory);
        var stranger = await Factory.SignedInAsync("intruso@example.com");
        var home = await ApiFactory.CreateHouseholdAsync(stranger, "Otra");

        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync($"/households/{hid}/history/{completion}", Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync($"/households/{home}/history/{completion}", Ct)).StatusCode);
        var list = await stranger.GetFromJsonAsync<JsonElement>($"/households/{home}/history", Ct);
        Assert.Equal(0, list.GetProperty("items").GetArrayLength());
        await using var db = Factory.CreateDbContext();
        Assert.All(await db.Completions.ToListAsync(Ct), c => Assert.Equal(hid, c.HouseholdId));
    }
}

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.IntegrationTests.Rooms;

public class RoomsTemplateTests(ApiFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task FromTemplate_AddsTheKitchenTasksTheRoomDoesNotHaveYet()
    {
        var josep = await Factory.SignedInAsync();
        var hid = await ApiFactory.CreateHouseholdAsync(josep);
        var created = await (await josep.PostAsJsonAsync($"/households/{hid}/rooms", new { name = "Cocina", emoji = "🍳", color = "orange" }, Ct))
            .Content.ReadFromJsonAsync<JsonElement>(Ct);
        var roomId = created.GetProperty("id").GetGuid();

        var first = await josep.PostAsJsonAsync($"/households/{hid}/rooms/{roomId}/from-template", new { }, Ct);
        var again = await josep.PostAsJsonAsync($"/households/{hid}/rooms/{roomId}/from-template", new { }, Ct);

        Assert.Equal(6, (await first.Content.ReadFromJsonAsync<JsonElement>(Ct)).GetProperty("added").GetInt32());
        Assert.Equal(0, (await again.Content.ReadFromJsonAsync<JsonElement>(Ct)).GetProperty("added").GetInt32());
        await using var db = Factory.CreateDbContext();
        Assert.Equal(6, await db.Tasks.CountAsync(t => t.RoomId == roomId, Ct));
        var zones = await db.Zones.Where(z => z.RoomId == roomId).Select(z => z.Name).ToListAsync(Ct);
        Assert.Equal(["Horno", "Nevera"], zones.Order(StringComparer.Ordinal));
    }

    [Fact]
    public async Task FromTemplate_ForARoomWithoutTemplate_Is400_UnlessOneIsChosen()
    {
        var josep = await Factory.SignedInAsync();
        var hid = await ApiFactory.CreateHouseholdAsync(josep);
        var created = await (await josep.PostAsJsonAsync($"/households/{hid}/rooms", new { name = "Garaje", emoji = "🚗", color = "slate" }, Ct))
            .Content.ReadFromJsonAsync<JsonElement>(Ct);
        var roomId = created.GetProperty("id").GetGuid();

        Assert.Equal(HttpStatusCode.BadRequest, (await josep.PostAsJsonAsync($"/households/{hid}/rooms/{roomId}/from-template", new { }, Ct)).StatusCode);
        var chosen = await josep.PostAsJsonAsync($"/households/{hid}/rooms/{roomId}/from-template", new { templateId = "hall" }, Ct);
        Assert.Equal(2, (await chosen.Content.ReadFromJsonAsync<JsonElement>(Ct)).GetProperty("added").GetInt32());
    }
}

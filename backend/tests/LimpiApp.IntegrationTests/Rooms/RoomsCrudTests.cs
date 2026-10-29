using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.Api.Data.Entities;
using LimpiApp.IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.IntegrationTests.Rooms;

public class RoomsCrudTests(ApiFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Create_SavesTheRoomWithItsZonesInOrder()
    {
        var josep = await Factory.SignedInAsync();
        var hid = await ApiFactory.CreateHouseholdAsync(josep);

        var response = await josep.PostAsJsonAsync($"/households/{hid}/rooms",
            new { name = "Cocina", emoji = "🍳", color = "orange", zones = new[] { new { name = "Nevera" }, new { name = "Horno" } } }, Ct);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var room = await response.Content.ReadFromJsonAsync<JsonElement>(Ct);
        Assert.Equal(("Cocina", "🍳", "orange"), (room.GetProperty("name").GetString(), room.GetProperty("emoji").GetString(), room.GetProperty("color").GetString()));
        Assert.Equal(["Nevera", "Horno"], room.GetProperty("zones").EnumerateArray().Select(z => z.GetProperty("name").GetString()));
        Assert.Equal(JsonValueKind.Null, room.GetProperty("health").ValueKind); // no tasks: nothing to measure
    }

    [Fact]
    public async Task Patch_RenamesAddsAndRemovesZones_AndTasksOfARemovedZoneGoToNoZone()
    {
        var josep = await Factory.SignedInAsync();
        var hid = await ApiFactory.CreateHouseholdAsync(josep, "Casa", "kitchen");
        Guid roomId;
        Guid fridge;
        await using (var db = Factory.CreateDbContext())
        {
            var room = await db.Rooms.Include(r => r.Zones).SingleAsync(Ct);
            roomId = room.Id;
            fridge = room.Zones.Single(z => z.Name == "Nevera").Id;
        }

        var response = await josep.PatchAsJsonAsync($"/households/{hid}/rooms/{roomId}",
            new { name = "Cocina grande", emoji = "🍽️", color = "amber", zones = new object[] { new { id = fridge, name = "Frigorífico" }, new { id = (Guid?)null, name = "Despensa" } } }, Ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Ct);
        Assert.Equal("Cocina grande", body.GetProperty("name").GetString());
        Assert.Equal(["Frigorífico", "Despensa"], body.GetProperty("zones").EnumerateArray().Select(z => z.GetProperty("name").GetString()));
        await using var check = Factory.CreateDbContext();
        Assert.Null((await check.Tasks.SingleAsync(t => t.Title == "Limpiar horno", Ct)).ZoneId);
        Assert.Equal(fridge, (await check.Tasks.SingleAsync(t => t.Title == "Limpiar nevera por dentro", Ct)).ZoneId);
    }

    [Fact]
    public async Task AZoneWithoutName_Is400()
    {
        var josep = await Factory.SignedInAsync();
        var hid = await ApiFactory.CreateHouseholdAsync(josep);

        var response = await josep.PostAsJsonAsync($"/households/{hid}/rooms", new { name = "Cocina", emoji = "🍳", color = "orange", zones = new[] { new { name = "  " } } }, Ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("", "orange")]
    [InlineData("Cocina", "purple")]
    public async Task Create_WithoutNameOrWithAnUnknownColour_Is400(string name, string color)
    {
        var josep = await Factory.SignedInAsync();
        var hid = await ApiFactory.CreateHouseholdAsync(josep);

        var response = await josep.PostAsJsonAsync($"/households/{hid}/rooms", new { name, emoji = "🍳", color }, Ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task List_GivesTheHouseholdHealth_AndPerRoomHealthOverdueAndNextTask()
    {
        var josep = await Factory.SignedInAsync();
        var hid = await ApiFactory.CreateHouseholdAsync(josep, "Casa", "kitchen", "terrace");
        var today = new DateOnly(2026, 10, 14);
        await using (var db = Factory.CreateDbContext())
        {
            // Cocina: weekly floor 3 days late (57), oven a month late = 30 d (0), the rest on time; next upcoming: «Fregadero» today
            foreach (var t in await db.Tasks.Include(t => t.Room).ToListAsync(Ct))
            {
                t.NextDue = (t.Room.Name, t.Title) switch
                {
                    ("Cocina", "Fregar suelo") => today.AddDays(-3),
                    ("Cocina", "Limpiar horno") => today.AddDays(-30),
                    ("Cocina", "Limpiar fregadero") => today,
                    ("Cocina", _) => today.AddDays(2),
                    (_, "Barrer terraza") => today.AddDays(6),
                    _ => today.AddDays(10),
                };
            }

            await db.SaveChangesAsync(Ct);
        }

        var body = await josep.GetFromJsonAsync<JsonElement>($"/households/{hid}/rooms", Ct);

        var summary = body.GetProperty("summary");
        Assert.Equal((2, 2), (summary.GetProperty("roomCount").GetInt32(), summary.GetProperty("overdueCount").GetInt32()));
        var rooms = body.GetProperty("rooms").EnumerateArray().ToList();
        var kitchen = rooms[0];
        Assert.Equal(76, kitchen.GetProperty("health").GetProperty("value").GetInt32()); // (57 + 0 + 4×100) / 6
        Assert.Equal("Bien", kitchen.GetProperty("health").GetProperty("label").GetString());
        Assert.Equal((2, 6), (kitchen.GetProperty("overdueCount").GetInt32(), kitchen.GetProperty("activeTaskCount").GetInt32()));
        Assert.Equal(("Limpiar fregadero", "Hoy"), (kitchen.GetProperty("next").GetProperty("title").GetString(), kitchen.GetProperty("next").GetProperty("when").GetString()));
        Assert.Equal(("Barrer terraza", "En 6 d"), (rooms[1].GetProperty("next").GetProperty("title").GetString(), rooms[1].GetProperty("next").GetProperty("when").GetString()));
        Assert.Equal(88, summary.GetProperty("health").GetProperty("value").GetInt32()); // (76 + 100) / 2
    }

    [Fact]
    public async Task AnotherHouseholdsRoom_Is404()
    {
        var josep = await Factory.SignedInAsync();
        var hid = await ApiFactory.CreateHouseholdAsync(josep, "Casa", "kitchen");
        var pau = await Factory.SignedInAsync("pau@example.com");
        var pauHome = await ApiFactory.CreateHouseholdAsync(pau, "Piso de Pau");
        Guid roomId;
        await using (var db = Factory.CreateDbContext())
        {
            roomId = (await db.Rooms.SingleAsync(r => r.HouseholdId == hid, Ct)).Id;
        }

        Assert.Equal(HttpStatusCode.NotFound, (await pau.GetAsync($"/households/{hid}/rooms", Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await pau.GetAsync($"/households/{pauHome}/rooms/{roomId}", Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await pau.DeleteAsync($"/households/{pauHome}/rooms/{roomId}", Ct)).StatusCode);
    }
}

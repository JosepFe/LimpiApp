using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.IntegrationTests.Tasks;

/// <summary>Every rooms/tasks/products route answers 404 for another household, and ids of another household are rejected.</summary>
public class TasksIsolationTests(ApiFactory factory) : IntegrationTest(factory)
{
    private sealed record Other(HttpClient Pau, Guid PauHome, Guid PauRoom, Guid PauZone, Guid PauProduct);

    private async Task<Other> PausHouseholdAsync()
    {
        // Not Pau: TaskTestData makes Pau a member of Josep's household.
        var pau = await Factory.SignedInAsync("intruso@example.com");
        var home = await ApiFactory.CreateHouseholdAsync(pau, "Piso de Pau", "kitchen");
        await pau.PostAsJsonAsync($"/households/{home}/products", new { name = "Amoniaco" }, Ct);
        await using var db = Factory.CreateDbContext();
        var room = await db.Rooms.Include(r => r.Zones).SingleAsync(r => r.HouseholdId == home, Ct);
        var product = await db.Products.SingleAsync(p => p.HouseholdId == home, Ct);
        return new Other(pau, home, room.Id, room.Zones[0].Id, product.Id);
    }

    [Fact]
    public async Task EveryRouteOfAnotherHousehold_Is404()
    {
        var data = await TaskTestData.CreateAsync(Factory);
        var other = await PausHouseholdAsync();
        var hid = data.HouseholdId;
        var room = data.KitchenId;
        var task = data.NoZoneTaskId;
        var pau = other.Pau;

        var responses = new[]
        {
            await pau.GetAsync($"/households/{hid}/tasks", Ct),
            await pau.GetAsync($"/households/{hid}/tasks/{task}", Ct),
            await pau.PatchAsJsonAsync($"/households/{hid}/tasks/{task}", data.Request(), Ct),
            await pau.DeleteAsync($"/households/{hid}/tasks/{task}", Ct),
            await pau.PostAsJsonAsync($"/households/{hid}/tasks", data.Request(), Ct),
            await pau.GetAsync($"/households/{hid}/products", Ct),
            await pau.PostAsJsonAsync($"/households/{hid}/products", new { name = "X" }, Ct),
            await pau.DeleteAsync($"/households/{hid}/products/{data.MopId}", Ct),
            await pau.PatchAsJsonAsync($"/households/{hid}/rooms/{room}", new { name = "X", emoji = "🍳", color = "orange" }, Ct),
            await pau.PostAsJsonAsync($"/households/{hid}/rooms/{room}/from-template", new { }, Ct),
            // through Pau's own household, with Josep's ids
            await pau.GetAsync($"/households/{other.PauHome}/tasks/{task}", Ct),
            await pau.PatchAsJsonAsync($"/households/{other.PauHome}/tasks/{task}", data.Request(), Ct),
            await pau.DeleteAsync($"/households/{other.PauHome}/tasks/{task}", Ct),
            await pau.DeleteAsync($"/households/{other.PauHome}/products/{data.MopId}", Ct),
            await pau.PatchAsJsonAsync($"/households/{other.PauHome}/rooms/{room}", new { name = "X", emoji = "🍳", color = "orange" }, Ct),
            await pau.PostAsJsonAsync($"/households/{other.PauHome}/rooms/{room}/from-template", new { }, Ct),
        };

        Assert.All(responses, r => Assert.Equal(HttpStatusCode.NotFound, r.StatusCode));
        await using var db = Factory.CreateDbContext();
        Assert.Null((await db.Tasks.SingleAsync(t => t.Id == task, Ct)).ArchivedAt);
        Assert.Null((await db.Products.SingleAsync(p => p.Id == data.MopId, Ct)).ArchivedAt);
        Assert.Equal("Cocina", (await db.Rooms.SingleAsync(r => r.Id == room, Ct)).Name);
    }

    [Fact]
    public async Task ARoomZoneOrProductOfAnotherHousehold_IsRejected()
    {
        var data = await TaskTestData.CreateAsync(Factory);
        var other = await PausHouseholdAsync();
        var body = JsonSerializer.SerializeToNode(data.Request(products: [other.PauProduct]))!.AsObject();

        var foreignProduct = await data.PostAsync(body);
        body["productIds"] = new System.Text.Json.Nodes.JsonArray();
        body["roomId"] = other.PauRoom.ToString();
        var foreignRoom = await data.PostAsync(body);
        body["roomId"] = data.KitchenId.ToString();
        body["zoneId"] = other.PauZone.ToString();
        var foreignZone = await data.PostAsync(body);

        Assert.Equal(HttpStatusCode.BadRequest, foreignProduct.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, foreignRoom.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, foreignZone.StatusCode);
    }
}

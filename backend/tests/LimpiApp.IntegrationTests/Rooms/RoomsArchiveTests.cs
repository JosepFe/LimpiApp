using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.IntegrationTests.Rooms;

public class RoomsArchiveTests(ApiFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Delete_ArchivesTheRoomAndItsTasks_AndTheyLeaveTheList()
    {
        var josep = await Factory.SignedInAsync();
        var hid = await ApiFactory.CreateHouseholdAsync(josep, "Casa", "kitchen", "bathroom");
        Guid kitchen;
        await using (var db = Factory.CreateDbContext())
        {
            kitchen = (await db.Rooms.SingleAsync(r => r.Name == "Cocina", Ct)).Id;
        }

        var response = await josep.DeleteAsync($"/households/{hid}/rooms/{kitchen}", Ct);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var list = await josep.GetFromJsonAsync<JsonElement>($"/households/{hid}/rooms", Ct);
        Assert.Equal(["Baño"], list.GetProperty("rooms").EnumerateArray().Select(r => r.GetProperty("name").GetString()));
        await using var check = Factory.CreateDbContext();
        Assert.All(await check.Tasks.Where(t => t.RoomId == kitchen).ToListAsync(Ct), t => Assert.NotNull(t.ArchivedAt));
        Assert.Equal(6, await check.Tasks.CountAsync(t => t.ArchivedAt == null, Ct));
        Assert.Equal(HttpStatusCode.NotFound, (await josep.DeleteAsync($"/households/{hid}/rooms/{kitchen}", Ct)).StatusCode);
    }
}

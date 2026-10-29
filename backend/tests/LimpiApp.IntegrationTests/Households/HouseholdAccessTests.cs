using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.IntegrationTests.Infrastructure;

namespace LimpiApp.IntegrationTests.Households;

public class HouseholdAccessTests(ApiFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task AMemberReadsTheHousehold_AnyoneElseGets404()
    {
        var josep = await Factory.SignedInAsync();
        var created = await (await josep.PostAsJsonAsync("/households", new { name = "Casa Pau y Josep", timeZone = "Europe/Madrid", templates = new[] { "kitchen" } }, Ct))
            .Content.ReadFromJsonAsync<JsonElement>(Ct);
        var id = created.GetProperty("id").GetGuid();

        var mine = await josep.GetFromJsonAsync<JsonElement>($"/households/{id}", Ct);
        Assert.Equal(("Casa Pau y Josep", "Europe/Madrid", 1, 1), (mine.GetProperty("name").GetString(), mine.GetProperty("timeZone").GetString(), mine.GetProperty("memberCount").GetInt32(), mine.GetProperty("roomCount").GetInt32()));

        var stranger = await Factory.SignedInAsync("intruso@example.com");
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync($"/households/{id}", Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync($"/households/{Guid.NewGuid()}", Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Factory.CreateBrowser().GetAsync($"/households/{id}", Ct)).StatusCode);
    }
}

using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.IntegrationTests.Infrastructure;

namespace LimpiApp.IntegrationTests.Today;

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

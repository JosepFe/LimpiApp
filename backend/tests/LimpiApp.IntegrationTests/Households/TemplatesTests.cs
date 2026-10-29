using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.IntegrationTests.Infrastructure;

namespace LimpiApp.IntegrationTests.Households;

public class TemplatesTests(ApiFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Templates_AreTheEightOfThePrototype_WithTheirTaskCounts()
    {
        var browser = await Factory.SignedInAsync();

        var templates = await browser.GetFromJsonAsync<JsonElement[]>("/templates", Ct);

        Assert.Equal(
            [("🍳", "Cocina", 6), ("🛁", "Baño", 6), ("🛏️", "Dormitorio", 5), ("🛋️", "Salón", 4), ("🚪", "Recibidor", 2), ("🧺", "Lavadero", 3), ("💻", "Despacho", 3), ("🌿", "Terraza", 3)],
            templates!.Select(t => (t.GetProperty("emoji").GetString(), t.GetProperty("name").GetString(), t.GetProperty("taskCount").GetInt32())));
    }

    [Fact]
    public async Task Templates_NeedASession()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await Factory.CreateBrowser().GetAsync("/templates", Ct)).StatusCode);
    }
}

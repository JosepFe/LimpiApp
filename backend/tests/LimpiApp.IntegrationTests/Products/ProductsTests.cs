using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.IntegrationTests.Infrastructure;
using LimpiApp.IntegrationTests.Tasks;

namespace LimpiApp.IntegrationTests.Products;

public class ProductsTests(ApiFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task List_InCreationOrder_WithTheNumberOfActiveTasksUsingEach()
    {
        var data = await TaskTestData.CreateAsync(Factory);
        await data.PostAsync(data.Request("Fregar suelo del office", products: [data.MopId, data.BleachId]));
        var archived = (await (await data.PostAsync(data.Request("Fregar terraza", products: [data.MopId]))).Content.ReadFromJsonAsync<JsonElement>(Ct)).GetProperty("id").GetGuid();
        await data.Josep.DeleteAsync($"/households/{data.HouseholdId}/tasks/{archived}", Ct);

        var created = await data.Josep.PostAsJsonAsync($"/households/{data.HouseholdId}/products", new { name = " Vinagre " }, Ct);
        var list = await data.Josep.GetFromJsonAsync<JsonElement[]>($"/households/{data.HouseholdId}/products", Ct);

        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        Assert.Equal([("🪣", "Fregona", 1), ("🧪", "Lejía", 1), ("🧴", "Vinagre", 0)],
            list!.Select(p => (p.GetProperty("emoji").GetString(), p.GetProperty("name").GetString(), p.GetProperty("taskCount").GetInt32())));
    }

    [Fact]
    public async Task Archive_RemovesItFromTheList_AndTasksCanNoLongerUseIt()
    {
        var data = await TaskTestData.CreateAsync(Factory);

        Assert.Equal(HttpStatusCode.NoContent, (await data.Josep.DeleteAsync($"/households/{data.HouseholdId}/products/{data.MopId}", Ct)).StatusCode);

        var list = await data.Josep.GetFromJsonAsync<JsonElement[]>($"/households/{data.HouseholdId}/products", Ct);
        Assert.Equal(["Lejía"], list!.Select(p => p.GetProperty("name").GetString()));
        Assert.Equal(HttpStatusCode.BadRequest, (await data.PostAsync(data.Request(products: [data.MopId]))).StatusCode);
    }

    [Fact]
    public async Task Create_WithoutName_Is400()
    {
        var data = await TaskTestData.CreateAsync(Factory);

        Assert.Equal(HttpStatusCode.BadRequest, (await data.Josep.PostAsJsonAsync($"/households/{data.HouseholdId}/products", new { name = "  " }, Ct)).StatusCode);
    }
}

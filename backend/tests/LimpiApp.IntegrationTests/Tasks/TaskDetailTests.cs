using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.IntegrationTests.Infrastructure;

namespace LimpiApp.IntegrationTests.Tasks;

public class TaskDetailTests(ApiFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Detail_HasSubtasksProducts_AndNoHistoryBeforeTheFirstCompletion()
    {
        var data = await TaskTestData.CreateAsync(Factory);
        var id = (await (await data.PostAsync(data.Request(assignee: data.PauId))).Content.ReadFromJsonAsync<JsonElement>(Ct)).GetProperty("id").GetGuid();

        var task = await data.Josep.GetFromJsonAsync<JsonElement>($"/households/{data.HouseholdId}/tasks/{id}", Ct);

        Assert.Equal(5, task.GetProperty("subtasks").GetArrayLength());
        Assert.Equal(2, task.GetProperty("products").GetArrayLength());
        Assert.Equal("🪣", task.GetProperty("products")[0].GetProperty("emoji").GetString());
        Assert.Equal(JsonValueKind.Null, task.GetProperty("lastDone").ValueKind); // «Nunca» (E04 fills it from completions)
        Assert.Equal(0, task.GetProperty("history").GetArrayLength());
    }
}

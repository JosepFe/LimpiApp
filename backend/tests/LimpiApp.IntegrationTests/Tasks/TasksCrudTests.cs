using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.IntegrationTests.Tasks;

public class TasksCrudTests(ApiFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Create_SavesEverything_AndCalculatesTheDue()
    {
        var data = await TaskTestData.CreateAsync(Factory);

        var response = await data.PostAsync(data.Request(assignee: data.PauId));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var task = await response.Content.ReadFromJsonAsync<JsonElement>(Ct);
        Assert.Equal("Fregar suelo del office", task.GetProperty("title").GetString());
        Assert.Equal(("🍳", "Cocina"), (task.GetProperty("roomEmoji").GetString(), task.GetProperty("roomName").GetString()));
        Assert.Equal((1, "week", 20, "medium"), (task.GetProperty("freqValue").GetInt32(), task.GetProperty("freqUnit").GetString(), task.GetProperty("estimatedMinutes").GetInt32(), task.GetProperty("priority").GetString()));
        Assert.Equal(("today", "Hoy"), (task.GetProperty("due").GetProperty("kind").GetString(), task.GetProperty("due").GetProperty("label").GetString()));
        Assert.Equal(("Pau", "violet"), (task.GetProperty("assignee").GetProperty("name").GetString(), task.GetProperty("assignee").GetProperty("avatarColor").GetString()));
        Assert.Equal(5, task.GetProperty("subtasks").GetArrayLength());
        Assert.Equal("Quitar sillas y objetos del suelo", task.GetProperty("subtasks")[0].GetProperty("title").GetString());
        Assert.Equal(["Fregona", "Lejía"], task.GetProperty("products").EnumerateArray().Select(p => p.GetProperty("name").GetString()));
        Assert.Equal("Usar la fregona de microfibra azul.", task.GetProperty("notes").GetString());
    }

    [Fact]
    public async Task Patch_ReplacesSubtasksAndProducts()
    {
        var data = await TaskTestData.CreateAsync(Factory);
        var id = (await (await data.PostAsync(data.Request())).Content.ReadFromJsonAsync<JsonElement>(Ct)).GetProperty("id").GetGuid();

        var response = await data.Josep.PatchAsJsonAsync($"/households/{data.HouseholdId}/tasks/{id}",
            data.Request("Fregar suelo", subtasks: ["Barrer", "Fregar"], products: [data.BleachId]), Ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var task = await response.Content.ReadFromJsonAsync<JsonElement>(Ct);
        Assert.Equal(["Barrer", "Fregar"], task.GetProperty("subtasks").EnumerateArray().Select(s => s.GetProperty("title").GetString()));
        Assert.Equal(["Lejía"], task.GetProperty("products").EnumerateArray().Select(p => p.GetProperty("name").GetString()));
        await using var db = Factory.CreateDbContext();
        Assert.Equal(2, await db.Subtasks.CountAsync(s => s.TaskId == id, Ct));
    }

    [Fact]
    public async Task Delete_ArchivesTheTask_AndItLeavesTheList()
    {
        var data = await TaskTestData.CreateAsync(Factory);

        var response = await data.Josep.DeleteAsync($"/households/{data.HouseholdId}/tasks/{data.NoZoneTaskId}", Ct);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var list = await data.Josep.GetFromJsonAsync<JsonElement[]>($"/households/{data.HouseholdId}/tasks?room={data.KitchenId}", Ct);
        Assert.Equal(5, list!.Length);
        Assert.DoesNotContain(list, t => t.GetProperty("title").GetString() == "Fregar suelo");
        await using var db = Factory.CreateDbContext();
        Assert.NotNull((await db.Tasks.SingleAsync(t => t.Id == data.NoZoneTaskId, Ct)).ArchivedAt);
        Assert.Equal(HttpStatusCode.NotFound, (await data.Josep.GetAsync($"/households/{data.HouseholdId}/tasks/{data.NoZoneTaskId}", Ct)).StatusCode);
    }

    [Fact]
    public async Task List_IsOrderedByDue_WithZoneAndDueLabel()
    {
        var data = await TaskTestData.CreateAsync(Factory);

        var list = await data.Josep.GetFromJsonAsync<JsonElement[]>($"/households/{data.HouseholdId}/tasks", Ct);

        Assert.Equal(6, list!.Length);
        Assert.True(list.Select(t => t.GetProperty("nextDue").GetString()).SequenceEqual(list.Select(t => t.GetProperty("nextDue").GetString()).Order(StringComparer.Ordinal)));
        var fridge = list.Single(t => t.GetProperty("title").GetString() == "Limpiar nevera por dentro");
        Assert.Equal("Nevera", fridge.GetProperty("zone").GetProperty("name").GetString());
    }
}

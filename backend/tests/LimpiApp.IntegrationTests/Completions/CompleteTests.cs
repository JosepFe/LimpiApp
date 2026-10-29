using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.IntegrationTests.Infrastructure;
using LimpiApp.IntegrationTests.Today;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.IntegrationTests.Completions;

public class CompleteTests(ApiFactory factory) : IntegrationTest(factory)
{
    private async Task<(HttpClient Josep, Guid Hid, Guid Fridge)> FridgeWithFiveSubtasksAsync()
    {
        var (josep, hid, _, _) = await TodayTestData.CreateAsync(Factory);
        await using var db = Factory.CreateDbContext();
        var fridge = await db.Tasks.SingleAsync(t => t.Title == "Limpiar nevera por dentro", Ct);
        foreach (var (title, i) in new[] { "Vaciar y sacar baldas", "Retirar lo caducado", "Limpiar baldas y cajones", "Limpiar paredes y gomas", "Secar y recolocar" }.Select((t, i) => (t, i)))
        {
            db.Subtasks.Add(new Api.Data.Entities.Subtask { TaskId = fridge.Id, Title = title, Position = i });
        }

        await db.SaveChangesAsync(Ct);
        return (josep, hid, fridge.Id);
    }

    [Fact]
    public async Task Complete_AllSubtasks_Gives9Points_AndTheNextTimeIsTodayPlusTheFrequency()
    {
        var (josep, hid, fridge) = await FridgeWithFiveSubtasksAsync();

        var response = await josep.PostAsJsonAsync($"/households/{hid}/tasks/{fridge}/complete", new { subtasksDone = 5, minutes = 30, note = " Sin hielo " }, Ct);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Ct);
        Assert.Equal(9, body.GetProperty("points").GetInt32());
        Assert.Equal(6, body.GetProperty("streak").GetInt32()); // 5 days in a row + today: «Racha de 6 días»
        Assert.Equal(("2026-11-14", "sáb 14 nov"), (body.GetProperty("nextDue").GetString(), body.GetProperty("nextDueDay").GetString())); // monthly
        await using var db = Factory.CreateDbContext();
        var completion = await db.Completions.SingleAsync(c => c.TaskId == fridge, Ct);
        Assert.Equal((5, 5, 30, "Sin hielo", new DateOnly(2026, 10, 11)), (completion.SubtasksDone, completion.SubtasksTotal, completion.Minutes, completion.Note, completion.PrevNextDue));
        Assert.Equal(new DateOnly(2026, 11, 14), (await db.Tasks.SingleAsync(t => t.Id == fridge, Ct)).NextDue);
    }

    [Fact]
    public async Task Complete_ThreeOfFive_Gives5Points()
    {
        var (josep, hid, fridge) = await FridgeWithFiveSubtasksAsync();

        var body = await (await josep.PostAsJsonAsync($"/households/{hid}/tasks/{fridge}/complete", new { subtasksDone = 3, minutes = 30 }, Ct)).Content.ReadFromJsonAsync<JsonElement>(Ct);

        Assert.Equal(5, body.GetProperty("points").GetInt32());
    }

    [Fact]
    public async Task TheTaskDetail_ShowsTheLastTimes_NewestFirst()
    {
        var (josep, hid, fridge) = await FridgeWithFiveSubtasksAsync();
        await josep.PostAsJsonAsync($"/households/{hid}/tasks/{fridge}/complete", new { subtasksDone = 5, minutes = 25 }, Ct);
        Factory.Time.Advance(TimeSpan.FromHours(2));
        await josep.PostAsJsonAsync($"/households/{hid}/tasks/{fridge}/complete", new { subtasksDone = 3, minutes = 30 }, Ct);

        var task = await josep.GetFromJsonAsync<JsonElement>($"/households/{hid}/tasks/{fridge}", Ct);

        Assert.Equal(["Josep", "Josep"], task.GetProperty("history").EnumerateArray().Select(h => h.GetProperty("by").GetProperty("name").GetString()));
        Assert.Equal([5, 9], task.GetProperty("history").EnumerateArray().Select(h => h.GetProperty("points").GetInt32()));
        Assert.Equal(30, task.GetProperty("lastDone").GetProperty("minutes").GetInt32());
    }

    [Fact]
    public async Task Complete_MoreSubtasksThanItHas_Is400_AnArchivedOrForeignTask_Is404()
    {
        var (josep, hid, fridge) = await FridgeWithFiveSubtasksAsync();
        Assert.Equal(HttpStatusCode.BadRequest, (await josep.PostAsJsonAsync($"/households/{hid}/tasks/{fridge}/complete", new { subtasksDone = 6, minutes = 30 }, Ct)).StatusCode);

        var stranger = await Factory.SignedInAsync("intruso@example.com");
        var strangerHome = await ApiFactory.CreateHouseholdAsync(stranger, "Otra");
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.PostAsJsonAsync($"/households/{hid}/tasks/{fridge}/complete", new { subtasksDone = 0, minutes = 30 }, Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.PostAsJsonAsync($"/households/{strangerHome}/tasks/{fridge}/complete", new { subtasksDone = 0, minutes = 30 }, Ct)).StatusCode);

        await josep.DeleteAsync($"/households/{hid}/tasks/{fridge}", Ct);
        Assert.Equal(HttpStatusCode.NotFound, (await josep.PostAsJsonAsync($"/households/{hid}/tasks/{fridge}/complete", new { subtasksDone = 0, minutes = 30 }, Ct)).StatusCode);
        await using var db = Factory.CreateDbContext();
        Assert.Equal(0, await db.Completions.CountAsync(c => c.TaskId == fridge, Ct));
    }
}

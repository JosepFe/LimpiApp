using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.Api.Data.Entities;
using LimpiApp.IntegrationTests.Infrastructure;
using LimpiApp.IntegrationTests.Photos;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.IntegrationTests.Completions;

public class UndoTests(ApiFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Undo_ByWhoDidIt_Within10Minutes_RestoresTheDue_AndNoLongerCounts()
    {
        var (josep, hid, completion) = await PhotoTestData.CompletedAsync(Factory);
        Factory.Time.Advance(TimeSpan.FromMinutes(9));

        var response = await josep.PostAsync($"/households/{hid}/completions/{completion}/undo", null, Ct);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await using var db = Factory.CreateDbContext();
        var done = await db.Completions.Include(c => c.Task).SingleAsync(c => c.Id == completion, Ct);
        Assert.NotNull(done.UndoneAt);
        Assert.Equal(new DateOnly(2026, 10, 11), done.Task.NextDue); // overdue again, as before
        var today = await josep.GetFromJsonAsync<JsonElement>($"/households/{hid}/today", Ct);
        Assert.Equal(5, today.GetProperty("summary").GetProperty("streak").GetInt32()); // today's completion no longer counts
        Assert.Contains(today.GetProperty("groups").GetProperty("overdue").EnumerateArray(), t => t.GetProperty("title").GetString() == "Limpiar nevera por dentro");
        var task = await josep.GetFromJsonAsync<JsonElement>($"/households/{hid}/tasks/{done.TaskId}", Ct);
        Assert.Equal(0, task.GetProperty("history").GetArrayLength());
    }

    [Fact]
    public async Task Undo_ByAnotherMember_Is403_After10Minutes_OrTwice_Is409()
    {
        var (josep, hid, completion) = await PhotoTestData.CompletedAsync(Factory);
        await using (var db = Factory.CreateDbContext())
        {
            db.Memberships.Add(new Membership { User = new User { Email = "marta@example.com", Name = "Marta", CreatedAt = ApiFactory.PrototypeNow }, HouseholdId = hid, JoinedAt = ApiFactory.PrototypeNow });
            await db.SaveChangesAsync(Ct);
        }

        var marta = await Factory.SignedInAsync("marta@example.com");
        Assert.Equal(HttpStatusCode.Forbidden, (await marta.PostAsync($"/households/{hid}/completions/{completion}/undo", null, Ct)).StatusCode);

        Factory.Time.Advance(TimeSpan.FromMinutes(10) + TimeSpan.FromSeconds(1));
        Assert.Equal(HttpStatusCode.Conflict, (await josep.PostAsync($"/households/{hid}/completions/{completion}/undo", null, Ct)).StatusCode);

        var second = await CompleteAgainAsync(josep, hid);
        Assert.Equal(HttpStatusCode.NoContent, (await josep.PostAsync($"/households/{hid}/completions/{second}/undo", null, Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await josep.PostAsync($"/households/{hid}/completions/{second}/undo", null, Ct)).StatusCode);
    }

    [Fact]
    public async Task Undo_OfAnotherHousehold_Is404()
    {
        var (_, hid, completion) = await PhotoTestData.CompletedAsync(Factory);
        var stranger = await Factory.SignedInAsync("intruso@example.com");
        var home = await ApiFactory.CreateHouseholdAsync(stranger, "Otra");

        Assert.Equal(HttpStatusCode.NotFound, (await stranger.PostAsync($"/households/{hid}/completions/{completion}/undo", null, Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.PostAsync($"/households/{home}/completions/{completion}/undo", null, Ct)).StatusCode);
    }

    private async Task<Guid> CompleteAgainAsync(HttpClient josep, Guid hid)
    {
        await using var db = Factory.CreateDbContext();
        var task = await db.Tasks.SingleAsync(t => t.Title == "Fregar suelo" && t.Room.Name == "Cocina", Ct);
        var body = await (await josep.PostAsJsonAsync($"/households/{hid}/tasks/{task.Id}/complete", new { subtasksDone = 0, minutes = 20 }, Ct)).Content.ReadFromJsonAsync<JsonElement>(Ct);
        return body.GetProperty("completionId").GetGuid();
    }
}

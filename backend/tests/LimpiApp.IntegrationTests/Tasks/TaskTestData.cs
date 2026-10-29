using System.Net.Http.Json;
using LimpiApp.Api.Data.Entities;
using LimpiApp.IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.IntegrationTests.Tasks;

/// <summary>A household with the kitchen template, Pau as a member and two products, like the prototype.</summary>
public sealed record TaskTestData(HttpClient Josep, Guid HouseholdId, Guid KitchenId, Guid NoZoneTaskId, Guid PauId, Guid MopId, Guid BleachId)
{
    public static async Task<TaskTestData> CreateAsync(ApiFactory factory)
    {
        var ct = TestContext.Current.CancellationToken;
        var josep = await factory.SignedInAsync();
        var hid = await ApiFactory.CreateHouseholdAsync(josep, "Casa Pau y Josep", "kitchen");
        await using var db = factory.CreateDbContext();
        var pau = new User { Email = "pau@example.com", Name = "Pau", AvatarColor = "violet", CreatedAt = ApiFactory.PrototypeNow };
        db.Memberships.Add(new Membership { User = pau, HouseholdId = hid, Role = MemberRole.Owner, JoinedAt = ApiFactory.PrototypeNow });
        var mop = new Product { HouseholdId = hid, Name = "Fregona", Emoji = "🪣" };
        var bleach = new Product { HouseholdId = hid, Name = "Lejía", Emoji = "🧪" };
        db.Products.AddRange(mop, bleach);
        await db.SaveChangesAsync(ct);
        var kitchen = await db.Rooms.SingleAsync(r => r.HouseholdId == hid, ct);
        var floor = await db.Tasks.SingleAsync(t => t.Title == "Fregar suelo", ct);
        return new TaskTestData(josep, hid, kitchen.Id, floor.Id, pau.Id, mop.Id, bleach.Id);
    }

    public object Request(string title = "Fregar suelo del office", Guid? assignee = null, string[]? subtasks = null, Guid[]? products = null, Guid? zone = null) => new
    {
        title,
        roomId = KitchenId,
        zoneId = zone,
        freqValue = 1,
        freqUnit = "week",
        nextDue = "2026-10-14",
        estimatedMinutes = 20,
        priority = "medium",
        assigneeId = assignee,
        notes = "Usar la fregona de microfibra azul.",
        subtasks = subtasks ?? ["Quitar sillas y objetos del suelo", "Barrer o aspirar", "Fregar con producto", "Repasar esquinas y rodapiés", "Aclarar la fregona y secar"],
        productIds = products ?? [MopId, BleachId],
    };

    public Task<HttpResponseMessage> PostAsync(object body) =>
        Josep.PostAsJsonAsync($"/households/{HouseholdId}/tasks", body, TestContext.Current.CancellationToken);
}

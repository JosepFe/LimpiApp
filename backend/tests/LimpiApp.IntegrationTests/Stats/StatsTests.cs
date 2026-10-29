using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.Api.Data.Entities;
using LimpiApp.IntegrationTests.Infrastructure;
using LimpiApp.IntegrationTests.Today;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.IntegrationTests.Stats;

public class StatsTests(ApiFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Stats_Last30Days_Overdue_RoomHealth_12IsoWeeks_AndThisWeeksShare()
    {
        // TodayTestData: Josep did 5 (3 pts, 10 min each) on days -1…-5; 3 tasks overdue.
        var (josep, hid, _, _) = await TodayTestData.CreateAsync(Factory);
        await using (var db = Factory.CreateDbContext())
        {
            var marta = new User { Email = "marta@example.com", Name = "Marta", AvatarColor = "amber", CreatedAt = ApiFactory.PrototypeNow };
            db.Memberships.Add(new Membership { User = marta, HouseholdId = hid, JoinedAt = ApiFactory.PrototypeNow });
            var task = await db.Tasks.FirstAsync(Ct);
            Completion Done(int daysAgo, int points, bool undone = false) => new()
            {
                HouseholdId = hid,
                TaskId = task.Id,
                User = marta,
                CompletedOn = TodayTestData.Today.AddDays(-daysAgo),
                CompletedAt = ApiFactory.PrototypeNow.AddDays(-daysAgo),
                Minutes = 20,
                Points = points,
                PrevNextDue = TodayTestData.Today,
                UndoneAt = undone ? ApiFactory.PrototypeNow : null,
            };
            db.Completions.AddRange(Done(0, 9), Done(1, 3), Done(40, 5), Done(0, 50, undone: true));
            await db.SaveChangesAsync(Ct);
        }

        var stats = await josep.GetFromJsonAsync<JsonElement>($"/households/{hid}/stats", Ct);

        Assert.Equal((7, 90, 3), (stats.GetProperty("completed").GetInt32(), stats.GetProperty("minutes").GetInt32(), stats.GetProperty("overdue").GetInt32()));
        Assert.Equal(["Cocina", "Baño"], stats.GetProperty("rooms").EnumerateArray().Select(r => r.GetProperty("name").GetString()));
        var weeks = stats.GetProperty("weeks").EnumerateArray().ToList();
        Assert.Equal(Enumerable.Range(31, 12), weeks.Select(w => w.GetProperty("week").GetInt32()));
        Assert.Equal((4, 3), (weeks[^1].GetProperty("count").GetInt32(), weeks[^2].GetProperty("count").GetInt32())); // week 42: Mon 12 - Wed 14; week 41
        Assert.Equal(1, weeks[5].GetProperty("count").GetInt32()); // week 36: 40 days ago
        // This week (Mon 12 - Wed 14): Josep 2 × 3 pts = 6, Marta 9 + 3 = 12 → 67 % / 33 %
        Assert.Equal([("Marta", 12, 67), ("Josep", 6, 33)], stats.GetProperty("share").EnumerateArray()
            .Select(s => (s.GetProperty("person").GetProperty("name").GetString(), s.GetProperty("points").GetInt32(), s.GetProperty("percent").GetInt32())));
    }

    [Fact]
    public async Task Stats_OfAnotherHousehold_Is404()
    {
        var (_, hid, _, _) = await TodayTestData.CreateAsync(Factory);
        var stranger = await Factory.SignedInAsync("intruso@example.com");

        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync($"/households/{hid}/stats", Ct)).StatusCode);
    }
}

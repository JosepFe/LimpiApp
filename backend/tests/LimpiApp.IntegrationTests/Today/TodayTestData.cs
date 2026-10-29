using LimpiApp.Api.Data.Entities;
using LimpiApp.IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.IntegrationTests.Today;

/// <summary>
/// Kitchen and bathroom templates with dates like the prototype's Hoy: 3 overdue, 3 today, some within 7 days and
/// some later; Josep did something on each of the 5 days before today (streak 5 once he does one today, 5 until then).
/// </summary>
public static class TodayTestData
{
    public static readonly DateOnly Today = new(2026, 10, 14);

    public static async Task<(HttpClient Josep, Guid HouseholdId, Guid JosepId, Guid BathroomId)> CreateAsync(ApiFactory factory)
    {
        var ct = TestContext.Current.CancellationToken;
        var josep = await factory.SignedInAsync();
        var hid = await ApiFactory.CreateHouseholdAsync(josep, "Casa Pau y Josep", "kitchen", "bathroom");
        await using var db = factory.CreateDbContext();
        var me = await db.Users.SingleAsync(ct);
        var dates = new Dictionary<string, (int Days, bool Mine)>
        {
            ["Limpiar horno"] = (-6, false),
            ["Limpiar nevera por dentro"] = (-3, true),
            ["Limpiar juntas y mamparas"] = (-2, false),
            ["Limpiar WC"] = (0, false),
            ["Fregar suelo"] = (0, true),
            ["Cambiar toallas"] = (0, false),
            ["Limpiar lavabo y espejo"] = (1, false),
            ["Limpiar fregadero"] = (2, true),
            ["Limpiar microondas"] = (7, false),
        };
        foreach (var t in await db.Tasks.Include(t => t.Room).ToListAsync(ct))
        {
            var key = t.Room.Name == "Baño" && t.Title == "Fregar suelo" ? "-" : t.Title;
            var (days, mine) = dates.TryGetValue(key, out var d) ? d : (20, false);
            t.NextDue = Today.AddDays(days);
            t.AssigneeId = mine ? me.Id : null;
        }

        var task = await db.Tasks.FirstAsync(ct);
        for (var i = 1; i <= 5; i++)
        {
            db.Completions.Add(new Completion
            {
                HouseholdId = hid,
                TaskId = task.Id,
                UserId = me.Id,
                CompletedOn = Today.AddDays(-i),
                CompletedAt = ApiFactory.PrototypeNow.AddDays(-i),
                Minutes = 10,
                Points = 3,
                PrevNextDue = Today,
            });
        }

        await db.SaveChangesAsync(ct);
        var bathroom = (await db.Rooms.SingleAsync(r => r.Name == "Baño", ct)).Id;
        return (josep, hid, me.Id, bathroom);
    }
}

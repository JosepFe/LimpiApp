using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.Api.Data.Entities;
using LimpiApp.IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.IntegrationTests.Households;

public class CreateHouseholdTests(ApiFactory factory) : IntegrationTest(factory)
{
    private static readonly string[] Prototype = ["kitchen", "bathroom", "bedroom", "living", "terrace"];

    [Fact]
    public async Task Create_WithFiveTemplates_MakesTheOwner_FiveRooms_And24SpreadTasks()
    {
        var browser = await Factory.SignedInAsync();

        var response = await browser.PostAsJsonAsync("/households", new { name = " Casa Pau y Josep ", timeZone = "Europe/Madrid", templates = Prototype }, Ct);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Ct);
        Assert.Equal("Casa Pau y Josep", body.GetProperty("name").GetString());
        Assert.Equal("owner", body.GetProperty("role").GetString());
        var id = body.GetProperty("id").GetGuid();

        await using var db = Factory.CreateDbContext();
        var membership = await db.Memberships.Include(m => m.User).SingleAsync(m => m.HouseholdId == id, Ct);
        Assert.Equal((MemberRole.Owner, "josep@example.com"), (membership.Role, membership.User.Email));
        var rooms = await db.Rooms.Where(r => r.HouseholdId == id).OrderBy(r => r.Position).Select(r => r.Name).ToListAsync(Ct);
        Assert.Equal(["Cocina", "Baño", "Dormitorio", "Salón", "Terraza"], rooms);
        var tasks = await db.Tasks.Where(t => t.HouseholdId == id).ToListAsync(Ct);
        Assert.Equal(24, tasks.Count);

        // Spread: never in the past, never further than the task's own period, and not all on the same day.
        var today = new DateOnly(2026, 10, 14);
        Assert.All(tasks, t => Assert.InRange(t.NextDue, today, today.AddDays(29)));
        Assert.True(tasks.Count(t => t.NextDue == today) < 8);
        var fridge = tasks.Single(t => t.Title == "Limpiar nevera por dentro");
        Assert.Equal("Nevera", (await db.Zones.SingleAsync(z => z.Id == fridge.ZoneId, Ct)).Name);
        Assert.Equal((1, FrequencyUnit.Month, 30), (fridge.FreqValue, fridge.FreqUnit, fridge.EstimatedMinutes));
    }

    [Theory]
    [InlineData("", "Europe/Madrid", "name")]
    [InlineData("   ", "Europe/Madrid", "name")]
    [InlineData("Casa", "Romance Standard Time", "timeZone")]
    [InlineData("Casa", "Mars/Olympus", "timeZone")]
    public async Task Create_WithAnEmptyNameOrANonIanaZone_Is400WithTheField(string name, string timeZone, string field)
    {
        var browser = await Factory.SignedInAsync();

        var response = await browser.PostAsJsonAsync("/households", new { name, timeZone, templates = Array.Empty<string>() }, Ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(Ct);
        Assert.Contains(problem.GetProperty("errors").EnumerateObject(), e => e.Name.Equals(field, StringComparison.OrdinalIgnoreCase));
        await using var db = Factory.CreateDbContext();
        Assert.Equal(0, await db.Households.CountAsync(Ct));
    }

    [Fact]
    public async Task Create_WithAnUnknownTemplate_Is400()
    {
        var browser = await Factory.SignedInAsync();

        var response = await browser.PostAsJsonAsync("/households", new { name = "Casa", timeZone = "Atlantic/Canary", templates = new[] { "garage" } }, Ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}

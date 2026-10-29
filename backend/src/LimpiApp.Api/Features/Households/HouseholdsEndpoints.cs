using System.ComponentModel.DataAnnotations;
using LimpiApp.Api.Common;
using LimpiApp.Api.Data;
using LimpiApp.Api.Data.Entities;
using LimpiApp.Api.Features.Auth;
using LimpiApp.Api.Features.Tasks;
using LimpiApp.Api.Features.Templates;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.Api.Features.Households;

/// <summary>Create a household (with template rooms and tasks) and read it (E02/US-005).</summary>
public static class HouseholdsEndpoints
{
    public sealed record CreateHouseholdRequest(
        [property: Required, MinLength(1), MaxLength(80)] string Name,
        [property: MaxLength(64)] string? TimeZone,
        [property: MaxLength(8)] IReadOnlyList<string>? Templates);

    public sealed record HouseholdResponse(Guid Id, string Name, string TimeZone, MemberRole Role, int MemberCount, int RoomCount);

    public static IEndpointRouteBuilder MapHouseholds(this IEndpointRouteBuilder app)
    {
        app.MapPost("/households", CreateAsync).RequireAuthorization();
        app.MapHouseholdGroup().MapGet("/", GetAsync);
        return app;
    }

    /// <summary>Only IANA ids (Europe/Madrid, Atlantic/Canary…), never Windows names.</summary>
    public static bool IsIanaTimeZone(string id) =>
        (id.Contains('/', StringComparison.Ordinal) || id == "UTC") && TimeZoneInfo.TryFindSystemTimeZoneById(id, out _);

    private static async Task<IResult> CreateAsync(CreateHouseholdRequest request, HttpContext http, AppDbContext db, Clock clock, CancellationToken ct)
    {
        var name = request.Name.Trim();
        var timeZone = string.IsNullOrWhiteSpace(request.TimeZone) ? "Europe/Madrid" : request.TimeZone.Trim();
        var errors = new Dictionary<string, string[]>();
        if (name.Length == 0)
        {
            errors["name"] = ["El nombre es obligatorio."];
        }

        if (!IsIanaTimeZone(timeZone))
        {
            errors["timeZone"] = ["Zona horaria desconocida."];
        }

        var templates = (request.Templates ?? []).Distinct().Select(id => (id, template: RoomTemplates.Find(id))).ToList();
        if (templates.Any(t => t.template is null))
        {
            errors["templates"] = ["Plantilla desconocida."];
        }

        if (errors.Count > 0)
        {
            return TypedResults.ValidationProblem(errors);
        }

        var now = clock.Now;
        var userId = http.User.UserId();
        var household = new Household { Name = name, TimeZone = timeZone, CreatedAt = now };
        db.Households.Add(household);
        db.Memberships.Add(new Membership { Household = household, UserId = userId, Role = MemberRole.Owner, JoinedAt = now });
        SeedRooms(db, household, templates.Select(t => t.template!), clock.Today(timeZone), now);
        await db.SaveChangesAsync(ct);

        return TypedResults.Created($"/households/{household.Id}",
            new HouseholdResponse(household.Id, household.Name, household.TimeZone, MemberRole.Owner, 1, templates.Count));
    }

    /// <summary>
    /// Rooms and suggested tasks of the chosen templates. First due dates are spread over each task's period
    /// (today + n mod period) so that the new household does not start with everything due today.
    /// </summary>
    public static void SeedRooms(AppDbContext db, Household household, IEnumerable<RoomTemplates.RoomTemplate> templates, DateOnly today, DateTimeOffset now)
    {
        var n = 0;
        var position = 0;
        foreach (var template in templates)
        {
            var room = new Room { Household = household, Name = template.Name, Emoji = template.Emoji, Color = template.Color, Position = position++ };
            room.Zones.AddRange(template.Zones.Select((z, i) => new Zone { Name = z, Position = i }));
            db.Rooms.Add(room);
            foreach (var t in template.Tasks)
            {
                db.Tasks.Add(new CleaningTask
                {
                    HouseholdId = household.Id,
                    Room = room,
                    ZoneId = t.Zone is null ? null : room.Zones.Single(z => z.Name == t.Zone).Id,
                    Title = t.Title,
                    FreqValue = t.Every,
                    FreqUnit = t.Unit,
                    EstimatedMinutes = t.Minutes,
                    NextDue = today.AddDays(n++ % DueRules.PeriodDays(t.Every, t.Unit)),
                    CreatedAt = now,
                });
            }
        }
    }

    private static async Task<IResult> GetAsync(HttpContext http, AppDbContext db, CancellationToken ct)
    {
        var membership = HouseholdAccess.Current(http);
        var id = membership.HouseholdId;
        var members = await db.Memberships.CountAsync(m => m.HouseholdId == id, ct);
        var rooms = await db.Rooms.CountAsync(r => r.HouseholdId == id && r.ArchivedAt == null, ct);
        return TypedResults.Ok(new HouseholdResponse(id, membership.Household.Name, membership.Household.TimeZone, membership.Role, members, rooms));
    }
}

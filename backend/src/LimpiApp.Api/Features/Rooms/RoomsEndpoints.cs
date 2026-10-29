using System.ComponentModel.DataAnnotations;
using LimpiApp.Api.Common;
using LimpiApp.Api.Data;
using LimpiApp.Api.Data.Entities;
using LimpiApp.Api.Features.Households;
using LimpiApp.Api.Features.Tasks;
using LimpiApp.Api.Features.Templates;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.Api.Features.Rooms;

/// <summary>Rooms with their zones, health and next task (E03/US-001). Archiving keeps the history (E03 D3).</summary>
public static class RoomsEndpoints
{
    /// <summary>Room colour keys of the prototype (`--rc-*`).</summary>
    public static readonly string[] Colors = ["green", "orange", "blue", "violet", "rose", "teal", "amber", "slate"];

    public sealed record ZoneDto(Guid? Id, [property: Required, MinLength(1), MaxLength(60)] string Name);

    public sealed record RoomRequest(
        [property: Required, MaxLength(60)] string Name,
        [property: Required, MaxLength(16)] string Emoji,
        [property: Required, MaxLength(20)] string Color,
        [property: MaxLength(20)] IReadOnlyList<ZoneDto>? Zones);

    public sealed record FromTemplateRequest(string? TemplateId);

    public sealed record HealthDto(int Value, string Label, string Level);

    public sealed record NextTaskDto(Guid Id, string Title, string When);

    public sealed record RoomDto(
        Guid Id, string Name, string Emoji, string Color, IReadOnlyList<ZoneDto> Zones,
        HealthDto? Health, int OverdueCount, int ActiveTaskCount, NextTaskDto? Next);

    public sealed record RoomsSummaryDto(HealthDto? Health, int RoomCount, int OverdueCount);

    public sealed record RoomsResponse(RoomsSummaryDto Summary, IReadOnlyList<RoomDto> Rooms);

    public static IEndpointRouteBuilder MapRooms(this IEndpointRouteBuilder app)
    {
        var rooms = app.MapHouseholdGroup("/rooms");
        rooms.MapGet("/", ListAsync);
        rooms.MapGet("/{id:guid}", GetAsync);
        rooms.MapPost("/", CreateAsync);
        rooms.MapPatch("/{id:guid}", UpdateAsync);
        rooms.MapDelete("/{id:guid}", ArchiveAsync);
        rooms.MapPost("/{id:guid}/from-template", FromTemplateAsync);
        return app;
    }

    private static async Task<IResult> ListAsync(HttpContext http, AppDbContext db, Clock clock, CancellationToken ct)
    {
        var household = HouseholdAccess.Current(http).Household;
        var rooms = await Summaries(db, household, clock.Today(household.TimeZone), null, ct);
        var health = HealthRules.Average(rooms.Where(r => r.Health is not null).Select(r => r.Health!.Value));
        return TypedResults.Ok(new RoomsResponse(new RoomsSummaryDto(ToDto(health), rooms.Count, rooms.Sum(r => r.OverdueCount)), rooms));
    }

    private static async Task<IResult> GetAsync(Guid id, HttpContext http, AppDbContext db, Clock clock, CancellationToken ct)
    {
        var household = HouseholdAccess.Current(http).Household;
        var room = (await Summaries(db, household, clock.Today(household.TimeZone), id, ct)).SingleOrDefault();
        return room is null ? TypedResults.NotFound() : TypedResults.Ok(room);
    }

    private static async Task<IResult> CreateAsync(RoomRequest request, HttpContext http, AppDbContext db, Clock clock, CancellationToken ct)
    {
        if (Validate(request) is { } problem)
        {
            return problem;
        }

        var household = HouseholdAccess.Current(http).Household;
        var position = await db.Rooms.Where(r => r.HouseholdId == household.Id).Select(r => (int?)r.Position).MaxAsync(ct) ?? -1;
        var room = new Room { HouseholdId = household.Id, Name = request.Name.Trim(), Emoji = request.Emoji, Color = request.Color, Position = position + 1 };
        room.Zones.AddRange((request.Zones ?? []).Select((z, i) => new Zone { Name = z.Name.Trim(), Position = i }));
        db.Rooms.Add(room);
        await db.SaveChangesAsync(ct);
        var dto = (await Summaries(db, household, clock.Today(household.TimeZone), room.Id, ct)).Single();
        return TypedResults.Created($"/households/{household.Id}/rooms/{room.Id}", dto);
    }

    private static async Task<IResult> UpdateAsync(Guid id, RoomRequest request, HttpContext http, AppDbContext db, Clock clock, CancellationToken ct)
    {
        if (Validate(request) is { } problem)
        {
            return problem;
        }

        var household = HouseholdAccess.Current(http).Household;
        var room = await db.Rooms.Include(r => r.Zones).SingleOrDefaultAsync(r => r.Id == id && r.HouseholdId == household.Id && r.ArchivedAt == null, ct);
        if (room is null)
        {
            return TypedResults.NotFound();
        }

        room.Name = request.Name.Trim();
        room.Emoji = request.Emoji;
        room.Color = request.Color;
        if (request.Zones is not null)
        {
            // The list is the whole new set: kept by id (renamed and reordered), new ones added, missing ones removed.
            // Tasks of a removed zone go to «Sin zona» (FK ON DELETE SET NULL).
            var wanted = request.Zones.Select((z, i) => (z, i)).ToList();
            var removed = room.Zones.Where(z => !wanted.Any(w => w.z.Id == z.Id)).ToList();
            await db.Tasks.Where(t => t.RoomId == room.Id && removed.Select(r => r.Id).Contains(t.ZoneId!.Value))
                .ExecuteUpdateAsync(t => t.SetProperty(x => x.ZoneId, (Guid?)null), ct);
            db.Zones.RemoveRange(removed);
            foreach (var (z, i) in wanted)
            {
                var zone = room.Zones.SingleOrDefault(x => z.Id is not null && x.Id == z.Id);
                if (zone is null)
                {
                    // Explicit Add: the id is set client-side, so EF would take a zone attached through the tracked
                    // room's collection for an existing row and UPDATE it.
                    db.Zones.Add(new Zone { RoomId = room.Id, Name = z.Name.Trim(), Position = i });
                }
                else
                {
                    zone.Name = z.Name.Trim();
                    zone.Position = i;
                }
            }
        }

        await db.SaveChangesAsync(ct);
        return TypedResults.Ok((await Summaries(db, household, clock.Today(household.TimeZone), room.Id, ct)).Single());
    }

    /// <summary>Archives the room and its tasks (EPIC A2): they leave Hoy, the history stays.</summary>
    private static async Task<IResult> ArchiveAsync(Guid id, HttpContext http, AppDbContext db, Clock clock, CancellationToken ct)
    {
        var householdId = HouseholdAccess.Current(http).HouseholdId;
        var now = clock.Now;
        var archived = await db.Rooms.Where(r => r.Id == id && r.HouseholdId == householdId && r.ArchivedAt == null)
            .ExecuteUpdateAsync(r => r.SetProperty(x => x.ArchivedAt, now), ct);
        if (archived == 0)
        {
            return TypedResults.NotFound();
        }

        await db.Tasks.Where(t => t.RoomId == id && t.ArchivedAt == null).ExecuteUpdateAsync(t => t.SetProperty(x => x.ArchivedAt, now), ct);
        return TypedResults.NoContent();
    }

    /// <summary>«Rellenar con tareas sugeridas»: the template's tasks whose title the room does not have yet.</summary>
    private static async Task<IResult> FromTemplateAsync(Guid id, FromTemplateRequest? request, HttpContext http, AppDbContext db, Clock clock, CancellationToken ct)
    {
        var household = HouseholdAccess.Current(http).Household;
        var room = await db.Rooms.Include(r => r.Zones).SingleOrDefaultAsync(r => r.Id == id && r.HouseholdId == household.Id && r.ArchivedAt == null, ct);
        if (room is null)
        {
            return TypedResults.NotFound();
        }

        var template = request?.TemplateId is { } templateId
            ? RoomTemplates.Find(templateId)
            : RoomTemplates.All.FirstOrDefault(t => string.Equals(t.Name, room.Name, StringComparison.OrdinalIgnoreCase));
        if (template is null)
        {
            return TypedResults.ValidationProblem(new Dictionary<string, string[]> { ["templateId"] = ["No hay plantilla para esta habitación."] });
        }

        var existing = (await db.Tasks.Where(t => t.RoomId == id && t.ArchivedAt == null).Select(t => t.Title).ToListAsync(ct))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var missing = template.Tasks.Where(t => !existing.Contains(t.Title)).ToList();
        foreach (var name in missing.Select(t => t.Zone).OfType<string>().Distinct().Where(z => room.Zones.All(x => x.Name != z)))
        {
            db.Zones.Add(new Zone { RoomId = room.Id, Name = name, Position = room.Zones.Count }); // explicit Add: see UpdateAsync
        }

        var today = clock.Today(household.TimeZone);
        var n = 0;
        foreach (var t in missing)
        {
            db.Tasks.Add(new CleaningTask
            {
                HouseholdId = household.Id,
                Room = room,
                Zone = t.Zone is null ? null : room.Zones.Single(z => z.Name == t.Zone),
                Title = t.Title,
                FreqValue = t.Every,
                FreqUnit = t.Unit,
                EstimatedMinutes = t.Minutes,
                NextDue = today.AddDays(n++ % DueRules.PeriodDays(t.Every, t.Unit)),
                CreatedAt = clock.Now,
            });
        }

        await db.SaveChangesAsync(ct);
        return TypedResults.Ok(new { Added = missing.Count });
    }

    private static Microsoft.AspNetCore.Http.HttpResults.ValidationProblem? Validate(RoomRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            errors["name"] = ["El nombre es obligatorio."];
        }

        if (!Colors.Contains(request.Color))
        {
            errors["color"] = ["Color desconocido."];
        }

        return errors.Count == 0 ? null : TypedResults.ValidationProblem(errors);
    }

    /// <summary>Health, overdue count and next upcoming task of the household's rooms (or of one).</summary>
    public static async Task<List<RoomDto>> Summaries(AppDbContext db, Household household, DateOnly today, Guid? onlyRoom, CancellationToken ct)
    {
        var rooms = await db.Rooms.AsNoTracking().Include(r => r.Zones)
            .Where(r => r.HouseholdId == household.Id && r.ArchivedAt == null && (onlyRoom == null || r.Id == onlyRoom))
            .OrderBy(r => r.Position).ToListAsync(ct);
        var roomIds = rooms.Select(r => r.Id).ToList();
        var tasks = await db.Tasks.AsNoTracking().Where(t => roomIds.Contains(t.RoomId) && t.ArchivedAt == null)
            .Select(t => new { t.Id, t.RoomId, t.Title, t.NextDue, t.FreqValue, t.FreqUnit }).ToListAsync(ct);

        return rooms.Select(room =>
        {
            var mine = tasks.Where(t => t.RoomId == room.Id).ToList();
            var health = HealthRules.Average(mine.Select(t => HealthRules.OfTask(t.NextDue, today, DueRules.PeriodDays(t.FreqValue, t.FreqUnit))));
            var next = mine.Where(t => t.NextDue >= today).OrderBy(t => t.NextDue).ThenBy(t => t.Title, StringComparer.Ordinal).FirstOrDefault();
            return new RoomDto(
                room.Id, room.Name, room.Emoji, room.Color,
                room.Zones.OrderBy(z => z.Position).Select(z => new ZoneDto(z.Id, z.Name)).ToList(),
                ToDto(health),
                mine.Count(t => t.NextDue < today),
                mine.Count,
                next is null ? null : new NextTaskDto(next.Id, next.Title, DueRules.Of(next.NextDue, today).Label));
        }).ToList();
    }

    public static HealthDto? ToDto(int? value) =>
        value is null ? null : HealthRules.Describe(value.Value) is var h ? new HealthDto(h.Value, h.Label, h.Level) : null;
}

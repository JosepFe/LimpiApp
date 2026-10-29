using System.ComponentModel.DataAnnotations;
using LimpiApp.Api.Common;
using LimpiApp.Api.Data;
using LimpiApp.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.Api.Features.Tasks;

/// <summary>Recurring tasks with subtasks and products (E03/US-003). Any member edits them (E03 D4).</summary>
public static class TasksEndpoints
{
    public const int MaxSubtasks = 20;

    public sealed record TaskRequest(
        [property: Required, MaxLength(120)] string Title,
        Guid RoomId,
        Guid? ZoneId,
        [property: Range(1, 365)] int FreqValue,
        FrequencyUnit FreqUnit,
        DateOnly NextDue,
        [property: Range(1, 600)] int EstimatedMinutes,
        Priority Priority,
        Guid? AssigneeId,
        [property: MaxLength(2000)] string? Notes,
        IReadOnlyList<string>? Subtasks,
        IReadOnlyList<Guid>? ProductIds);

    public sealed record RefDto(Guid Id, string Name);

    public sealed record PersonDto(Guid Id, string Name, string AvatarColor);

    public sealed record ProductRef(Guid Id, string Name, string Emoji);

    public sealed record DueDto(string Kind, string Label);

    public sealed record SubtaskDto(Guid Id, string Title);

    public sealed record TaskSummary(
        Guid Id, string Title, Guid RoomId, string RoomName, string RoomEmoji, RefDto? Zone,
        int EstimatedMinutes, DateOnly NextDue, DueDto Due, PersonDto? Assignee);

    /// <summary>One of «Últimas veces» (the 5 latest completions that were not undone).</summary>
    public sealed record DoneDto(DateTimeOffset At, PersonDto By, int Minutes, int Points);

    public sealed record TaskDetail(
        Guid Id, string Title, Guid RoomId, string RoomName, string RoomEmoji, RefDto? Zone,
        int FreqValue, FrequencyUnit FreqUnit, DateOnly NextDue, DueDto Due, int EstimatedMinutes, Priority Priority,
        PersonDto? Assignee, string? Notes, IReadOnlyList<SubtaskDto> Subtasks, IReadOnlyList<ProductRef> Products,
        DoneDto? LastDone, IReadOnlyList<DoneDto> History);

    public static IEndpointRouteBuilder MapTasks(this IEndpointRouteBuilder app)
    {
        var tasks = app.MapHouseholdGroup("/tasks");
        tasks.MapGet("/", ListAsync);
        tasks.MapGet("/{id:guid}", GetAsync);
        tasks.MapPost("/", CreateAsync);
        tasks.MapPatch("/{id:guid}", UpdateAsync);
        tasks.MapDelete("/{id:guid}", ArchiveAsync);
        return app;
    }

    private static async Task<IResult> ListAsync(Guid? room, HttpContext http, AppDbContext db, Clock clock, CancellationToken ct)
    {
        var household = HouseholdAccess.Current(http).Household;
        return TypedResults.Ok(await Summaries(db, household, clock.Today(household.TimeZone), room, ct));
    }

    /// <summary>The household's active tasks (of active rooms), by due date then priority (high first) and title.</summary>
    public static async Task<List<TaskSummary>> Summaries(AppDbContext db, Household household, DateOnly today, Guid? room, CancellationToken ct)
    {
        var rows = await db.Tasks.AsNoTracking()
            .Where(t => t.HouseholdId == household.Id && t.ArchivedAt == null && t.Room.ArchivedAt == null && (room == null || t.RoomId == room))
            .Select(t => new { Task = t, RoomName = t.Room.Name, RoomEmoji = t.Room.Emoji, Zone = t.Zone, })
            .ToListAsync(ct);
        // Ordered here: Priority is stored as text, so SQL would sort it alphabetically.
        rows = [.. rows.OrderBy(r => r.Task.NextDue).ThenByDescending(r => r.Task.Priority).ThenBy(r => r.Task.Title, StringComparer.Ordinal)];
        var people = await People(db, household.Id, ct);
        return rows.Select(r => new TaskSummary(
            r.Task.Id, r.Task.Title, r.Task.RoomId, r.RoomName, r.RoomEmoji, r.Zone is null ? null : new RefDto(r.Zone.Id, r.Zone.Name),
            r.Task.EstimatedMinutes, r.Task.NextDue, Due(r.Task.NextDue, today), Person(people, r.Task.AssigneeId))).ToList();
    }

    private static async Task<IResult> GetAsync(Guid id, HttpContext http, AppDbContext db, Clock clock, CancellationToken ct)
    {
        var household = HouseholdAccess.Current(http).Household;
        var detail = await Detail(db, household, clock.Today(household.TimeZone), id, ct);
        return detail is null ? TypedResults.NotFound() : TypedResults.Ok(detail);
    }

    private static async Task<IResult> CreateAsync(TaskRequest request, HttpContext http, AppDbContext db, Clock clock, CancellationToken ct)
    {
        var household = HouseholdAccess.Current(http).Household;
        var (errors, products) = await ValidateAsync(request, household.Id, [], db, ct);
        if (errors.Count > 0)
        {
            return TypedResults.ValidationProblem(errors);
        }

        var task = new CleaningTask { HouseholdId = household.Id, Title = request.Title.Trim(), CreatedAt = clock.Now };
        Apply(task, request, products);
        db.Tasks.Add(task);
        await db.SaveChangesAsync(ct);
        var detail = await Detail(db, household, clock.Today(household.TimeZone), task.Id, ct);
        return TypedResults.Created($"/households/{household.Id}/tasks/{task.Id}", detail);
    }

    private static async Task<IResult> UpdateAsync(Guid id, TaskRequest request, HttpContext http, AppDbContext db, Clock clock, CancellationToken ct)
    {
        var household = HouseholdAccess.Current(http).Household;
        var task = await db.Tasks.Include(t => t.Subtasks).Include(t => t.Products)
            .SingleOrDefaultAsync(t => t.Id == id && t.HouseholdId == household.Id && t.ArchivedAt == null, ct);
        if (task is null)
        {
            return TypedResults.NotFound();
        }

        // Products it already has stay valid even if archived since (E03 D3): only new ones must be active.
        var (errors, products) = await ValidateAsync(request, household.Id, task.Products.Select(p => p.Id).ToHashSet(), db, ct);
        if (errors.Count > 0)
        {
            return TypedResults.ValidationProblem(errors);
        }

        db.Subtasks.RemoveRange(task.Subtasks); // the list is replaced as a whole, in its new order
        task.Subtasks.Clear();
        Apply(task, request, products);
        foreach (var subtask in task.Subtasks)
        {
            db.Subtasks.Add(subtask); // explicit Add: client-side ids (see RoomsEndpoints.UpdateAsync)
        }

        await db.SaveChangesAsync(ct);
        return TypedResults.Ok(await Detail(db, household, clock.Today(household.TimeZone), id, ct));
    }

    private static async Task<IResult> ArchiveAsync(Guid id, HttpContext http, AppDbContext db, Clock clock, CancellationToken ct)
    {
        var householdId = HouseholdAccess.Current(http).HouseholdId;
        var now = clock.Now;
        var archived = await db.Tasks.Where(t => t.Id == id && t.HouseholdId == householdId && t.ArchivedAt == null)
            .ExecuteUpdateAsync(t => t.SetProperty(x => x.ArchivedAt, now), ct);
        return archived == 0 ? TypedResults.NotFound() : TypedResults.NoContent();
    }

    private static void Apply(CleaningTask task, TaskRequest r, List<Product> products)
    {
        task.Title = r.Title.Trim();
        task.RoomId = r.RoomId;
        task.ZoneId = r.ZoneId;
        task.FreqValue = r.FreqValue;
        task.FreqUnit = r.FreqUnit;
        task.NextDue = r.NextDue;
        task.EstimatedMinutes = r.EstimatedMinutes;
        task.Priority = r.Priority;
        task.AssigneeId = r.AssigneeId;
        task.Notes = string.IsNullOrWhiteSpace(r.Notes) ? null : r.Notes.Trim();
        task.Subtasks.AddRange((r.Subtasks ?? []).Select(s => s.Trim()).Where(s => s.Length > 0)
            .Select((s, i) => new Subtask { TaskId = task.Id, Title = s, Position = i }));
        task.Products.Clear();
        task.Products.AddRange(products);
    }

    private static async Task<(Dictionary<string, string[]> Errors, List<Product> Products)> ValidateAsync(
        TaskRequest r, Guid householdId, HashSet<Guid> alreadyLinked, AppDbContext db, CancellationToken ct)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(r.Title))
        {
            errors["title"] = ["El título es obligatorio."];
        }

        if (r.FreqValue < 1)
        {
            errors["freqValue"] = ["La frecuencia tiene que ser al menos 1."];
        }

        if ((r.Subtasks?.Count ?? 0) > MaxSubtasks)
        {
            errors["subtasks"] = [$"Como mucho {MaxSubtasks} subtareas."];
        }
        else if ((r.Subtasks ?? []).Any(s => s.Length > 120))
        {
            errors["subtasks"] = ["Cada subtarea, como mucho 120 caracteres."];
        }

        if (!await db.Rooms.AnyAsync(x => x.Id == r.RoomId && x.HouseholdId == householdId && x.ArchivedAt == null, ct))
        {
            errors["roomId"] = ["Habitación desconocida."];
        }
        else if (r.ZoneId is { } zone && !await db.Zones.AnyAsync(z => z.Id == zone && z.RoomId == r.RoomId, ct))
        {
            errors["zoneId"] = ["La zona no es de esta habitación."];
        }

        if (r.AssigneeId is { } who && !await db.Memberships.AnyAsync(m => m.HouseholdId == householdId && m.UserId == who, ct))
        {
            errors["assigneeId"] = ["No es miembro del hogar."];
        }

        var ids = (r.ProductIds ?? []).Distinct().ToList();
        var products = await db.Products
            .Where(p => ids.Contains(p.Id) && p.HouseholdId == householdId && (p.ArchivedAt == null || alreadyLinked.Contains(p.Id)))
            .ToListAsync(ct);
        if (products.Count != ids.Count)
        {
            errors["productIds"] = ["Producto desconocido."];
        }

        return (errors, products);
    }

    public static async Task<TaskDetail?> Detail(AppDbContext db, Household household, DateOnly today, Guid id, CancellationToken ct)
    {
        var t = await db.Tasks.AsNoTracking().Include(x => x.Room).Include(x => x.Zone).Include(x => x.Subtasks).Include(x => x.Products)
            .SingleOrDefaultAsync(x => x.Id == id && x.HouseholdId == household.Id && x.ArchivedAt == null, ct);
        if (t is null)
        {
            return null;
        }

        var people = await People(db, household.Id, ct);
        var history = await db.Completions.AsNoTracking()
            .Where(c => c.TaskId == id && c.UndoneAt == null)
            .OrderByDescending(c => c.CompletedAt).Take(5)
            .Select(c => new { c.CompletedAt, c.UserId, c.User.Name, c.User.AvatarColor, c.Minutes, c.Points })
            .ToListAsync(ct);
        var done = history.Select(c => new DoneDto(c.CompletedAt, new PersonDto(c.UserId, c.Name, c.AvatarColor), c.Minutes, c.Points)).ToList();
        return new TaskDetail(
            t.Id, t.Title, t.RoomId, t.Room.Name, t.Room.Emoji, t.Zone is null ? null : new RefDto(t.Zone.Id, t.Zone.Name),
            t.FreqValue, t.FreqUnit, t.NextDue, Due(t.NextDue, today), t.EstimatedMinutes, t.Priority,
            Person(people, t.AssigneeId), t.Notes,
            t.Subtasks.OrderBy(s => s.Position).Select(s => new SubtaskDto(s.Id, s.Title)).ToList(),
            t.Products.OrderBy(p => p.Name, StringComparer.Ordinal).Select(p => new ProductRef(p.Id, p.Name, p.Emoji)).ToList(),
            done.FirstOrDefault(), done);
    }

    public static DueDto Due(DateOnly nextDue, DateOnly today)
    {
        var due = DueRules.Of(nextDue, today);
        return new DueDto(due.Kind.ToString().ToLowerInvariant(), due.Label);
    }

    public static async Task<Dictionary<Guid, PersonDto>> People(AppDbContext db, Guid householdId, CancellationToken ct) =>
        await db.Memberships.Where(m => m.HouseholdId == householdId)
            .Select(m => new PersonDto(m.UserId, m.User.Name, m.User.AvatarColor))
            .ToDictionaryAsync(p => p.Id, ct);

    public static PersonDto? Person(Dictionary<Guid, PersonDto> people, Guid? id) =>
        id is { } key && people.TryGetValue(key, out var person) ? person : null;
}

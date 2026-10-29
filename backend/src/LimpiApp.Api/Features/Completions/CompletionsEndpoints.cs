using System.ComponentModel.DataAnnotations;
using LimpiApp.Api.Common;
using LimpiApp.Api.Data;
using LimpiApp.Api.Data.Entities;
using LimpiApp.Api.Features.Auth;
using LimpiApp.Api.Features.Tasks;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.Api.Features.Completions;

/// <summary>Marking a task as done (E04/US-004): points, my new streak and when it is due next.</summary>
public static class CompletionsEndpoints
{
    public sealed record CompleteRequest([property: Range(0, 20)] int SubtasksDone, [property: Range(1, 600)] int Minutes, [property: MaxLength(1000)] string? Note);

    public sealed record CompleteResponse(Guid CompletionId, int Points, int Streak, DateOnly NextDue, string NextDueDay);

    public static IEndpointRouteBuilder MapCompletions(this IEndpointRouteBuilder app)
    {
        app.MapHouseholdGroup("/tasks").MapPost("/{id:guid}/complete", CompleteAsync);
        return app;
    }

    private static async Task<IResult> CompleteAsync(Guid id, CompleteRequest request, HttpContext http, AppDbContext db, Clock clock, CancellationToken ct)
    {
        var household = HouseholdAccess.Current(http).Household;
        var userId = http.User.UserId();
        var task = await db.Tasks.Include(t => t.Subtasks)
            .SingleOrDefaultAsync(t => t.Id == id && t.HouseholdId == household.Id && t.ArchivedAt == null && t.Room.ArchivedAt == null, ct);
        if (task is null)
        {
            return TypedResults.NotFound();
        }

        var total = task.Subtasks.Count;
        if (request.SubtasksDone > total)
        {
            return TypedResults.ValidationProblem(new Dictionary<string, string[]> { ["subtasksDone"] = ["Más subtareas hechas que las que tiene."] });
        }

        var today = clock.Today(household.TimeZone);
        var completion = new Completion
        {
            HouseholdId = household.Id,
            TaskId = task.Id,
            UserId = userId,
            CompletedOn = today,
            CompletedAt = clock.Now,
            Minutes = request.Minutes,
            Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
            SubtasksDone = request.SubtasksDone,
            SubtasksTotal = total,
            Points = PointsRules.Earned(task.EstimatedMinutes, request.SubtasksDone, total),
            PrevNextDue = task.NextDue,
        };
        db.Completions.Add(completion);
        task.NextDue = DueRules.Next(today, task.FreqValue, task.FreqUnit); // counted from the day it is done (E04 A2)
        await db.SaveChangesAsync(ct);

        var streak = await StreakAsync(db, household.Id, userId, today, ct);
        return TypedResults.Created($"/households/{household.Id}/completions/{completion.Id}",
            new CompleteResponse(completion.Id, completion.Points, streak, task.NextDue, ShortDay(task.NextDue)));
    }

    public static async Task<int> StreakAsync(AppDbContext db, Guid householdId, Guid userId, DateOnly today, CancellationToken ct)
    {
        var since = today.AddDays(-400);
        var days = await db.Completions
            .Where(c => c.HouseholdId == householdId && c.UserId == userId && c.UndoneAt == null && c.CompletedOn >= since)
            .Select(c => c.CompletedOn).Distinct().ToListAsync(ct);
        return StreakRules.Count(days, today);
    }

    private static readonly string[] Weekdays = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
    private static readonly string[] Months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

    /// <summary>«mié 21 oct», for «Próxima vez: mié 21 oct».</summary>
    public static string ShortDay(DateOnly day) => $"{Weekdays[(int)day.DayOfWeek]} {day.Day} {Months[day.Month - 1]}";
}

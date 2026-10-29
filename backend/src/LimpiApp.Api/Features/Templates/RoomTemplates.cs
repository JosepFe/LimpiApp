using System.Text.Json;
using System.Text.Json.Serialization;
using LimpiApp.Api.Data.Entities;

namespace LimpiApp.Api.Features.Templates;

/// <summary>The 8 room templates of the onboarding with their suggested tasks (static data, not tables).</summary>
public static class RoomTemplates
{
    public sealed record TaskTemplate(string Title, int Every, FrequencyUnit Unit, int Minutes, string? Zone);

    public sealed record RoomTemplate(string Id, string Name, string Emoji, string Color, IReadOnlyList<string> Zones, IReadOnlyList<TaskTemplate> Tasks);

    // Declared before All: static fields initialise in order.
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };

    public static IReadOnlyList<RoomTemplate> All { get; } = Load();

    public static RoomTemplate? Find(string id) => All.FirstOrDefault(t => t.Id == id);

    /// <summary>Approximate length of a frequency in days, to spread the first due dates.</summary>
    public static int PeriodDays(int every, FrequencyUnit unit) => every * unit switch
    {
        FrequencyUnit.Day => 1,
        FrequencyUnit.Week => 7,
        _ => 30,
    };

    public static IEndpointRouteBuilder MapTemplates(this IEndpointRouteBuilder app)
    {
        app.MapGet("/templates", () => TypedResults.Ok(All.Select(t => new { t.Id, t.Name, t.Emoji, t.Color, TaskCount = t.Tasks.Count })))
            .RequireAuthorization();
        return app;
    }

    private static List<RoomTemplate> Load()
    {
        using var stream = typeof(RoomTemplates).Assembly.GetManifestResourceStream("LimpiApp.Api.Features.Templates.templates.json")
            ?? throw new InvalidOperationException("templates.json is not embedded.");
        return JsonSerializer.Deserialize<List<RoomTemplate>>(stream, JsonOptions) ?? [];
    }
}

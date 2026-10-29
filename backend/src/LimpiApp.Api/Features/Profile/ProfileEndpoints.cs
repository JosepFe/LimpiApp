using System.ComponentModel.DataAnnotations;
using LimpiApp.Api.Common;
using LimpiApp.Api.Data;
using LimpiApp.Api.Data.Entities;
using LimpiApp.Api.Features.Auth;
using LimpiApp.Api.Features.Households;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.Api.Features.Profile;

/// <summary>Settings (E07/US-001): my name, avatar colour and theme; the household's name and time zone (owners, D2).</summary>
public static class ProfileEndpoints
{
    /// <summary>The prototype's avatar colours (`--av-*`).</summary>
    public static readonly IReadOnlySet<string> AvatarColors = new HashSet<string>(StringComparer.Ordinal) { "teal", "violet", "amber", "rose", "blue", "green" };

    /// <summary>Only the fields sent change.</summary>
    public sealed record ProfileRequest([property: MaxLength(80)] string? Name, [property: MaxLength(20)] string? AvatarColor, Theme? Theme);

    public sealed record ProfileResponse(Guid Id, string Email, string Name, string AvatarColor, Theme Theme);

    public sealed record HouseholdSettingsRequest([property: MaxLength(80)] string? Name, [property: MaxLength(64)] string? TimeZone);

    public sealed record HouseholdSettingsResponse(Guid Id, string Name, string TimeZone);

    public static IEndpointRouteBuilder MapProfile(this IEndpointRouteBuilder app)
    {
        app.MapPatch("/me", UpdateMeAsync).RequireAuthorization();
        app.MapHouseholdGroup().MapPatch("/", UpdateHouseholdAsync);
        return app;
    }

    private static async Task<IResult> UpdateMeAsync(ProfileRequest request, HttpContext http, AppDbContext db, CancellationToken ct)
    {
        var errors = new Dictionary<string, string[]>();
        var name = request.Name?.Trim();
        if (name is { Length: 0 })
        {
            errors["name"] = ["El nombre es obligatorio."];
        }

        if (request.AvatarColor is { } color && !AvatarColors.Contains(color))
        {
            errors["avatarColor"] = ["Color desconocido."];
        }

        if (request.Theme is { } theme && !Enum.IsDefined(theme))
        {
            errors["theme"] = ["Tema desconocido."];
        }

        if (errors.Count > 0)
        {
            return TypedResults.ValidationProblem(errors);
        }

        var userId = http.User.UserId();
        var user = await db.Users.SingleAsync(u => u.Id == userId, ct);
        user.Name = name ?? user.Name;
        user.AvatarColor = request.AvatarColor ?? user.AvatarColor;
        user.Theme = request.Theme ?? user.Theme;
        await db.SaveChangesAsync(ct);
        return TypedResults.Ok(new ProfileResponse(user.Id, user.Email, user.Name, user.AvatarColor, user.Theme));
    }

    private static async Task<IResult> UpdateHouseholdAsync(HouseholdSettingsRequest request, HttpContext http, AppDbContext db, CancellationToken ct)
    {
        var me = HouseholdAccess.Current(http);
        if (me.Role != MemberRole.Owner)
        {
            return TypedResults.Problem("Solo los propietarios pueden cambiar los datos del hogar.", statusCode: StatusCodes.Status403Forbidden);
        }

        var errors = new Dictionary<string, string[]>();
        var name = request.Name?.Trim();
        var timeZone = request.TimeZone?.Trim();
        if (name is { Length: 0 })
        {
            errors["name"] = ["El nombre es obligatorio."];
        }

        if (timeZone is not null && !HouseholdsEndpoints.IsIanaTimeZone(timeZone))
        {
            errors["timeZone"] = ["Zona horaria desconocida."];
        }

        if (errors.Count > 0)
        {
            return TypedResults.ValidationProblem(errors);
        }

        var household = await db.Households.SingleAsync(h => h.Id == me.HouseholdId, ct);
        household.Name = name ?? household.Name;
        household.TimeZone = timeZone ?? household.TimeZone;
        await db.SaveChangesAsync(ct);
        return TypedResults.Ok(new HouseholdSettingsResponse(household.Id, household.Name, household.TimeZone));
    }
}

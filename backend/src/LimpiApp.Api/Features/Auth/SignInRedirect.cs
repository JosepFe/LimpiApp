using LimpiApp.Api.Data;
using LimpiApp.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.Api.Features.Auth;

/// <summary>Finds or creates the user of a verified email, and where to send them after signing in.</summary>
public static class SignInRedirect
{
    public static bool IsLocal(string? url) =>
        !string.IsNullOrEmpty(url) && url.StartsWith('/') && !url.StartsWith("//", StringComparison.Ordinal) && !url.StartsWith("/\\", StringComparison.Ordinal);

    public static async Task<string> TargetAsync(AppDbContext db, Guid userId, string? returnUrl, CancellationToken ct)
    {
        if (IsLocal(returnUrl))
        {
            return returnUrl!;
        }

        return await db.Memberships.AnyAsync(m => m.UserId == userId, ct) ? "/today" : "/onboarding";
    }

    public static async Task<User> FindOrCreateUserAsync(AppDbContext db, string email, string? name, DateTimeOffset now, CancellationToken ct)
    {
        var normalized = email.Trim().ToLowerInvariant();
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == normalized, ct);
        if (user is not null)
        {
            return user;
        }

        user = new User { Email = normalized, Name = string.IsNullOrWhiteSpace(name) ? NameFromEmail(normalized) : name.Trim(), CreatedAt = now };
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);
        return user;
    }

    /// <summary>"josep.fe@example.com" → "Josep.fe": a first name the user can change in Ajustes.</summary>
    public static string NameFromEmail(string email)
    {
        var local = email.Split('@')[0];
        return local.Length == 0 ? "Yo" : char.ToUpperInvariant(local[0]) + local[1..];
    }
}

using System.Security.Claims;
using System.Text.Encodings.Web;
using LimpiApp.Api.Common;
using LimpiApp.Api.Data;
using LimpiApp.Api.Data.Entities;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace LimpiApp.Api.Features.Auth;

/// <summary>Our own session: an opaque token in the `la_session` cookie, its hash in `sessions` (E02 D4).</summary>
public static class SessionCookie
{
    public const string Scheme = "Session";
    public const string Name = "la_session";
    public static readonly TimeSpan Lifetime = TimeSpan.FromDays(30);

    /// <summary>Sliding expiry: extended at most once a day, so not every request writes.</summary>
    public static readonly TimeSpan RenewAfter = TimeSpan.FromDays(1);

    public static void Write(HttpResponse response, string token, DateTimeOffset expires) =>
        response.Cookies.Append(Name, token, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax, // Lax: the emailed link and Google's redirect must carry it
            Path = "/",
            Expires = expires,
            IsEssential = true,
        });

    public static void Delete(HttpResponse response) =>
        response.Cookies.Delete(Name, new CookieOptions { Secure = true, SameSite = SameSiteMode.Lax, Path = "/" });

    public static Guid UserId(this ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new InvalidOperationException("Not signed in."));
}

/// <summary>Opens and closes sessions.</summary>
public sealed class SessionService(AppDbContext db, Clock clock)
{
    public async Task SignInAsync(HttpContext http, User user, CancellationToken ct)
    {
        var token = Tokens.New();
        var now = clock.Now;
        var expires = now + SessionCookie.Lifetime;
        db.Sessions.Add(new Session
        {
            TokenHash = Tokens.Hash(token),
            UserId = user.Id,
            ExpiresAt = expires,
            UserAgent = Truncate(http.Request.Headers.UserAgent.ToString(), 512),
            CreatedAt = now,
        });
        await db.SaveChangesAsync(ct);
        SessionCookie.Write(http.Response, token, expires);
    }

    public async Task SignOutAsync(HttpContext http, CancellationToken ct)
    {
        if (http.Request.Cookies.TryGetValue(SessionCookie.Name, out var token))
        {
            var hash = Tokens.Hash(token);
            await db.Sessions.Where(s => s.TokenHash == hash).ExecuteDeleteAsync(ct);
        }

        SessionCookie.Delete(http.Response);
    }

    private static string? Truncate(string value, int max) =>
        string.IsNullOrEmpty(value) ? null : value.Length <= max ? value : value[..max];
}

public sealed class SessionAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    AppDbContext db,
    Clock clock) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Cookies.TryGetValue(SessionCookie.Name, out var token) || string.IsNullOrEmpty(token))
        {
            return AuthenticateResult.NoResult();
        }

        var hash = Tokens.Hash(token);
        var now = clock.Now;
        var session = await db.Sessions.SingleOrDefaultAsync(s => s.TokenHash == hash, Context.RequestAborted);
        if (session is null || session.ExpiresAt <= now)
        {
            return AuthenticateResult.Fail("Session expired or unknown.");
        }

        if (session.ExpiresAt - now < SessionCookie.Lifetime - SessionCookie.RenewAfter)
        {
            session.ExpiresAt = now + SessionCookie.Lifetime;
            await db.SaveChangesAsync(Context.RequestAborted);
            SessionCookie.Write(Response, token, session.ExpiresAt);
        }

        var identity = new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, session.UserId.ToString())], SessionCookie.Scheme);
        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), SessionCookie.Scheme));
    }

    protected override Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    }
}

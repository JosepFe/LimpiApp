using System.Security.Claims;
using LimpiApp.Api.Common;
using LimpiApp.Api.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.Api.Features.Auth;

/// <summary>
/// «Continuar con Google» (E02/US-003): Google's OIDC handler only does the round trip and leaves the result in a
/// short-lived `external` cookie; /auth/google/complete turns it into our own session.
/// </summary>
public static class GoogleEndpoints
{
    public const string ExternalScheme = "external";
    public const string EmailVerifiedClaim = "email_verified";
    private const string Failed = "/login?error=google";
    private const string ReturnKey = "return";

    public static AuthenticationBuilder AddGoogleSignIn(this AuthenticationBuilder auth, IConfiguration config)
    {
        auth.AddCookie(ExternalScheme, o =>
        {
            o.Cookie.Name = "la_external";
            o.Cookie.SameSite = SameSiteMode.Lax;
            o.Cookie.SecurePolicy = CookieSecurePolicy.Always;
            o.ExpireTimeSpan = TimeSpan.FromMinutes(10);
        });

        var clientId = config["GOOGLE_CLIENT_ID"];
        if (string.IsNullOrWhiteSpace(clientId))
        {
            return auth; // not configured (local without a Google client): the button answers with the error
        }

        return auth.AddGoogle(o =>
        {
            o.ClientId = clientId;
            o.ClientSecret = config["GOOGLE_CLIENT_SECRET"] ?? string.Empty;
            o.SignInScheme = ExternalScheme;
            o.CallbackPath = "/auth/google/callback";
            o.ClaimActions.MapJsonKey(EmailVerifiedClaim, "verified_email");
            o.Events.OnRemoteFailure = ctx =>
            {
                ctx.Response.Redirect(Failed); // cancelled or refused at Google
                ctx.HandleResponse();
                return Task.CompletedTask;
            };
        });
    }

    public static IEndpointRouteBuilder MapGoogleSignIn(this IEndpointRouteBuilder app)
    {
        var google = app.MapGroup("/auth/google").AllowAnonymous();
        google.MapGet("/", StartAsync);
        google.MapGet("/complete", CompleteAsync);
        return app;
    }

    private static async Task<IResult> StartAsync(string? @return, HttpContext http, IAuthenticationSchemeProvider schemes)
    {
        if (await schemes.GetSchemeAsync(GoogleDefaults.AuthenticationScheme) is null)
        {
            return TypedResults.Redirect(Failed);
        }

        var properties = new AuthenticationProperties { RedirectUri = $"{http.Request.PathBase}/auth/google/complete" };
        if (SignInRedirect.IsLocal(@return))
        {
            properties.Items[ReturnKey] = @return;
        }

        return TypedResults.Challenge(properties, [GoogleDefaults.AuthenticationScheme]);
    }

    private static async Task<IResult> CompleteAsync(HttpContext http, AppDbContext db, Clock clock, SessionService sessions, CancellationToken ct)
    {
        var result = await http.AuthenticateAsync(ExternalScheme);
        await http.SignOutAsync(ExternalScheme);
        var principal = result.Principal;
        var sub = principal?.FindFirstValue(ClaimTypes.NameIdentifier);
        var email = principal?.FindFirstValue(ClaimTypes.Email);
        var verified = string.Equals(principal?.FindFirstValue(EmailVerifiedClaim), "true", StringComparison.OrdinalIgnoreCase);
        if (!result.Succeeded || string.IsNullOrEmpty(sub) || string.IsNullOrEmpty(email) || !verified)
        {
            return TypedResults.Redirect(Failed);
        }

        var now = clock.Now;
        // Same person whether they came by the emailed link or by Google: matched by sub, else by verified email.
        var user = await db.Users.SingleOrDefaultAsync(u => u.GoogleSub == sub, ct)
            ?? await SignInRedirect.FindOrCreateUserAsync(db, email, principal!.FindFirstValue(ClaimTypes.GivenName) ?? principal!.FindFirstValue(ClaimTypes.Name), now, ct);
        if (user.GoogleSub is null)
        {
            user.GoogleSub = sub;
            await db.SaveChangesAsync(ct);
        }

        await sessions.SignInAsync(http, user, ct);
        result.Properties!.Items.TryGetValue(ReturnKey, out var returnUrl);
        return TypedResults.Redirect(await SignInRedirect.TargetAsync(db, user.Id, returnUrl, ct));
    }
}

using System.ComponentModel.DataAnnotations;
using LimpiApp.Api.Common;
using LimpiApp.Api.Common.Email;
using LimpiApp.Api.Data;
using LimpiApp.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.Api.Features.Auth;

/// <summary>Sign in without a password: an emailed link, valid 15 minutes and once (E02 D3).</summary>
public static partial class MagicLinkEndpoints
{
    public static readonly TimeSpan Validity = TimeSpan.FromMinutes(15);
    public const int MaxPerWindow = 5;

    public sealed record MagicLinkRequest(
        [property: Required, EmailAddress, MaxLength(320)] string Email,
        [property: MaxLength(512)] string? ReturnUrl);

    public static IEndpointRouteBuilder MapMagicLink(this IEndpointRouteBuilder app)
    {
        var auth = app.MapGroup("/auth").AllowAnonymous();
        auth.MapPost("/magic-link", RequestAsync);
        auth.MapGet("/magic", RedeemAsync);
        return app;
    }

    private static async Task<IResult> RequestAsync(
        MagicLinkRequest request, AppDbContext db, Clock clock, IEmailSender email, IConfiguration config,
        ILoggerFactory loggers, CancellationToken ct)
    {
        var address = request.Email.Trim().ToLowerInvariant();
        var now = clock.Now;
        // Always 202: the answer never tells whether the email exists or was rate-limited.
        var recent = await db.MagicLinks.CountAsync(m => m.Email == address && m.CreatedAt > now - Validity, ct);
        if (recent >= MaxPerWindow)
        {
            return TypedResults.Accepted((string?)null);
        }

        var token = Tokens.New();
        db.MagicLinks.Add(new MagicLink
        {
            Email = address,
            TokenHash = Tokens.Hash(token),
            ExpiresAt = now + Validity,
            ReturnUrl = SignInRedirect.IsLocal(request.ReturnUrl) ? request.ReturnUrl : null,
            CreatedAt = now,
        });
        await db.SaveChangesAsync(ct);

        var link = $"{PublicUrl(config)}/api/auth/magic?token={token}";
        try
        {
            await email.SendAsync(new EmailMessage(address, "Tu enlace para entrar en LimpiApp",
                $"Hola:\n\nPulsa este enlace para entrar en LimpiApp:\n\n{link}\n\nCaduca en 15 minutos y solo sirve una vez. " +
                "Si no lo has pedido tú, ignora este correo.\n\nLimpiApp · La casa limpia, entre todos.\n"), ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            LogSendFailed(loggers.CreateLogger(typeof(MagicLinkEndpoints)), ex);
            return TypedResults.Problem("No hemos podido enviar el correo.", statusCode: StatusCodes.Status503ServiceUnavailable);
        }

        return TypedResults.Accepted((string?)null);
    }

    private static async Task<IResult> RedeemAsync(
        string? token, HttpContext http, AppDbContext db, Clock clock, SessionService sessions, CancellationToken ct)
    {
        const string Failed = "/login?error=link";
        if (string.IsNullOrEmpty(token))
        {
            return TypedResults.Redirect(Failed);
        }

        var hash = Tokens.Hash(token);
        var now = clock.Now;
        // Claimed atomically: of two requests with the same link at the same moment, only one gets a session.
        var claimed = await db.MagicLinks
            .Where(m => m.TokenHash == hash && m.UsedAt == null && m.ExpiresAt > now)
            .ExecuteUpdateAsync(m => m.SetProperty(x => x.UsedAt, now), ct);
        if (claimed != 1)
        {
            return TypedResults.Redirect(Failed);
        }

        var link = await db.MagicLinks.AsNoTracking().SingleAsync(m => m.TokenHash == hash, ct);
        var user = await SignInRedirect.FindOrCreateUserAsync(db, link.Email, null, now, ct);
        await sessions.SignInAsync(http, user, ct);
        return TypedResults.Redirect(await SignInRedirect.TargetAsync(db, user.Id, link.ReturnUrl, ct));
    }

    [LoggerMessage(Level = LogLevel.Error, Message = "Could not send the magic link email")]
    private static partial void LogSendFailed(ILogger logger, Exception ex);

    public static string PublicUrl(IConfiguration config) => (config["PUBLIC_URL"] ?? "http://127.0.0.1:8090").TrimEnd('/');
}

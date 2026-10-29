using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace LimpiApp.Api.Common.Email;

public sealed record EmailMessage(string To, string Subject, string TextBody);

public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken ct);
}

/// <summary>SMTP settings: Mailpit in development, Gmail with an app password in production (E02 D2).</summary>
public sealed class SmtpSettings
{
    public string Host { get; init; } = "localhost";

    public int Port { get; init; } = 1025;

    public string? User { get; init; }

    public string? Password { get; init; }

    public string From { get; init; } = "LimpiApp <limpiapp@localhost>";

    public static SmtpSettings FromConfiguration(IConfiguration config) => new()
    {
        Host = NonEmpty(config["SMTP_HOST"]) ?? "localhost",
        Port = int.TryParse(config["SMTP_PORT"], out var port) ? port : 1025,
        User = NonEmpty(config["SMTP_USER"]),
        Password = NonEmpty(config["SMTP_PASSWORD"]),
        From = NonEmpty(config["MAIL_FROM"]) ?? "LimpiApp <limpiapp@localhost>",
    };

    private static string? NonEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value;
}

public sealed class SmtpEmailSender(SmtpSettings settings) : IEmailSender
{
    public async Task SendAsync(EmailMessage message, CancellationToken ct)
    {
        var mime = new MimeMessage();
        mime.From.Add(MailboxAddress.Parse(settings.From));
        mime.To.Add(MailboxAddress.Parse(message.To));
        mime.Subject = message.Subject;
        mime.Body = new TextPart("plain") { Text = message.TextBody };

        using var client = new SmtpClient();
        // Mailpit (no credentials) speaks plain SMTP; Gmail on 587 needs STARTTLS.
        var security = settings.User is null ? SecureSocketOptions.None : SecureSocketOptions.StartTls;
        await client.ConnectAsync(settings.Host, settings.Port, security, ct);
        if (settings.User is not null)
        {
            await client.AuthenticateAsync(settings.User, settings.Password ?? string.Empty, ct);
        }

        await client.SendAsync(mime, ct);
        await client.DisconnectAsync(true, ct);
    }
}

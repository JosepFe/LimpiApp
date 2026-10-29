using System.Net.Http.Json;
using System.Text.Json;
using DotNet.Testcontainers.Builders;
using LimpiApp.Api.Common.Email;
using Microsoft.Extensions.Configuration;

namespace LimpiApp.IntegrationTests.Email;

/// <summary>The real SMTP sender against a Mailpit container (never a real mail server).</summary>
public sealed class SmtpEmailSenderTests : IAsyncLifetime
{
    private readonly DotNet.Testcontainers.Containers.IContainer _mailpit = new ContainerBuilder("axllent/mailpit:v1.27")
        .WithPortBinding(1025, true)
        .WithPortBinding(8025, true)
        .WithWaitStrategy(Wait.ForUnixContainer().UntilHttpRequestIsSucceeded(r => r.ForPort(8025).ForPath("/api/v1/info")))
        .Build();

    public async ValueTask InitializeAsync() => await _mailpit.StartAsync();

    public async ValueTask DisposeAsync() => await _mailpit.DisposeAsync();

    [Fact]
    public async Task Send_DeliversThePlainTextMessageToMailpit()
    {
        var ct = TestContext.Current.CancellationToken;
        var sender = new SmtpEmailSender(new SmtpSettings
        {
            Host = _mailpit.Hostname,
            Port = _mailpit.GetMappedPublicPort(1025),
            From = "LimpiApp <limpiapp@localhost>",
        });

        await sender.SendAsync(new EmailMessage("josep@example.com", "Tu enlace para entrar en LimpiApp", "Hola: https://x/api/auth/magic?token=abc"), ct);

        using var http = new HttpClient { BaseAddress = new Uri($"http://{_mailpit.Hostname}:{_mailpit.GetMappedPublicPort(8025)}") };
        var list = await http.GetFromJsonAsync<JsonElement>("/api/v1/messages", ct);
        var message = Assert.Single(list.GetProperty("messages").EnumerateArray());
        Assert.Equal("Tu enlace para entrar en LimpiApp", message.GetProperty("Subject").GetString());
        Assert.Equal("josep@example.com", message.GetProperty("To")[0].GetProperty("Address").GetString());
        Assert.Equal("limpiapp@localhost", message.GetProperty("From").GetProperty("Address").GetString());
        Assert.Contains("magic?token=abc", message.GetProperty("Snippet").GetString(), StringComparison.Ordinal);
    }

    [Fact]
    public void Settings_ComeFromTheEnvironment_WithMailpitDefaults()
    {
        var empty = SmtpSettings.FromConfiguration(new ConfigurationBuilder().Build());
        Assert.Equal(("localhost", 1025, (string?)null), (empty.Host, empty.Port, empty.User));

        var gmail = SmtpSettings.FromConfiguration(new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["SMTP_HOST"] = "smtp.gmail.com",
                ["SMTP_PORT"] = "587",
                ["SMTP_USER"] = "casa@gmail.com",
                ["SMTP_PASSWORD"] = "app-password",
                ["MAIL_FROM"] = "LimpiApp <casa@gmail.com>",
            })
            .Build());
        Assert.Equal(("smtp.gmail.com", 587, "casa@gmail.com", "LimpiApp <casa@gmail.com>"), (gmail.Host, gmail.Port, gmail.User, gmail.From));
    }
}

using System.Net;
using System.Net.Http.Json;
using LimpiApp.Api.Data.Entities;
using LimpiApp.IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.IntegrationTests.Auth;

public class MagicLinkTests(ApiFactory factory) : IntegrationTest(factory)
{
    private const string Email = "josep@example.com";

    private static async Task<HttpResponseMessage> RequestLink(HttpClient client, string email = Email, string? returnUrl = null) =>
        await client.PostAsJsonAsync("/auth/magic-link", new { email, returnUrl }, Ct);

    [Fact]
    public async Task Request_Answers202_AndEmailsTheLink()
    {
        var response = await RequestLink(Factory.CreateBrowser(), "Josep@Example.com");

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var mail = Assert.Single(Factory.Emails.Sent);
        Assert.Equal(Email, mail.To);
        Assert.Equal("Tu enlace para entrar en LimpiApp", mail.Subject);
        Assert.Matches(@"http://127\.0\.0\.1:8090/api/auth/magic\?token=[A-Za-z0-9_-]{43}", mail.TextBody);
    }

    [Fact]
    public async Task Request_WithAnInvalidEmail_Answers400()
    {
        var response = await RequestLink(Factory.CreateBrowser(), "not-an-email");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(Factory.Emails.Sent);
    }

    [Fact]
    public async Task Redeem_CreatesTheUser_OpensA30DaySession_AndGoesToOnboarding()
    {
        var browser = Factory.CreateBrowser();
        await RequestLink(browser);

        var response = await browser.GetAsync($"/auth/magic?token={Factory.Emails.LastToken(Email)}", Ct);

        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.Equal("/onboarding", response.Headers.Location?.OriginalString);
        var cookie = Assert.Single(response.Headers.GetValues("Set-Cookie"));
        Assert.StartsWith("la_session=", cookie, StringComparison.Ordinal);
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("secure", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=lax", cookie, StringComparison.OrdinalIgnoreCase);

        await using var db = Factory.CreateDbContext();
        var user = await db.Users.SingleAsync(Ct);
        Assert.Equal(Email, user.Email);
        Assert.Equal("Josep", user.Name);
        var session = await db.Sessions.SingleAsync(Ct);
        Assert.Equal(ApiFactory.PrototypeNow.AddDays(30), session.ExpiresAt);
    }

    [Fact]
    public async Task Redeem_ForAMember_GoesToToday_OrToTheLocalReturnUrl()
    {
        await using (var db = Factory.CreateDbContext())
        {
            var user = new User { Email = Email, Name = "Josep", CreatedAt = ApiFactory.PrototypeNow };
            var home = new Household { Name = "Casa Pau y Josep", CreatedAt = ApiFactory.PrototypeNow };
            db.Memberships.Add(new Membership { User = user, Household = home, Role = MemberRole.Owner, JoinedAt = ApiFactory.PrototypeNow });
            await db.SaveChangesAsync(Ct);
        }

        var browser = Factory.CreateBrowser();
        await RequestLink(browser);
        var today = await browser.GetAsync($"/auth/magic?token={Factory.Emails.LastToken(Email)}", Ct);
        Assert.Equal("/today", today.Headers.Location?.OriginalString);

        await RequestLink(browser, returnUrl: "/join/k3Jx9QmZ2vLpA8");
        var join = await browser.GetAsync($"/auth/magic?token={Factory.Emails.LastToken(Email)}", Ct);
        Assert.Equal("/join/k3Jx9QmZ2vLpA8", join.Headers.Location?.OriginalString);

        await RequestLink(browser, returnUrl: "//evil.example.com");
        var evil = await browser.GetAsync($"/auth/magic?token={Factory.Emails.LastToken(Email)}", Ct);
        Assert.Equal("/today", evil.Headers.Location?.OriginalString);

        await using var check = Factory.CreateDbContext();
        Assert.Equal(1, await check.Users.CountAsync(Ct));
    }

    [Theory]
    [InlineData("used")]
    [InlineData("expired")]
    [InlineData("fake")]
    public async Task Redeem_AUsedExpiredOrFakeLink_GoesBackToLogin_WithoutASession(string kind)
    {
        var browser = Factory.CreateBrowser();
        await RequestLink(browser);
        var token = Factory.Emails.LastToken(Email);
        switch (kind)
        {
            case "used":
                await browser.GetAsync($"/auth/magic?token={token}", Ct);
                await using (var db = Factory.CreateDbContext())
                {
                    await db.Sessions.ExecuteDeleteAsync(Ct);
                }

                break;
            case "expired":
                Factory.Time.Advance(TimeSpan.FromMinutes(15));
                break;
            default:
                token = "not-a-real-token";
                break;
        }

        var response = await Factory.CreateBrowser().GetAsync($"/auth/magic?token={token}", Ct);

        Assert.Equal("/login?error=link", response.Headers.Location?.OriginalString);
        Assert.False(response.Headers.Contains("Set-Cookie"));
        await using var after = Factory.CreateDbContext();
        Assert.Equal(0, await after.Sessions.CountAsync(Ct));
    }

    [Fact]
    public async Task SixthRequestIn15Minutes_Answers202_ButSendsNothing()
    {
        var browser = Factory.CreateBrowser();
        for (var i = 0; i < 5; i++)
        {
            Assert.Equal(HttpStatusCode.Accepted, (await RequestLink(browser)).StatusCode);
        }

        var sixth = await RequestLink(browser);

        Assert.Equal(HttpStatusCode.Accepted, sixth.StatusCode);
        Assert.Equal(5, Factory.Emails.Sent.Count);

        Factory.Time.Advance(TimeSpan.FromMinutes(16));
        await RequestLink(browser);
        Assert.Equal(6, Factory.Emails.Sent.Count);
    }
}

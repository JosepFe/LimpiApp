using System.Net;
using System.Security.Claims;
using System.Text.Json;
using LimpiApp.Api.Data.Entities;
using LimpiApp.IntegrationTests.Infrastructure;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace LimpiApp.IntegrationTests.Auth;

public class GoogleLoginTests(ApiFactory factory) : IntegrationTest(factory)
{
    private async Task<HttpResponseMessage> Complete(string google, string? returnUrl = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/auth/google/complete");
        request.Headers.Add(FakeGoogleExternalHandler.Header, google);
        if (returnUrl is not null)
        {
            request.Headers.Add(FakeGoogleExternalHandler.ReturnHeader, returnUrl);
        }

        return await Factory.CreateBrowser().SendAsync(request, Ct);
    }

    [Fact]
    public async Task NewGoogleSub_WithTheEmailOfAnExistingUser_IsLinked_NotDuplicated()
    {
        await using (var db = Factory.CreateDbContext())
        {
            db.Users.Add(new User { Email = "josep@example.com", Name = "Josep", CreatedAt = ApiFactory.PrototypeNow });
            await db.SaveChangesAsync(Ct);
        }

        await Complete("google-123|Josep@Example.com|true|Josep");

        await using var after = Factory.CreateDbContext();
        var user = await after.Users.SingleAsync(Ct);
        Assert.Equal("google-123", user.GoogleSub);
        Assert.Equal("josep@example.com", user.Email);
    }

    [Fact]
    public async Task Callback_OpensOurSession_AndRedirectsLikeTheMagicLink()
    {
        var first = await Complete("google-pau|pau@example.com|true|Pau");
        Assert.Equal(HttpStatusCode.Redirect, first.StatusCode);
        Assert.Equal("/onboarding", first.Headers.Location?.OriginalString);
        Assert.Contains(first.Headers.GetValues("Set-Cookie"), c => c.StartsWith("la_session=", StringComparison.Ordinal));

        await using (var db = Factory.CreateDbContext())
        {
            var pau = await db.Users.SingleAsync(Ct);
            Assert.Equal(("Pau", "google-pau"), (pau.Name, pau.GoogleSub));
            db.Memberships.Add(new Membership { User = pau, Household = new Household { Name = "Casa", CreatedAt = ApiFactory.PrototypeNow }, JoinedAt = ApiFactory.PrototypeNow });
            await db.SaveChangesAsync(Ct);
        }

        Assert.Equal("/today", (await Complete("google-pau|pau@example.com|true|Pau")).Headers.Location?.OriginalString);
        Assert.Equal("/join/k3Jx9QmZ2vLpA8", (await Complete("google-pau|pau@example.com|true|Pau", "/join/k3Jx9QmZ2vLpA8")).Headers.Location?.OriginalString);
        Assert.Equal("/today", (await Complete("google-pau|pau@example.com|true|Pau", "/\t/evil.example.com")).Headers.Location?.OriginalString);
        await using var check = Factory.CreateDbContext();
        Assert.Equal(4, await check.Sessions.CountAsync(Ct));
    }

    [Theory]
    [InlineData("fail")]
    [InlineData("google-x|x@example.com|false|X")]
    public async Task ErrorOrUnverifiedEmail_GoesBackToLogin(string google)
    {
        var response = await Complete(google);

        Assert.Equal("/login?error=google", response.Headers.Location?.OriginalString);
        await using var db = Factory.CreateDbContext();
        Assert.Equal(0, await db.Users.CountAsync(Ct));
    }

    [Fact]
    public async Task Start_WithoutAGoogleClient_GoesBackToLoginWithTheError()
    {
        var response = await Factory.CreateBrowser().GetAsync("/auth/google", Ct);

        Assert.Equal("/login?error=google", response.Headers.Location?.OriginalString);
    }
}

/// <summary>The API with a Google client configured, to check the redirect to Google.</summary>
public sealed class GoogleApiFactory(PostgresFixture db) : ApiFactory(db)
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.UseSetting("GOOGLE_CLIENT_ID", "test-client.apps.googleusercontent.com");
        builder.UseSetting("GOOGLE_CLIENT_SECRET", "test-secret");
    }
}

public sealed class GoogleStartTests(GoogleApiFactory factory) : IClassFixture<GoogleApiFactory>
{
    [Fact]
    public async Task Start_WithAnEvilReturn_DoesNotKeepIt()
    {
        var response = await factory.CreateBrowser().GetAsync("/auth/google?return=/%09/evil.example.com", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.StartsWith("https://accounts.google.com/", response.Headers.Location!.ToString(), StringComparison.Ordinal);
        Assert.DoesNotContain("evil", Uri.UnescapeDataString(response.Headers.GetValues("Set-Cookie").First()), StringComparison.Ordinal);
    }

    /// <summary>The real claim actions of the Google handler over a userinfo v2 answer (what Google sends).</summary>
    [Theory]
    [InlineData(true, "True")]
    [InlineData(false, "False")]
    public void UserInfo_MapsVerifiedEmail_ToTheClaimTheCallbackReads(bool verified, string claim)
    {
        var options = factory.Services.GetRequiredService<IOptionsMonitor<GoogleOptions>>().Get(GoogleDefaults.AuthenticationScheme);
        using var userInfo = JsonDocument.Parse($$"""
            {"id":"1234567890","email":"pau@example.com","verified_email":{{(verified ? "true" : "false")}},"name":"Pau García","given_name":"Pau","family_name":"García","picture":"https://x/y.jpg"}
            """);
        var identity = new ClaimsIdentity();

        foreach (var action in options.ClaimActions)
        {
            action.Run(userInfo.RootElement, identity, "Google");
        }

        Assert.Equal("1234567890", identity.FindFirst(ClaimTypes.NameIdentifier)?.Value);
        Assert.Equal("pau@example.com", identity.FindFirst(ClaimTypes.Email)?.Value);
        Assert.Equal("Pau", identity.FindFirst(ClaimTypes.GivenName)?.Value);
        Assert.Equal(claim, identity.FindFirst(LimpiApp.Api.Features.Auth.GoogleEndpoints.EmailVerifiedClaim)?.Value);
        Assert.Equal(verified, string.Equals(claim, "true", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task Start_ChallengesGoogle_WithTheCallbackUnderApiBehindNginx()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/auth/google?return=/join/abc");
        request.Headers.Add("X-Forwarded-Prefix", "/api");
        request.Headers.Add("X-Forwarded-Proto", "https");

        var response = await factory.CreateBrowser().SendAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        var location = response.Headers.Location!.ToString();
        Assert.StartsWith("https://accounts.google.com/o/oauth2/v2/auth?", location, StringComparison.Ordinal);
        Assert.Contains("client_id=test-client.apps.googleusercontent.com", location, StringComparison.Ordinal);
        Assert.Contains("redirect_uri=https%3A%2F%2Flocalhost%2Fapi%2Fauth%2Fgoogle%2Fcallback", location, StringComparison.Ordinal);
        var query = System.Web.HttpUtility.ParseQueryString(response.Headers.Location!.Query);
        Assert.Equal(["email", "openid", "profile"], query["scope"]!.Split(' ').Order(StringComparer.Ordinal));
    }
}

using System.Security.Claims;
using System.Text.Encodings.Web;
using LimpiApp.Api.Features.Auth;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace LimpiApp.IntegrationTests.Infrastructure;

/// <summary>
/// Stands in for the `external` cookie Google's handler leaves after the round trip: the test says what Google
/// returned in the X-Test-Google header ("sub|email|verified|given name", or "fail") and the return url in X-Test-Return.
/// </summary>
public sealed class FakeGoogleExternalHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
    : SignOutAuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string Header = "X-Test-Google";
    public const string ReturnHeader = "X-Test-Return";

    public static void Use(IServiceCollection services) =>
        services.PostConfigure<AuthenticationOptions>(o =>
            o.Schemes.Single(s => s.Name == GoogleEndpoints.ExternalScheme).HandlerType = typeof(FakeGoogleExternalHandler));

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var value = Request.Headers[Header].ToString();
        if (string.IsNullOrEmpty(value) || value == "fail")
        {
            return Task.FromResult(AuthenticateResult.Fail("Google said no."));
        }

        var parts = value.Split('|');
        var identity = new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, parts[0]),
            new Claim(ClaimTypes.Email, parts[1]),
            new Claim(GoogleEndpoints.EmailVerifiedClaim, parts[2]),
            new Claim(ClaimTypes.GivenName, parts[3]),
        ], GoogleEndpoints.ExternalScheme);
        var properties = new AuthenticationProperties();
        var returnUrl = Request.Headers[ReturnHeader].ToString();
        if (!string.IsNullOrEmpty(returnUrl))
        {
            properties.Items["return"] = returnUrl;
        }

        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), properties, Scheme.Name)));
    }

    protected override Task HandleSignOutAsync(AuthenticationProperties? properties) => Task.CompletedTask;
}

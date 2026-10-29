using LimpiApp.Api.Features.Auth;

namespace LimpiApp.UnitTests.Auth;

public class SignInRedirectTests
{
    [Theory]
    [InlineData("/")]
    [InlineData("/today")]
    [InlineData("/join/k3Jx9QmZ2vLpA8?x=1#y")]
    public void IsLocal_AcceptsPathsOfThisApp(string url) => Assert.True(SignInRedirect.IsLocal(url));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("today")]
    [InlineData("//evil.example.com")]
    [InlineData("/\\evil.example.com")]
    [InlineData("/\t/evil.example.com")]
    [InlineData("/\n/evil.example.com")]
    [InlineData("/\r/evil.example.com")]
    [InlineData("/today\\..\\x")]
    [InlineData("https://evil.example.com")]
    [InlineData("javascript:alert(1)")]
    public void IsLocal_RejectsEverythingThatCouldLeaveTheSite(string? url) => Assert.False(SignInRedirect.IsLocal(url));
}

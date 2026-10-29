using System.Net;
using System.Net.Http.Json;
using LimpiApp.IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.IntegrationTests.Auth;

public class LogoutTests(ApiFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Logout_DeletesTheSessionAndTheCookie()
    {
        var browser = await Factory.SignedInAsync();
        Assert.Equal(HttpStatusCode.OK, (await browser.GetAsync("/auth/me", Ct)).StatusCode);

        var response = await browser.PostAsync("/auth/logout", null, Ct);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Contains(response.Headers.GetValues("Set-Cookie"), c => c.StartsWith("la_session=;", StringComparison.Ordinal));
        await using (var db = Factory.CreateDbContext())
        {
            Assert.Equal(0, await db.Sessions.CountAsync(Ct));
        }

        Assert.Equal(HttpStatusCode.Unauthorized, (await browser.GetAsync("/auth/me", Ct)).StatusCode);
    }
}

using System.Net;
using System.Net.Http.Json;
using LimpiApp.IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.IntegrationTests.Auth;

public class CsrfTests(ApiFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task ChangingRequest_WithoutTheHeader_Is403_GetIsAllowed()
    {
        var browser = await Factory.SignedInAsync();
        browser.DefaultRequestHeaders.Remove("X-Requested-With");

        Assert.Equal(HttpStatusCode.Forbidden, (await browser.PostAsync("/auth/logout", null, Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await browser.PostAsJsonAsync("/auth/magic-link", new { email = "x@example.com" }, Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await browser.GetAsync("/auth/me", Ct)).StatusCode);

        browser.DefaultRequestHeaders.Add("X-Requested-With", "limpiapp");
        Assert.Equal(HttpStatusCode.NoContent, (await browser.PostAsync("/auth/logout", null, Ct)).StatusCode);
    }
}

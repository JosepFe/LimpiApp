using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.Api.Data.Entities;
using LimpiApp.IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.IntegrationTests.Auth;

public class MeTests(ApiFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Me_ReturnsTheUser_AndTheirHouseholdsWithRoleAndMemberCount()
    {
        var josep = await Factory.SignedInAsync();
        await using (var db = Factory.CreateDbContext())
        {
            var me = await db.Users.SingleAsync(Ct);
            var pau = new User { Email = "pau@example.com", Name = "Pau", CreatedAt = ApiFactory.PrototypeNow };
            var marta = new User { Email = "marta@example.com", Name = "Marta", CreatedAt = ApiFactory.PrototypeNow };
            var casa = new Household { Name = "Casa Pau y Josep", CreatedAt = ApiFactory.PrototypeNow };
            var playa = new Household { Name = "Casa de la playa", CreatedAt = ApiFactory.PrototypeNow };
            db.Memberships.AddRange(
                new Membership { User = me, Household = casa, Role = MemberRole.Owner, JoinedAt = ApiFactory.PrototypeNow.AddDays(-200) },
                new Membership { User = pau, Household = casa, Role = MemberRole.Owner, JoinedAt = ApiFactory.PrototypeNow.AddDays(-200) },
                new Membership { User = marta, Household = casa, JoinedAt = ApiFactory.PrototypeNow.AddDays(-150) },
                new Membership { User = me, Household = playa, JoinedAt = ApiFactory.PrototypeNow.AddDays(-30) },
                new Membership { User = pau, Household = playa, Role = MemberRole.Owner, JoinedAt = ApiFactory.PrototypeNow.AddDays(-30) });
            await db.SaveChangesAsync(Ct);
        }

        var body = await josep.GetFromJsonAsync<JsonElement>("/auth/me", Ct);

        Assert.Equal("josep@example.com", body.GetProperty("email").GetString());
        Assert.Equal("Josep", body.GetProperty("name").GetString());
        Assert.Equal("teal", body.GetProperty("avatarColor").GetString());
        Assert.Equal("system", body.GetProperty("theme").GetString());
        var households = body.GetProperty("households").EnumerateArray()
            .Select(h => (h.GetProperty("name").GetString(), h.GetProperty("role").GetString(), h.GetProperty("memberCount").GetInt32()))
            .ToList();
        Assert.Equal([("Casa Pau y Josep", "owner", 3), ("Casa de la playa", "member", 2)], households);
    }

    [Fact]
    public async Task Me_WithoutSession_Is401()
    {
        var response = await Factory.CreateBrowser().GetAsync("/auth/me", Ct);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_WithAnExpiredSession_Is401_AndAnActiveOneIsExtended()
    {
        var browser = await Factory.SignedInAsync();
        Factory.Time.Advance(TimeSpan.FromDays(10));
        Assert.Equal(HttpStatusCode.OK, (await browser.GetAsync("/auth/me", Ct)).StatusCode);
        await using (var db = Factory.CreateDbContext())
        {
            Assert.Equal(ApiFactory.PrototypeNow.AddDays(40), (await db.Sessions.SingleAsync(Ct)).ExpiresAt);
        }

        Factory.Time.Advance(TimeSpan.FromDays(31));
        Assert.Equal(HttpStatusCode.Unauthorized, (await browser.GetAsync("/auth/me", Ct)).StatusCode);
    }
}

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

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.IntegrationTests.Infrastructure;
using LimpiApp.IntegrationTests.Members;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.IntegrationTests.Invites;

public class AcceptInviteTests(ApiFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Accept_Valid_JoinsAsMember_AndCountsAUse()
    {
        var data = await MembersTestData.CreateAsync(Factory);
        var invite = await InvitesTests.CreateAsync(data);
        var ana = await Factory.SignedInAsync("ana@example.com");

        var response = await ana.PostAsync(AcceptUrl(invite), null, Ct);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(("joined", data.HouseholdId), (body.GetProperty("status").GetString(), body.GetProperty("householdId").GetGuid()));
        var members = await ana.GetFromJsonAsync<JsonElement[]>(data.Url(), Ct);
        Assert.Equal(("Ana", "member", "2026-10-14"), (members![^1].GetProperty("name").GetString(), members[^1].GetProperty("role").GetString(), members[^1].GetProperty("joinedOn").GetString()));
        var current = await data.Josep.GetFromJsonAsync<JsonElement>($"{InvitesTests.InvitesUrl(data)}/current", Ct);
        Assert.Equal(1, current.GetProperty("uses").GetInt32());
    }

    [Fact]
    public async Task Accept_WhenAlreadyMember_IsAlreadyMember_AndDoesNotCountAUse()
    {
        var data = await MembersTestData.CreateAsync(Factory);
        var invite = await InvitesTests.CreateAsync(data);

        var response = await data.Marta.PostAsync(AcceptUrl(invite), null, Ct);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("already-member", (await response.Content.ReadFromJsonAsync<JsonElement>(Ct)).GetProperty("status").GetString());
        await using var db = Factory.CreateDbContext();
        Assert.Equal(0, (await db.Invites.SingleAsync(Ct)).Uses);
    }

    [Fact]
    public async Task Accept_RevokedOrUsedUpOrPastSevenDays_IsExpired()
    {
        var data = await MembersTestData.CreateAsync(Factory);
        var revoked = await InvitesTests.CreateAsync(data);
        await data.Josep.DeleteAsync($"{InvitesTests.InvitesUrl(data)}/{revoked.GetProperty("id").GetGuid()}", Ct);
        var usedUp = await InvitesTests.CreateAsync(data);
        for (var i = 0; i < 5; i++)
        {
            var guest = await Factory.SignedInAsync($"guest{i}@example.com");
            Assert.Equal(HttpStatusCode.OK, (await guest.PostAsync(AcceptUrl(usedUp), null, Ct)).StatusCode);
        }

        var ana = await Factory.SignedInAsync("ana@example.com");

        Assert.Equal(HttpStatusCode.Gone, (await ana.PostAsync(AcceptUrl(revoked), null, Ct)).StatusCode);
        var sixth = await ana.PostAsync(AcceptUrl(usedUp), null, Ct);
        Assert.Equal(HttpStatusCode.Gone, sixth.StatusCode);
        Assert.Equal("expired", (await sixth.Content.ReadFromJsonAsync<JsonElement>(Ct)).GetProperty("status").GetString());

        var fresh = await InvitesTests.CreateAsync(data);
        Factory.Time.Advance(TimeSpan.FromDays(7));
        Assert.Equal(HttpStatusCode.Gone, (await ana.PostAsync(AcceptUrl(fresh), null, Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await ana.GetAsync(data.Url(), Ct)).StatusCode);
    }

    [Fact]
    public async Task Accept_ConcurrentGuests_NeverExceedFiveUses()
    {
        var data = await MembersTestData.CreateAsync(Factory);
        var invite = await InvitesTests.CreateAsync(data);
        var guests = new List<HttpClient>();
        for (var i = 0; i < 8; i++)
        {
            guests.Add(await Factory.SignedInAsync($"guest{i}@example.com"));
        }

        var responses = await Task.WhenAll(guests.Select(g => g.PostAsync(AcceptUrl(invite), null, Ct)));

        Assert.Equal(5, responses.Count(r => r.StatusCode == HttpStatusCode.OK));
        Assert.Equal(3, responses.Count(r => r.StatusCode == HttpStatusCode.Gone));
        await using var db = Factory.CreateDbContext();
        Assert.Equal(5, (await db.Invites.SingleAsync(Ct)).Uses);
        Assert.Equal(8, await db.Memberships.CountAsync(m => m.HouseholdId == data.HouseholdId, Ct));
    }

    [Fact]
    public async Task Accept_UnknownCode_IsInvalid_AndWithoutSessionIs401()
    {
        await MembersTestData.CreateAsync(Factory);
        var ana = await Factory.SignedInAsync("ana@example.com");

        var unknown = await ana.PostAsync("/invites/AAAAAAAAAAAAAA/accept", null, Ct);

        Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);
        Assert.Equal("invalid", (await unknown.Content.ReadFromJsonAsync<JsonElement>(Ct)).GetProperty("status").GetString());
        Assert.Equal(HttpStatusCode.Unauthorized, (await Factory.CreateBrowser().PostAsync("/invites/AAAAAAAAAAAAAA/accept", null, Ct)).StatusCode);
    }

    private static string AcceptUrl(JsonElement invite) => $"/invites/{invite.GetProperty("code").GetString()}/accept";
}

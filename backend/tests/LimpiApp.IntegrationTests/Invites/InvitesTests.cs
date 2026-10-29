using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.IntegrationTests.Infrastructure;
using LimpiApp.IntegrationTests.Members;

namespace LimpiApp.IntegrationTests.Invites;

public class InvitesTests(ApiFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Create_AsOwner_GivesAJoinLinkFor7DaysAnd5Uses()
    {
        var data = await MembersTestData.CreateAsync(Factory);

        var response = await data.Pau.PostAsync(InvitesUrl(data), null, Ct);
        var invite = await response.Content.ReadFromJsonAsync<JsonElement>(Ct);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var code = invite.GetProperty("code").GetString()!;
        Assert.Matches("^[0-9A-Za-z]{14}$", code);
        Assert.Equal($"http://127.0.0.1:8090/join/{code}", invite.GetProperty("url").GetString());
        Assert.Equal(ApiFactory.PrototypeNow.AddDays(7), invite.GetProperty("expiresAt").GetDateTimeOffset());
        Assert.Equal((0, 5, false), (invite.GetProperty("uses").GetInt32(), invite.GetProperty("maxUses").GetInt32(), invite.GetProperty("expired").GetBoolean()));
    }

    [Fact]
    public async Task Create_AsMember_Is403()
    {
        var data = await MembersTestData.CreateAsync(Factory);

        Assert.Equal(HttpStatusCode.Forbidden, (await data.Marta.PostAsync(InvitesUrl(data), null, Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await data.Marta.GetAsync($"{InvitesUrl(data)}/current", Ct)).StatusCode);
    }

    [Fact]
    public async Task Create_RevokesThePreviousLink_AndCurrentIsTheNewOne()
    {
        var data = await MembersTestData.CreateAsync(Factory);
        var first = await CreateAsync(data);

        var second = await CreateAsync(data);

        var current = await data.Josep.GetFromJsonAsync<JsonElement>($"{InvitesUrl(data)}/current", Ct);
        Assert.Equal(second.GetProperty("id").GetGuid(), current.GetProperty("id").GetGuid());
        Assert.Equal("expired", (await PreviewAsync(Factory.CreateBrowser(), first.GetProperty("code").GetString()!)).GetProperty("status").GetString());
    }

    [Fact]
    public async Task Current_WithoutLink_Is404_AndExpiredOnesAreFlagged()
    {
        var data = await MembersTestData.CreateAsync(Factory);
        Assert.Equal(HttpStatusCode.NotFound, (await data.Josep.GetAsync($"{InvitesUrl(data)}/current", Ct)).StatusCode);
        await CreateAsync(data);

        Factory.Time.Advance(TimeSpan.FromDays(7));

        var current = await data.Josep.GetFromJsonAsync<JsonElement>($"{InvitesUrl(data)}/current", Ct);
        Assert.True(current.GetProperty("expired").GetBoolean());
    }

    [Fact]
    public async Task Revoke_RemovesTheCurrentLink_AndItsPreviewIsExpired()
    {
        var data = await MembersTestData.CreateAsync(Factory);
        var invite = await CreateAsync(data);

        var response = await data.Josep.DeleteAsync($"{InvitesUrl(data)}/{invite.GetProperty("id").GetGuid()}", Ct);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await data.Josep.GetAsync($"{InvitesUrl(data)}/current", Ct)).StatusCode);
        Assert.Equal("expired", (await PreviewAsync(Factory.CreateBrowser(), invite.GetProperty("code").GetString()!)).GetProperty("status").GetString());
    }

    [Fact]
    public async Task Revoke_AsMemberOrFromAnotherHousehold_IsRefused()
    {
        var data = await MembersTestData.CreateAsync(Factory);
        var invite = await CreateAsync(data);
        var url = $"{InvitesUrl(data)}/{invite.GetProperty("id").GetGuid()}";
        var stranger = await Factory.SignedInAsync("ana@example.com");
        var other = await ApiFactory.CreateHouseholdAsync(stranger, "Piso de Ana");

        Assert.Equal(HttpStatusCode.Forbidden, (await data.Marta.DeleteAsync(url, Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.DeleteAsync(url, Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.PostAsync(InvitesUrl(data), null, Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.DeleteAsync($"/households/{other}/invites/{invite.GetProperty("id").GetGuid()}", Ct)).StatusCode);
    }

    [Fact]
    public async Task Preview_WithoutSession_ShowsTheHouseholdAndWhoInvites()
    {
        var data = await MembersTestData.CreateAsync(Factory);
        var invite = await CreateAsync(data, data.Pau);

        var preview = await PreviewAsync(Factory.CreateBrowser(), invite.GetProperty("code").GetString()!);

        Assert.Equal(("valid", "Casa Pau y Josep", "Pau", 3, 1),
            (preview.GetProperty("status").GetString(), preview.GetProperty("householdName").GetString(), preview.GetProperty("inviterName").GetString(),
             preview.GetProperty("memberCount").GetInt32(), preview.GetProperty("roomCount").GetInt32()));
        Assert.Equal([("Josep", "teal"), ("Pau", "violet"), ("Marta", "amber")],
            preview.GetProperty("members").EnumerateArray().Select(m => (m.GetProperty("name").GetString(), m.GetProperty("avatarColor").GetString())));
    }

    [Fact]
    public async Task Preview_UnknownCode_IsInvalid_AndExpiredOneSaysNothingOfTheHousehold()
    {
        var data = await MembersTestData.CreateAsync(Factory);
        var invite = await CreateAsync(data);
        Factory.Time.Advance(TimeSpan.FromDays(7));

        var invalid = await PreviewAsync(Factory.CreateBrowser(), "AAAAAAAAAAAAAA");
        var expired = await PreviewAsync(Factory.CreateBrowser(), invite.GetProperty("code").GetString()!);

        Assert.Equal("invalid", invalid.GetProperty("status").GetString());
        Assert.Equal("expired", expired.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, expired.GetProperty("householdName").ValueKind);
    }

    [Fact]
    public async Task Preview_ForSomeoneAlreadyInTheHousehold_IsAlreadyMember()
    {
        var data = await MembersTestData.CreateAsync(Factory);
        var invite = await CreateAsync(data);

        var preview = await PreviewAsync(data.Marta, invite.GetProperty("code").GetString()!);

        Assert.Equal(("already-member", "Casa Pau y Josep"), (preview.GetProperty("status").GetString(), preview.GetProperty("householdName").GetString()));
    }

    internal static string InvitesUrl(MembersTestData data) => $"/households/{data.HouseholdId}/invites";

    internal static async Task<JsonElement> CreateAsync(MembersTestData data, HttpClient? owner = null)
    {
        var response = await (owner ?? data.Josep).PostAsync(InvitesUrl(data), null, TestContext.Current.CancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    internal static async Task<JsonElement> PreviewAsync(HttpClient client, string code) =>
        await client.GetFromJsonAsync<JsonElement>($"/invites/{code}", TestContext.Current.CancellationToken);
}

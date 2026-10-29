using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.IntegrationTests.Infrastructure;

namespace LimpiApp.IntegrationTests.Members;

public class MembersTests(ApiFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task List_PrototypeHousehold_ByJoiningOrder_WithRoleAndDayInTheHouseholdZone()
    {
        var data = await MembersTestData.CreateAsync(Factory);

        var members = (await data.Marta.GetFromJsonAsync<JsonElement[]>(data.Url(), Ct))!;

        Assert.Equal([("Josep", "teal", "owner", "2026-03-02"), ("Pau", "violet", "owner", "2026-03-02"), ("Marta", "amber", "member", "2026-04-18")],
            members.Select(m => (m.GetProperty("name").GetString(), m.GetProperty("avatarColor").GetString(), m.GetProperty("role").GetString(), m.GetProperty("joinedOn").GetString())));
        Assert.Equal([data.JosepId, data.PauId, data.MartaId], members.Select(m => m.GetProperty("id").GetGuid()));
    }

    [Fact]
    public async Task List_OfAnotherHousehold_Is404()
    {
        var data = await MembersTestData.CreateAsync(Factory);
        var stranger = await Factory.SignedInAsync("ana@example.com");

        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync(data.Url(), Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.DeleteAsync(data.Url(data.MartaId), Ct)).StatusCode);
    }

    [Fact]
    public async Task List_WithoutSession_Is401()
    {
        var data = await MembersTestData.CreateAsync(Factory);

        Assert.Equal(HttpStatusCode.Unauthorized, (await Factory.CreateBrowser().GetAsync(data.Url(), Ct)).StatusCode);
    }
}

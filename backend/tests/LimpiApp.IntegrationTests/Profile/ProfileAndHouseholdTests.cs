using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.IntegrationTests.Infrastructure;
using LimpiApp.IntegrationTests.Members;

namespace LimpiApp.IntegrationTests.Profile;

public class ProfileAndHouseholdTests(ApiFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task PatchMe_ChangesOnlyWhatIsSent_AndPersists()
    {
        var josep = await Factory.SignedInAsync();

        var renamed = await josep.PatchAsJsonAsync("/me", new { name = " Josep F. " }, Ct);
        await josep.PatchAsJsonAsync("/me", new { avatarColor = "rose", theme = "dark" }, Ct);

        Assert.Equal(HttpStatusCode.OK, renamed.StatusCode);
        var me = await josep.GetFromJsonAsync<JsonElement>("/auth/me", Ct);
        Assert.Equal(("Josep F.", "rose", "dark"), (me.GetProperty("name").GetString(), me.GetProperty("avatarColor").GetString(), me.GetProperty("theme").GetString()));
    }

    [Fact]
    public async Task PatchMe_EmptyName_UnknownColorOrTheme_Is400()
    {
        var josep = await Factory.SignedInAsync();

        Assert.Equal(HttpStatusCode.BadRequest, (await josep.PatchAsJsonAsync("/me", new { name = "  " }, Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await josep.PatchAsJsonAsync("/me", new { name = new string('a', 81) }, Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await josep.PatchAsJsonAsync("/me", new { avatarColor = "#ff0000" }, Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await josep.PatchAsJsonAsync("/me", new { theme = "neon" }, Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Factory.CreateBrowser().PatchAsJsonAsync("/me", new { name = "X" }, Ct)).StatusCode);
    }

    [Fact]
    public async Task PatchHousehold_AsOwner_ChangesNameAndZone_ShownInMe()
    {
        var data = await MembersTestData.CreateAsync(Factory);

        var response = await data.Pau.PatchAsJsonAsync($"/households/{data.HouseholdId}", new { name = "Casa nueva", timeZone = "Atlantic/Canary" }, Ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var household = await data.Marta.GetFromJsonAsync<JsonElement>($"/households/{data.HouseholdId}", Ct);
        Assert.Equal(("Casa nueva", "Atlantic/Canary"), (household.GetProperty("name").GetString(), household.GetProperty("timeZone").GetString()));
        var me = await data.Josep.GetFromJsonAsync<JsonElement>("/auth/me", Ct);
        Assert.Equal("Casa nueva", me.GetProperty("households")[0].GetProperty("name").GetString());
    }

    [Fact]
    public async Task PatchHousehold_AsMember_Is403_Invalid_Is400_Stranger_Is404()
    {
        var data = await MembersTestData.CreateAsync(Factory);
        var stranger = await Factory.SignedInAsync("ana@example.com");
        var url = $"/households/{data.HouseholdId}";

        Assert.Equal(HttpStatusCode.Forbidden, (await data.Marta.PatchAsJsonAsync(url, new { name = "Mía" }, Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await data.Josep.PatchAsJsonAsync(url, new { name = " " }, Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await data.Josep.PatchAsJsonAsync(url, new { name = new string('a', 81) }, Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await data.Josep.PatchAsJsonAsync(url, new { timeZone = "Romance Standard Time" }, Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.PatchAsJsonAsync(url, new { name = "Mía" }, Ct)).StatusCode);
        var household = await data.Josep.GetFromJsonAsync<JsonElement>(url, Ct);
        Assert.Equal(("Casa Pau y Josep", "Europe/Madrid"), (household.GetProperty("name").GetString(), household.GetProperty("timeZone").GetString()));
    }
}

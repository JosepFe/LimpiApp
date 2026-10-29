using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.IntegrationTests.Infrastructure;

namespace LimpiApp.IntegrationTests.Photos;

public class PhotosAccessTests(ApiFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task AMemberGetsThePhoto_SomeoneElseGets404()
    {
        var (josep, hid, completion) = await PhotoTestData.CompletedAsync(Factory);
        var url = (await (await PhotoTestData.UploadAsync(josep, hid, completion, PhotoTestData.Png, "x.png", "image/png"))
            .Content.ReadFromJsonAsync<JsonElement>(Ct)).GetProperty("url").GetString()!;

        var mine = await josep.GetAsync(url, Ct);
        var stranger = await Factory.SignedInAsync("intruso@example.com");
        var strangerHome = await ApiFactory.CreateHouseholdAsync(stranger, "Otra");

        Assert.Equal(HttpStatusCode.OK, mine.StatusCode);
        Assert.Equal("image/png", mine.Content.Headers.ContentType?.MediaType);
        Assert.Equal(PhotoTestData.Png, await mine.Content.ReadAsByteArrayAsync(Ct));
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync(url, Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync(url.Replace(hid.ToString(), strangerHome.ToString(), StringComparison.Ordinal), Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Factory.CreateBrowser().GetAsync(url, Ct)).StatusCode);
    }
}

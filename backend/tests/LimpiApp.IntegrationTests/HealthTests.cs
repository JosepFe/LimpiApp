using System.Net;
using System.Net.Http.Json;
using LimpiApp.IntegrationTests.Infrastructure;

namespace LimpiApp.IntegrationTests;

public class HealthTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Health_WithoutSession_ReturnsOkAndVersion()
    {
        var response = await factory.CreateClient().GetAsync("/health", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>(TestContext.Current.CancellationToken);
        Assert.Equal("ok", body!["status"]);
        Assert.Equal("0.1.0", body["version"]);
    }
}

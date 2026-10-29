using System.Net;
using LimpiApp.IntegrationTests.Infrastructure;

namespace LimpiApp.IntegrationTests;

public class ErrorHandlingTests(ApiFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task UnhandledException_ReturnsProblemDetailsWithoutInternals()
    {
        var response = await Factory.CreateClient().GetAsync("/__test/throw", Ct);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadAsStringAsync(Ct);
        Assert.DoesNotContain("secret internal detail", body, StringComparison.Ordinal);
        Assert.DoesNotContain("InvalidOperationException", body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task UnknownRoute_ReturnsProblemDetails404()
    {
        var response = await Factory.CreateClient().GetAsync("/does-not-exist", Ct);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }
}

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.IntegrationTests.Infrastructure;

namespace LimpiApp.IntegrationTests.Tasks;

public class TasksValidationTests(ApiFactory factory) : IntegrationTest(factory)
{
    private static async Task<string[]> FieldsInError(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        return [.. problem.GetProperty("errors").EnumerateObject().Select(e => e.Name.ToLowerInvariant())];
    }

    [Fact]
    public async Task TooManySubtasks_IsRejected()
    {
        var data = await TaskTestData.CreateAsync(Factory);

        var fields = await FieldsInError(await data.PostAsync(data.Request(subtasks: [.. Enumerable.Range(1, 21).Select(i => $"Paso {i}")])));

        Assert.Contains("subtasks", fields);
        Assert.Equal(HttpStatusCode.Created, (await data.PostAsync(data.Request(subtasks: [.. Enumerable.Range(1, 20).Select(i => $"Paso {i}")]))).StatusCode);
    }

    [Fact]
    public async Task EmptyTitle_IsRejected()
    {
        var data = await TaskTestData.CreateAsync(Factory);

        Assert.Contains("title", await FieldsInError(await data.PostAsync(data.Request(title: "  "))));
    }

    [Fact]
    public async Task FrequencyBelowOne_IsRejected()
    {
        var data = await TaskTestData.CreateAsync(Factory);
        var body = JsonSerializer.SerializeToNode(data.Request())!.AsObject();
        body["freqValue"] = 0;

        Assert.Contains("freqvalue", await FieldsInError(await data.PostAsync(body)));
    }

    [Fact]
    public async Task AnAssigneeWhoIsNotAMember_IsRejected()
    {
        var data = await TaskTestData.CreateAsync(Factory);
        var stranger = await Factory.SignedInAsync("intruso@example.com");
        await ApiFactory.CreateHouseholdAsync(stranger, "Otra casa");
        Guid strangerId;
        await using (var db = Factory.CreateDbContext())
        {
            strangerId = db.Users.Single(u => u.Email == "intruso@example.com").Id;
        }

        Assert.Contains("assigneeid", await FieldsInError(await data.PostAsync(data.Request(assignee: strangerId))));
    }

    [Fact]
    public async Task AZoneOfAnotherRoom_OrAnUnknownProduct_IsRejected()
    {
        var data = await TaskTestData.CreateAsync(Factory);

        var fields = await FieldsInError(await data.PostAsync(data.Request(zone: Guid.NewGuid(), products: [Guid.NewGuid()])));

        Assert.Contains("zoneid", fields);
        Assert.Contains("productids", fields);
    }
}

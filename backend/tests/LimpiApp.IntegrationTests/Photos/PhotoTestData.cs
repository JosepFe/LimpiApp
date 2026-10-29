using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.IntegrationTests.Infrastructure;
using LimpiApp.IntegrationTests.Today;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.IntegrationTests.Photos;

public static class PhotoTestData
{
    public static readonly byte[] Jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0xFF, 0xD9];
    public static readonly byte[] Png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D];

    /// <summary>Josep's household with the fridge done by him: (client, household, completion).</summary>
    public static async Task<(HttpClient Josep, Guid Hid, Guid Completion)> CompletedAsync(ApiFactory factory)
    {
        var ct = TestContext.Current.CancellationToken;
        var (josep, hid, _, _) = await TodayTestData.CreateAsync(factory);
        Guid fridge;
        await using (var db = factory.CreateDbContext())
        {
            fridge = (await db.Tasks.SingleAsync(t => t.Title == "Limpiar nevera por dentro", ct)).Id;
        }

        var done = await (await josep.PostAsJsonAsync($"/households/{hid}/tasks/{fridge}/complete", new { subtasksDone = 0, minutes = 30 }, ct))
            .Content.ReadFromJsonAsync<JsonElement>(ct);
        return (josep, hid, done.GetProperty("completionId").GetGuid());
    }

    public static Task<HttpResponseMessage> UploadAsync(HttpClient client, Guid hid, Guid completion, byte[] bytes, string name = "foto.jpg", string type = "image/jpeg")
    {
        var content = new ByteArrayContent(bytes);
        content.Headers.ContentType = new MediaTypeHeaderValue(type);
        var form = new MultipartFormDataContent { { content, "file", name } };
        return client.PostAsync($"/households/{hid}/completions/{completion}/photos", form, TestContext.Current.CancellationToken);
    }
}

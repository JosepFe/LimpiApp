using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.IntegrationTests.Photos;

public class PhotosUploadTests(ApiFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Upload_StoresTheFileUnderTheHouseholdAndCompletion()
    {
        var (josep, hid, completion) = await PhotoTestData.CompletedAsync(Factory);

        var response = await PhotoTestData.UploadAsync(josep, hid, completion, PhotoTestData.Jpeg, "nevera.png", "image/png");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Ct);
        Assert.StartsWith($"/households/{hid}/photos/", body.GetProperty("url").GetString(), StringComparison.Ordinal);
        await using var db = Factory.CreateDbContext();
        var photo = await db.CompletionPhotos.SingleAsync(Ct);
        Assert.Equal("image/jpeg", photo.ContentType); // from the bytes, not from the name or the header
        Assert.StartsWith($"{hid}/{completion}/", photo.Path, StringComparison.Ordinal);
        Assert.Equal(PhotoTestData.Jpeg, await File.ReadAllBytesAsync(Path.Combine(Factory.PhotosDir, photo.Path), Ct));
    }

    [Fact]
    public async Task ANotAllowedType_TooBig_OrAFourthPhoto_Is400()
    {
        var (josep, hid, completion) = await PhotoTestData.CompletedAsync(Factory);

        var text = await PhotoTestData.UploadAsync(josep, hid, completion, "no soy una foto"u8.ToArray(), "x.jpg");
        var huge = new byte[(8 * 1024 * 1024) + 1];
        PhotoTestData.Jpeg.CopyTo(huge, 0);
        var big = await PhotoTestData.UploadAsync(josep, hid, completion, huge);
        for (var i = 0; i < 3; i++)
        {
            Assert.Equal(HttpStatusCode.Created, (await PhotoTestData.UploadAsync(josep, hid, completion, PhotoTestData.Png, "x.png", "image/png")).StatusCode);
        }

        var fourth = await PhotoTestData.UploadAsync(josep, hid, completion, PhotoTestData.Jpeg);

        Assert.Equal(HttpStatusCode.BadRequest, text.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, big.StatusCode); // 8 MB + 1 byte: under the request limit, rejected as a photo
        Assert.Equal(HttpStatusCode.BadRequest, fourth.StatusCode);
        await using var db = Factory.CreateDbContext();
        Assert.Equal(3, await db.CompletionPhotos.CountAsync(Ct));
    }

    [Fact]
    public async Task FourUploadsAtOnce_KeepAtMostThreePhotos_InDistinctPositions()
    {
        var (josep, hid, completion) = await PhotoTestData.CompletedAsync(Factory);
        await PhotoTestData.UploadAsync(josep, hid, completion, PhotoTestData.Jpeg);

        var responses = await Task.WhenAll(Enumerable.Range(0, 4).Select(_ => PhotoTestData.UploadAsync(josep, hid, completion, PhotoTestData.Jpeg)));

        Assert.All(responses, r => Assert.Contains(r.StatusCode, new[] { HttpStatusCode.Created, HttpStatusCode.BadRequest, HttpStatusCode.Conflict }));
        await using var db = Factory.CreateDbContext();
        var positions = await db.CompletionPhotos.Select(p => p.Position).ToListAsync(Ct);
        Assert.InRange(positions.Count, 2, 3);
        Assert.Equal(positions.Count, positions.Distinct().Count());
        Assert.Equal(positions.Count, Directory.GetFiles(Factory.PhotosDir, "*", SearchOption.AllDirectories).Length);
    }

    [Fact]
    public async Task OnlyWhoDidTheTask_AddsItsPhotos()
    {
        var (_, hid, completion) = await PhotoTestData.CompletedAsync(Factory);
        await using (var db = Factory.CreateDbContext())
        {
            var marta = new Api.Data.Entities.User { Email = "marta@example.com", Name = "Marta", CreatedAt = ApiFactory.PrototypeNow };
            db.Memberships.Add(new Api.Data.Entities.Membership { User = marta, HouseholdId = hid, JoinedAt = ApiFactory.PrototypeNow });
            await db.SaveChangesAsync(Ct);
        }

        var marta2 = await Factory.SignedInAsync("marta@example.com");

        Assert.Equal(HttpStatusCode.Forbidden, (await PhotoTestData.UploadAsync(marta2, hid, completion, PhotoTestData.Jpeg)).StatusCode);
    }
}

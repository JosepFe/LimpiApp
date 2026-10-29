using LimpiApp.Api.Common;
using LimpiApp.Api.Data;
using LimpiApp.Api.Data.Entities;
using LimpiApp.Api.Features.Auth;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.Api.Features.Photos;

/// <summary>Photos of a completion (E04/US-006, D3): on the PHOTOS_DIR volume, max 3, JPEG/PNG/WebP up to 8 MB, members only.</summary>
public static class PhotosEndpoints
{
    public const int MaxPhotos = 3;
    public const long MaxBytes = 8 * 1024 * 1024;

    public sealed record PhotoDto(Guid Id, string Url);

    public static string PhotosDir(IConfiguration config) => config["PHOTOS_DIR"] ?? System.IO.Path.Combine(AppContext.BaseDirectory, "photos");

    public static IEndpointRouteBuilder MapPhotos(this IEndpointRouteBuilder app)
    {
        var household = app.MapHouseholdGroup();
        household.MapPost("/completions/{cid:guid}/photos", UploadAsync)
            .DisableAntiforgery() // our CSRF protection is the X-Requested-With header (E02 D4)
            .WithMetadata(new Microsoft.AspNetCore.Mvc.RequestSizeLimitAttribute(MaxBytes + (64 * 1024)));
        household.MapGet("/photos/{pid:guid}", GetAsync);
        return app;
    }

    private static async Task<IResult> UploadAsync(Guid cid, IFormFile? file, HttpContext http, AppDbContext db, IConfiguration config, CancellationToken ct)
    {
        var householdId = HouseholdAccess.Current(http).HouseholdId;
        var completion = await db.Completions.Include(c => c.Photos)
            .SingleOrDefaultAsync(c => c.Id == cid && c.HouseholdId == householdId && c.UndoneAt == null, ct);
        if (completion is null)
        {
            return TypedResults.NotFound();
        }

        if (completion.UserId != http.User.UserId())
        {
            return TypedResults.Forbid(); // only who did the task adds its photos
        }

        string? error = null;
        string? contentType = null;
        if (file is null || file.Length == 0)
        {
            error = "Falta la foto.";
        }
        else if (file.Length > MaxBytes)
        {
            error = "La foto pasa de 8 MB.";
        }
        else if (completion.Photos.Count >= MaxPhotos)
        {
            error = "Como mucho 3 fotos.";
        }
        else if ((contentType = await SniffAsync(file, ct)) is null)
        {
            error = "Solo fotos JPEG, PNG o WebP.";
        }

        if (error is not null)
        {
            return TypedResults.ValidationProblem(new Dictionary<string, string[]> { ["file"] = [error] });
        }

        var photo = new CompletionPhoto
        {
            CompletionId = completion.Id,
            ContentType = contentType!,
            SizeBytes = file!.Length,
            Position = completion.Photos.Count,
            Path = $"{householdId}/{completion.Id}/{Guid.CreateVersion7()}{Extension(contentType!)}",
        };
        var full = System.IO.Path.Combine(PhotosDir(config), photo.Path);
        Directory.CreateDirectory(System.IO.Path.GetDirectoryName(full)!);
        await using (var target = File.Create(full))
        {
            await file.CopyToAsync(target, ct);
        }

        db.CompletionPhotos.Add(photo);
        await db.SaveChangesAsync(ct);
        return TypedResults.Created(Url(householdId, photo.Id), new PhotoDto(photo.Id, Url(householdId, photo.Id)));
    }

    private static async Task<IResult> GetAsync(Guid pid, HttpContext http, AppDbContext db, IConfiguration config, CancellationToken ct)
    {
        var householdId = HouseholdAccess.Current(http).HouseholdId;
        var photo = await db.CompletionPhotos.AsNoTracking()
            .SingleOrDefaultAsync(p => p.Id == pid && p.Completion.HouseholdId == householdId, ct);
        var full = photo is null ? null : System.IO.Path.Combine(PhotosDir(config), photo.Path);
        if (full is null || !File.Exists(full))
        {
            return TypedResults.NotFound();
        }

        http.Response.Headers.CacheControl = "private, max-age=31536000, immutable";
        return TypedResults.PhysicalFile(full, photo!.ContentType);
    }

    /// <summary>Relative to the API (the SPA adds /api).</summary>
    public static string Url(Guid householdId, Guid photoId) => $"/households/{householdId}/photos/{photoId}";

    /// <summary>The real type from the first bytes: the name and the Content-Type the browser sends are not trusted.</summary>
    private static async Task<string?> SniffAsync(IFormFile file, CancellationToken ct)
    {
        var head = new byte[12];
        await using var stream = file.OpenReadStream();
        var read = await stream.ReadAtLeastAsync(head, head.Length, throwOnEndOfStream: false, ct);
        if (read >= 3 && head[0] == 0xFF && head[1] == 0xD8 && head[2] == 0xFF)
        {
            return "image/jpeg";
        }

        if (read >= 8 && head.AsSpan(0, 8).SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }))
        {
            return "image/png";
        }

        return read >= 12 && head.AsSpan(0, 4).SequenceEqual("RIFF"u8) && head.AsSpan(8, 4).SequenceEqual("WEBP"u8) ? "image/webp" : null;
    }

    private static string Extension(string contentType) => contentType switch
    {
        "image/jpeg" => ".jpg",
        "image/png" => ".png",
        _ => ".webp",
    };
}

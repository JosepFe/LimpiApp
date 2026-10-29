using System.ComponentModel.DataAnnotations;
using LimpiApp.Api.Common;
using LimpiApp.Api.Data;
using LimpiApp.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.Api.Features.Products;

/// <summary>The household's cleaning products and how many tasks use each (E03/US-004).</summary>
public static class ProductsEndpoints
{
    public const string DefaultEmoji = "🧴";

    public sealed record ProductRequest([property: Required, MaxLength(60)] string Name, [property: MaxLength(16)] string? Emoji);

    public sealed record ProductDto(Guid Id, string Name, string Emoji, int TaskCount);

    public static IEndpointRouteBuilder MapProducts(this IEndpointRouteBuilder app)
    {
        var products = app.MapHouseholdGroup("/products");
        products.MapGet("/", ListAsync);
        products.MapPost("/", CreateAsync);
        products.MapDelete("/{id:guid}", ArchiveAsync);
        return app;
    }

    /// <summary>In the order they were added, counting only active tasks.</summary>
    private static async Task<IResult> ListAsync(HttpContext http, AppDbContext db, CancellationToken ct)
    {
        var householdId = HouseholdAccess.Current(http).HouseholdId;
        var products = await db.Products.AsNoTracking()
            .Where(p => p.HouseholdId == householdId && p.ArchivedAt == null)
            .OrderBy(p => p.CreatedAt).ThenBy(p => p.Id)
            .Select(p => new ProductDto(p.Id, p.Name, p.Emoji, p.Tasks.Count(t => t.ArchivedAt == null)))
            .ToListAsync(ct);
        return TypedResults.Ok(products);
    }

    private static async Task<IResult> CreateAsync(ProductRequest request, HttpContext http, AppDbContext db, Clock clock, CancellationToken ct)
    {
        var name = request.Name.Trim();
        if (name.Length == 0)
        {
            return TypedResults.ValidationProblem(new Dictionary<string, string[]> { ["name"] = ["El nombre es obligatorio."] });
        }

        var householdId = HouseholdAccess.Current(http).HouseholdId;
        var product = new Product { HouseholdId = householdId, Name = name, Emoji = string.IsNullOrWhiteSpace(request.Emoji) ? DefaultEmoji : request.Emoji, CreatedAt = clock.Now };
        db.Products.Add(product);
        await db.SaveChangesAsync(ct);
        return TypedResults.Created($"/households/{householdId}/products/{product.Id}", new ProductDto(product.Id, product.Name, product.Emoji, 0));
    }

    /// <summary>Archived: no longer offered for tasks; tasks that already had it keep it (E03 D3).</summary>
    private static async Task<IResult> ArchiveAsync(Guid id, HttpContext http, AppDbContext db, Clock clock, CancellationToken ct)
    {
        var householdId = HouseholdAccess.Current(http).HouseholdId;
        var now = clock.Now;
        var archived = await db.Products.Where(p => p.Id == id && p.HouseholdId == householdId && p.ArchivedAt == null)
            .ExecuteUpdateAsync(p => p.SetProperty(x => x.ArchivedAt, now), ct);
        return archived == 0 ? TypedResults.NotFound() : TypedResults.NoContent();
    }
}

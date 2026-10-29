using LimpiApp.Api.Data.Entities;
using LimpiApp.IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.IntegrationTests.Members;

/// <summary>The prototype household: Josep and Pau owners since 2 Mar 2026, Marta member since 18 Apr 2026, all signed in.</summary>
public sealed record MembersTestData(HttpClient Josep, HttpClient Pau, HttpClient Marta, Guid HouseholdId, Guid JosepId, Guid PauId, Guid MartaId)
{
    public static async Task<MembersTestData> CreateAsync(ApiFactory factory, bool withPau = true)
    {
        var ct = TestContext.Current.CancellationToken;
        var josep = await factory.SignedInAsync();
        var pau = await factory.SignedInAsync("pau@example.com");
        var marta = await factory.SignedInAsync("marta@example.com");
        var hid = await ApiFactory.CreateHouseholdAsync(josep, "Casa Pau y Josep", "kitchen");
        await using var db = factory.CreateDbContext();
        var users = await db.Users.ToDictionaryAsync(u => u.Email, ct);
        users["pau@example.com"].AvatarColor = "violet";
        users["marta@example.com"].AvatarColor = "amber";
        var march = new DateTimeOffset(2026, 3, 2, 9, 0, 0, TimeSpan.Zero);
        (await db.Memberships.SingleAsync(m => m.HouseholdId == hid, ct)).JoinedAt = march;
        if (withPau)
        {
            db.Memberships.Add(new Membership { UserId = users["pau@example.com"].Id, HouseholdId = hid, Role = MemberRole.Owner, JoinedAt = march.AddMinutes(5) });
        }

        // 23:30 in Madrid on 18 Apr is already 18 Apr there, 21:30 UTC.
        db.Memberships.Add(new Membership { UserId = users["marta@example.com"].Id, HouseholdId = hid, Role = MemberRole.Member, JoinedAt = new DateTimeOffset(2026, 4, 18, 21, 30, 0, TimeSpan.Zero) });
        await db.SaveChangesAsync(ct);
        return new MembersTestData(josep, pau, marta, hid, users["josep@example.com"].Id, users["pau@example.com"].Id, users["marta@example.com"].Id);
    }

    public string Url(Guid? uid = null) => uid is null ? $"/households/{HouseholdId}/members" : $"/households/{HouseholdId}/members/{uid}";
}

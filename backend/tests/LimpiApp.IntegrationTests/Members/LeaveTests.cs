using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LimpiApp.Api.Data.Entities;
using LimpiApp.IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace LimpiApp.IntegrationTests.Members;

public class LeaveTests(ApiFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Leave_RemovesMe_AndMyTasksBecomeUnassigned()
    {
        var data = await MembersTestData.CreateAsync(Factory);
        var (mine, others) = await AssignAsync(data, data.MartaId, data.PauId);

        Assert.Equal(HttpStatusCode.NoContent, (await data.Marta.DeleteAsync(data.Url(data.MartaId), Ct)).StatusCode);

        var members = await data.Josep.GetFromJsonAsync<JsonElement[]>(data.Url(), Ct);
        Assert.Equal(["Josep", "Pau"], members!.Select(m => m.GetProperty("name").GetString()));
        await using var db = Factory.CreateDbContext();
        Assert.Null((await db.Tasks.SingleAsync(t => t.Id == mine, Ct)).AssigneeId);
        Assert.Equal(data.PauId, (await db.Tasks.SingleAsync(t => t.Id == others, Ct)).AssigneeId);
        Assert.Equal(HttpStatusCode.NotFound, (await data.Marta.GetAsync(data.Url(), Ct)).StatusCode);
    }

    [Fact]
    public async Task Leave_AnOwnerWhileAnotherOwnerStays_IsAllowed()
    {
        var data = await MembersTestData.CreateAsync(Factory);

        Assert.Equal(HttpStatusCode.NoContent, (await data.Josep.DeleteAsync(data.Url(data.JosepId), Ct)).StatusCode);
    }

    [Fact]
    public async Task Leave_TheLastOwnerWithOtherMembers_Is409()
    {
        var data = await MembersTestData.CreateAsync(Factory, withPau: false);

        var response = await data.Josep.DeleteAsync(data.Url(data.JosepId), Ct);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(2, (await data.Josep.GetFromJsonAsync<JsonElement[]>(data.Url(), Ct))!.Length);
    }

    [Fact]
    public async Task Leave_TheLastOwnerAlone_IsAllowed()
    {
        var data = await MembersTestData.CreateAsync(Factory, withPau: false);
        Assert.Equal(HttpStatusCode.NoContent, (await data.Marta.DeleteAsync(data.Url(data.MartaId), Ct)).StatusCode);

        Assert.Equal(HttpStatusCode.NoContent, (await data.Josep.DeleteAsync(data.Url(data.JosepId), Ct)).StatusCode);
    }

    [Fact]
    public async Task Remove_AnotherMember_AsMember_Is403()
    {
        var data = await MembersTestData.CreateAsync(Factory);

        var response = await data.Marta.DeleteAsync(data.Url(data.PauId), Ct);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal(3, (await data.Josep.GetFromJsonAsync<JsonElement[]>(data.Url(), Ct))!.Length);
    }

    [Fact]
    public async Task Remove_AMember_AsOwner_UnassignsTheirTasks()
    {
        var data = await MembersTestData.CreateAsync(Factory);
        var (mine, _) = await AssignAsync(data, data.MartaId, data.PauId);

        Assert.Equal(HttpStatusCode.NoContent, (await data.Josep.DeleteAsync(data.Url(data.MartaId), Ct)).StatusCode);

        await using var db = Factory.CreateDbContext();
        Assert.Null((await db.Tasks.SingleAsync(t => t.Id == mine, Ct)).AssigneeId);
        Assert.False(await db.Memberships.AnyAsync(m => m.UserId == data.MartaId, Ct));
    }

    [Fact]
    public async Task Remove_SomeoneWhoIsNotAMember_Is404()
    {
        var data = await MembersTestData.CreateAsync(Factory);

        Assert.Equal(HttpStatusCode.NotFound, (await data.Josep.DeleteAsync(data.Url(Guid.CreateVersion7()), Ct)).StatusCode);
    }

    private async Task<(Guid Mine, Guid Others)> AssignAsync(MembersTestData data, Guid me, Guid other)
    {
        await using var db = Factory.CreateDbContext();
        var tasks = await db.Tasks.Where(t => t.HouseholdId == data.HouseholdId).OrderBy(t => t.Title).Take(2).ToListAsync(Ct);
        tasks[0].AssigneeId = me;
        tasks[1].AssigneeId = other;
        await db.SaveChangesAsync(Ct);
        return (tasks[0].Id, tasks[1].Id);
    }
}

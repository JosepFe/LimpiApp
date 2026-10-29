using LimpiApp.Api.Common;
using LimpiApp.Api.Data;
using LimpiApp.Api.Features.Health;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Db")
    ?? throw new InvalidOperationException("ConnectionStrings:Db is not configured.");
builder.Services.AddDbContext<AppDbContext>(options => AppDbContext.Configure(options, connectionString));

builder.Services.AddProblemDetails();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<Clock>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
}

app.UseExceptionHandler();
app.UseStatusCodePages();

app.MapHealth();

await app.RunAsync();

public partial class Program;

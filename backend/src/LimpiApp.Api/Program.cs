using LimpiApp.Api.Common;
using LimpiApp.Api.Features.Health;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<Clock>();

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

app.MapHealth();

app.Run();

public partial class Program;

using LimpiApp.Api.Common;
using LimpiApp.Api.Common.Email;
using LimpiApp.Api.Data;
using LimpiApp.Api.Features.Auth;
using LimpiApp.Api.Features.Health;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Db")
    ?? throw new InvalidOperationException("ConnectionStrings:Db is not configured.");
builder.Services.AddDbContext<AppDbContext>(options => AppDbContext.Configure(options, connectionString));

builder.Services.AddProblemDetails();
builder.Services.AddValidation();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<Clock>();
builder.Services.AddSingleton(SmtpSettings.FromConfiguration(builder.Configuration));
builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();
builder.Services.AddScoped<SessionService>();

builder.Services.AddAuthentication(SessionCookie.Scheme)
    .AddScheme<AuthenticationSchemeOptions, SessionAuthenticationHandler>(SessionCookie.Scheme, null);
builder.Services.AddAuthorization();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
}

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseAuthentication();
app.UseAuthorization();

app.MapHealth();
app.MapMagicLink();

await app.RunAsync();

public partial class Program;

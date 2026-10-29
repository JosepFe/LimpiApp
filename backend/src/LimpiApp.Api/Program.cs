using System.Text.Json;
using System.Text.Json.Serialization;
using LimpiApp.Api.Common;
using LimpiApp.Api.Common.Email;
using LimpiApp.Api.Data;
using LimpiApp.Api.Features.Auth;
using LimpiApp.Api.Features.Health;
using LimpiApp.Api.Features.Households;
using LimpiApp.Api.Features.Products;
using LimpiApp.Api.Features.Rooms;
using LimpiApp.Api.Features.Tasks;
using LimpiApp.Api.Features.Templates;
using LimpiApp.Api.Features.Today;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Db")
    ?? throw new InvalidOperationException("ConnectionStrings:Db is not configured.");
builder.Services.AddDbContext<AppDbContext>(options => AppDbContext.Configure(options, connectionString));

builder.Services.AddProblemDetails();
builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)));
builder.Services.AddValidation();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<Clock>();
builder.Services.AddSingleton(SmtpSettings.FromConfiguration(builder.Configuration));
builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();
builder.Services.AddScoped<SessionService>();

builder.Services.AddAuthentication(SessionCookie.Scheme)
    .AddScheme<AuthenticationSchemeOptions, SessionAuthenticationHandler>(SessionCookie.Scheme, null)
    .AddGoogleSignIn(builder.Configuration);

// nginx strips /api and terminates TLS (in production, behind Traefik): rebuild the public URL from its headers so
// that Google's redirect_uri is https://<host>/api/auth/google/callback. The API port is only reachable from nginx.
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedPrefix;
    o.KnownIPNetworks.Clear();
    o.KnownProxies.Clear();
});
builder.Services.AddAuthorization();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
}

app.UseForwardedHeaders();
app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseCsrfHeader();
app.UseAuthentication();
app.UseAuthorization();

app.MapHealth();
app.MapMagicLink();
app.MapGoogleSignIn();
app.MapMe();
app.MapTemplates();
app.MapHouseholds();
app.MapRooms();
app.MapTasks();
app.MapProducts();
app.MapToday();

await app.RunAsync();

public partial class Program;

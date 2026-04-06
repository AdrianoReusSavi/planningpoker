using PlanningPoker.Api.Hubs;
using PlanningPoker.Application.Interfaces;
using PlanningPoker.Application.Services;
using PlanningPoker.Infrastructure.Repositories;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHealthChecks();

builder.Services.AddSingleton<IRoomRepository, InMemoryRoomRepository>();
builder.Services.AddSingleton<IRoomService, RoomService>();

builder.Services.AddSignalR(options =>
{
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(60);
    options.HandshakeTimeout = TimeSpan.FromSeconds(15);
});

var allowedOriginsString = builder.Configuration["Cors:AllowedOrigins"];
var allowedOrigins = allowedOriginsString?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

if (allowedOrigins is null || allowedOrigins.Length == 0)
{
    throw new InvalidOperationException(
        "CORS:AllowedOrigins is not configured. Set it in appsettings.json or environment variables.");
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

app.UseCors("AllowFrontend");

app.MapHub<PlanningHub>("/planningHub");
app.MapHealthChecks("/health");

app.Run();
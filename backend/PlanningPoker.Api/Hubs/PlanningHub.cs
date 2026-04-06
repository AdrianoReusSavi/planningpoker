using Microsoft.AspNetCore.SignalR;

namespace PlanningPoker.Api.Hubs;

public class PlanningHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
    }
}
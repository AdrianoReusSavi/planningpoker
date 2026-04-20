using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using PlanningPoker.Application.Interfaces;
using PlanningPoker.Domain.Enums;

namespace PlanningPoker.Api.Hubs;

public class PlanningHub(
    IRoomService roomService,
    IHubContext<PlanningHub> hubContext,
    ILogger<PlanningHub> logger) : Hub
{
    private static readonly ConcurrentDictionary<string, CancellationTokenSource> DisconnectTimers = new();
    private static readonly ConcurrentDictionary<string, DateTime> LastActionTime = new();
    private static readonly TimeSpan ActionCooldown = TimeSpan.FromMilliseconds(200);
    private const int DisconnectTimeoutSeconds = 20;

    public async Task Ping()
        => await Clients.Caller.SendAsync("Pong");

    public async Task<string?> CreateRoom(string name, string roomName, EstimationOptions votingDeck)
    {
        var result = roomService.CreateRoom(name, roomName, votingDeck, Context.ConnectionId);
        if (result is null) return null;

        await Groups.AddToGroupAsync(Context.ConnectionId, result.RoomId);
        await Clients.Group(result.RoomId).SendAsync("STATE_SYNC", result.Snapshot);
        return result.PlayerId;
    }

    public async Task<string?> EnterRoom(string roomId, string name)
    {
        var result = roomService.EnterRoom(roomId, name, Context.ConnectionId);
        if (result is null) return null;

        await Groups.AddToGroupAsync(Context.ConnectionId, result.RoomId);
        await Clients.Group(result.RoomId).SendAsync("STATE_SYNC", result.Snapshot);
        return result.PlayerId;
    }

    public async Task WatchRoom(string roomId)
    {
        var snapshot = roomService.WatchRoom(roomId, Context.ConnectionId);
        if (snapshot is null) return;

        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        await Clients.Caller.SendAsync("STATE_SYNC", snapshot);
    }

    public async Task<bool> Reconnect(string roomId, string playerId)
    {
        var result = roomService.Reconnect(roomId, playerId, Context.ConnectionId);
        if (result is null) return false;

        CancelDisconnectTimer(playerId);
        await Groups.AddToGroupAsync(Context.ConnectionId, result.RoomId);
        await Clients.Group(result.RoomId).SendAsync("STATE_SYNC", result.Snapshot);
        return true;
    }

    public async Task GetRoomSettings()
    {
        var snapshot = roomService.GetRoomSettings(Context.ConnectionId);
        if (snapshot is not null)
            await Clients.Caller.SendAsync("STATE_SYNC", snapshot);
    }

    public async Task TransferOwnership(string roomId, string targetPlayerId)
    {
        var snapshot = roomService.TransferOwnership(roomId, targetPlayerId, Context.ConnectionId);
        if (snapshot is not null)
            await Clients.Group(roomId).SendAsync("STATE_SYNC", snapshot);
    }

    public async Task SubmitVote(string roomId, string vote)
    {
        if (!IsActionAllowed()) return;

        var snapshot = roomService.SubmitVote(roomId, vote, Context.ConnectionId);
        if (snapshot is not null)
            await Clients.Group(roomId).SendAsync("STATE_SYNC", snapshot);
    }

    public async Task RevealVotes(string roomId)
    {
        if (!IsActionAllowed()) return;

        var snapshot = roomService.RevealVotes(roomId, Context.ConnectionId);
        if (snapshot is not null)
            await Clients.Group(roomId).SendAsync("STATE_SYNC", snapshot);
    }

    public async Task ResetVotes(string roomId)
    {
        if (!IsActionAllowed()) return;

        var snapshot = roomService.ResetVotes(roomId, Context.ConnectionId);
        if (snapshot is not null)
            await Clients.Group(roomId).SendAsync("STATE_SYNC", snapshot);
    }

    public async Task KickPlayer(string roomId, string targetPlayerId)
    {
        var result = roomService.KickPlayer(roomId, targetPlayerId, Context.ConnectionId);
        if (result is null) return;

        LastActionTime.TryRemove(result.TargetConnectionId, out _);
        CancelDisconnectTimer(targetPlayerId);
        await Groups.RemoveFromGroupAsync(result.TargetConnectionId, roomId);
        await Clients.Client(result.TargetConnectionId).SendAsync("KICKED");
        await Clients.Group(roomId).SendAsync("STATE_SYNC", result.Snapshot);
    }

    public async Task ToggleBreakRequest(string roomId)
    {
        if (!IsActionAllowed()) return;

        var snapshot = roomService.ToggleBreakRequest(roomId, Context.ConnectionId);
        if (snapshot is not null)
            await Clients.Group(roomId).SendAsync("STATE_SYNC", snapshot);
    }

    public async Task ClearBreakRequests(string roomId)
    {
        if (!IsActionAllowed()) return;

        var snapshot = roomService.ClearBreakRequests(roomId, Context.ConnectionId);
        if (snapshot is not null)
            await Clients.Group(roomId).SendAsync("STATE_SYNC", snapshot);
    }

    public async Task SendReaction(string roomId, string reaction)
    {
        if (!IsActionAllowed()) return;

        var result = roomService.ValidateReaction(roomId, reaction, Context.ConnectionId);
        if (result is not null)
            await Clients.Group(result.RoomId).SendAsync("REACTION", result.Reaction);
    }

    public async Task UpdateStyle(string roomId, string? style, string? pattern, string? patternColor)
    {
        if (!IsActionAllowed()) return;

        var snapshot = roomService.UpdateStyle(roomId, style, pattern, patternColor, Context.ConnectionId);
        if (snapshot is not null)
            await Clients.Group(roomId).SendAsync("STATE_SYNC", snapshot);
    }

    public async Task LeaveRoom(string roomId)
    {
        var result = roomService.LeaveRoom(roomId, Context.ConnectionId);
        if (result is null) return;

        if (result.PlayerId is not null)
            CancelDisconnectTimer(result.PlayerId);

        LastActionTime.TryRemove(Context.ConnectionId, out _);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);

        if (result.Snapshot is not null)
            await Clients.Group(roomId).SendAsync("STATE_SYNC", result.Snapshot);
    }

    public override async Task OnDisconnectedAsync(Exception? ex)
    {
        LastActionTime.TryRemove(Context.ConnectionId, out _);

        var result = roomService.HandleDisconnect(Context.ConnectionId);
        if (result is not null)
        {
            await Clients.Group(result.RoomId).SendAsync("STATE_SYNC", result.Snapshot);
            StartDisconnectTimer(result.RoomId, result.PlayerId);
        }

        await base.OnDisconnectedAsync(ex);
    }

    private bool IsActionAllowed()
    {
        var now = DateTime.UtcNow;
        var connId = Context.ConnectionId;
        if (LastActionTime.TryGetValue(connId, out var last) && now - last < ActionCooldown)
            return false;
        LastActionTime[connId] = now;
        return true;
    }

    private static void CancelDisconnectTimer(string playerId)
    {
        if (DisconnectTimers.TryRemove(playerId, out var cts))
            cts.Cancel();
    }

    private void StartDisconnectTimer(string roomId, string playerId)
    {
        var cts = new CancellationTokenSource();
        DisconnectTimers[playerId] = cts;

        var service = roomService;
        var context = hubContext;
        var log = logger;

        _ = Task.Run(async () =>
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(DisconnectTimeoutSeconds), cts.Token);
                DisconnectTimers.TryRemove(playerId, out _);
                var removal = service.PermanentlyRemovePlayer(roomId, playerId);
                if (removal.Snapshot is not null)
                    await context.Clients.Group(roomId).SendAsync("STATE_SYNC", removal.Snapshot);
            }
            catch (OperationCanceledException) { }
            catch (Exception removeEx)
            {
                log.LogError(removeEx, "Error removing player {PlayerId} from room {RoomId}", playerId, roomId);
            }
        });
    }
}
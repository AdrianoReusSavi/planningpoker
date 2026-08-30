using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using PlanningPoker.Api.Contracts;
using PlanningPoker.Application.Interfaces;
using PlanningPoker.Domain.Enums;
using PlanningPoker.Domain.Snapshots;

namespace PlanningPoker.Api.Hubs;

public class PlanningHub(
    IRoomService roomService,
    IHubContext<PlanningHub> hubContext,
    ILogger<PlanningHub> logger) : Hub
{
    private static readonly ConcurrentDictionary<string, CancellationTokenSource> DisconnectTimers = new();
    private static readonly ConcurrentDictionary<string, CancellationTokenSource> AutoRevealTimers = new();
    private static readonly ConcurrentDictionary<string, DateTime> LastActionTime = new();
    private static readonly TimeSpan ActionCooldown = TimeSpan.FromMilliseconds(200);
    private const int DisconnectTimeoutSeconds = 300;

    public async Task Ping()
        => await Clients.Caller.SendAsync("Pong");

    public async Task<JoinRoomResponse> CreateRoom(string name, string roomName, EstimationOptions votingDeck, bool asWatcher)
    {
        var outcome = roomService.CreateRoom(name, roomName, votingDeck, asWatcher, Context.ConnectionId);
        if (outcome.Created is null) return JoinRoomResponse.Rejected(outcome.Error);

        await Groups.AddToGroupAsync(Context.ConnectionId, outcome.Created.RoomId);
        await Clients.Group(outcome.Created.RoomId).SendAsync("STATE_SYNC", outcome.Created.Snapshot);
        return JoinRoomResponse.Accepted(outcome.Created.ParticipantId);
    }

    public async Task<JoinRoomResponse> EnterRoom(string roomId, string name)
    {
        var outcome = roomService.EnterRoom(roomId, name, Context.ConnectionId);
        if (outcome.Joined is null) return JoinRoomResponse.Rejected(outcome.Error);

        await Groups.AddToGroupAsync(Context.ConnectionId, outcome.Joined.RoomId);
        await Clients.Group(outcome.Joined.RoomId).SendAsync("STATE_SYNC", outcome.Joined.Snapshot);
        EvaluateAutoReveal(outcome.Joined.RoomId, outcome.Joined.Snapshot);
        return JoinRoomResponse.Accepted(outcome.Joined.PlayerId);
    }

    public async Task<JoinRoomResponse> WatchRoom(string roomId, string name)
    {
        var outcome = roomService.WatchRoom(roomId, name, Context.ConnectionId);
        if (outcome.Joined is null) return JoinRoomResponse.Rejected(outcome.Error);

        await Groups.AddToGroupAsync(Context.ConnectionId, outcome.Joined.RoomId);
        await Clients.Group(outcome.Joined.RoomId).SendAsync("STATE_SYNC", outcome.Joined.Snapshot);
        return JoinRoomResponse.Accepted(outcome.Joined.WatcherId);
    }

    public async Task<JoinRoomResponse> TakeSeat(string roomId)
    {
        var outcome = roomService.TakeSeat(roomId, Context.ConnectionId);
        if (outcome.Joined is null) return JoinRoomResponse.Rejected(outcome.Error);

        await Clients.Group(outcome.Joined.RoomId).SendAsync("STATE_SYNC", outcome.Joined.Snapshot);
        EvaluateAutoReveal(outcome.Joined.RoomId, outcome.Joined.Snapshot);
        return JoinRoomResponse.Accepted(outcome.Joined.PlayerId);
    }

    public async Task<JoinRoomResponse> LeaveSeat(string roomId)
    {
        var outcome = roomService.LeaveSeat(roomId, Context.ConnectionId);
        if (outcome.Joined is null) return JoinRoomResponse.Rejected(outcome.Error);

        await Clients.Group(outcome.Joined.RoomId).SendAsync("STATE_SYNC", outcome.Joined.Snapshot);
        EvaluateAutoReveal(outcome.Joined.RoomId, outcome.Joined.Snapshot);
        return JoinRoomResponse.Accepted(outcome.Joined.WatcherId);
    }

    public async Task UpdateWatcherAppearance(string roomId, string accent, int character)
    {
        if (!IsActionAllowed()) return;

        var snapshot = roomService.UpdateWatcherAppearance(roomId, accent, character, Context.ConnectionId);
        if (snapshot is not null)
            await Clients.Group(roomId).SendAsync("STATE_SYNC", snapshot);
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

    public string? GetRoomName(string roomId)
        => roomService.GetRoomName(roomId);

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
        if (snapshot is null) return;

        await Clients.Group(roomId).SendAsync("STATE_SYNC", snapshot);
        EvaluateAutoReveal(roomId, snapshot, restart: true);
    }

    public async Task SetAutoReveal(string roomId, bool enabled)
    {
        if (!IsActionAllowed()) return;

        var snapshot = roomService.SetAutoReveal(roomId, enabled, Context.ConnectionId);
        if (snapshot is null) return;

        await Clients.Group(roomId).SendAsync("STATE_SYNC", snapshot);
        EvaluateAutoReveal(roomId, snapshot, restart: true);
    }

    public async Task ClearVote(string roomId)
    {
        if (!IsActionAllowed()) return;

        var snapshot = roomService.ClearVote(roomId, Context.ConnectionId);
        if (snapshot is null) return;

        await Clients.Group(roomId).SendAsync("STATE_SYNC", snapshot);
        EvaluateAutoReveal(roomId, snapshot, restart: true);
    }

    public async Task RevealVotes(string roomId)
    {
        if (!IsActionAllowed()) return;

        var snapshot = roomService.RevealVotes(roomId, Context.ConnectionId);
        if (snapshot is null) return;

        await Clients.Group(roomId).SendAsync("STATE_SYNC", snapshot);
        EvaluateAutoReveal(roomId, snapshot);
    }

    public async Task ResetVotes(string roomId)
    {
        if (!IsActionAllowed()) return;

        var snapshot = roomService.ResetVotes(roomId, Context.ConnectionId);
        if (snapshot is null) return;

        await Clients.Group(roomId).SendAsync("STATE_SYNC", snapshot);
        EvaluateAutoReveal(roomId, snapshot);
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
        EvaluateAutoReveal(roomId, result.Snapshot);
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
        if (result is null) return;

        await Clients.Group(result.RoomId).SendAsync("REACTION", new
        {
            reaction = result.Reaction,
            fromPlayerId = result.FromPlayerId,
        });
    }

    public async Task ThrowItem(string roomId, string targetPlayerId, string item)
    {
        if (!IsActionAllowed()) return;

        var result = roomService.ValidateThrow(roomId, targetPlayerId, item, Context.ConnectionId);
        if (result is null) return;

        await Clients.Group(result.RoomId).SendAsync("THROW", new
        {
            fromPlayerId = result.FromPlayerId,
            toPlayerId = result.ToPlayerId,
            item = result.Item,
        });
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
        {
            await Clients.Group(roomId).SendAsync("STATE_SYNC", result.Snapshot);
            EvaluateAutoReveal(roomId, result.Snapshot);
        }
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

    private void EvaluateAutoReveal(string roomId, RoomSnapshot snapshot, bool restart = false)
        => EvaluateAutoReveal(roomService, hubContext, roomId, snapshot, restart);

    private static void EvaluateAutoReveal(
        IRoomService service,
        IHubContext<PlanningHub> context,
        string roomId,
        RoomSnapshot snapshot,
        bool restart = false)
    {
        if (!snapshot.AutoRevealEnabled || !snapshot.EveryoneVoted)
        {
            CancelAutoReveal(roomId);
            return;
        }

        if (!restart && AutoRevealTimers.ContainsKey(roomId))
            return;

        CancelAutoReveal(roomId);
        var cts = new CancellationTokenSource();
        AutoRevealTimers[roomId] = cts;

        _ = Task.Run(async () =>
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(snapshot.AutoRevealSeconds), cts.Token);
                AutoRevealTimers.TryRemove(roomId, out _);

                var revealed = service.AutoReveal(roomId);
                if (revealed is not null)
                    await context.Clients.Group(roomId).SendAsync("STATE_SYNC", revealed);
            }
            catch (OperationCanceledException) { }
        });
    }

    private static void CancelAutoReveal(string roomId)
    {
        if (AutoRevealTimers.TryRemove(roomId, out var cts))
            cts.Cancel();
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
                {
                    await context.Clients.Group(roomId).SendAsync("STATE_SYNC", removal.Snapshot);
                    EvaluateAutoReveal(service, context, roomId, removal.Snapshot);
                }
            }
            catch (OperationCanceledException) { }
            catch (Exception removeEx)
            {
                log.LogError(removeEx, "Error removing player {PlayerId} from room {RoomId}", playerId, roomId);
            }
        });
    }
}
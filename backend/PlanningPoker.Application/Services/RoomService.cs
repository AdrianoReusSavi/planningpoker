using PlanningPoker.Application.Results;
using PlanningPoker.Application.Interfaces;
using PlanningPoker.Domain.Entities;
using PlanningPoker.Domain.Enums;
using PlanningPoker.Domain.Snapshots;

namespace PlanningPoker.Application.Services;

public class RoomService(IRoomRepository repository) : IRoomService
{
    public CreateRoomResult? CreateRoom(string name, string roomName, EstimationOptions votingDeck, string connectionId)
    {
        if (!ValidateName(name) || !ValidateRoomName(roomName) || !Enum.IsDefined(votingDeck))
            return null;

        if (repository.HasConnection(connectionId))
            return null;

        var roomId = Guid.NewGuid().ToString();
        var playerId = Guid.NewGuid().ToString();
        var room = new Room
        {
            RoomId = roomId,
            RoomName = roomName.Trim(),
            OwnerId = playerId,
            VotingDeck = votingDeck
        };
        room.StartVoting();

        if (!repository.TryAddRoom(room))
            return null;

        room.AddUser(new User { PlayerId = playerId, ConnectionId = connectionId, Username = name.Trim() });
        repository.MapConnection(connectionId, roomId);

        return new CreateRoomResult(roomId, playerId, room.ToSnapshot());
    }

    public EnterRoomResult? EnterRoom(string roomId, string name, string connectionId)
    {
        if (!ValidateName(name) || string.IsNullOrWhiteSpace(roomId))
            return null;

        var room = repository.GetRoom(roomId);
        if (room is null || room.PlayerCount >= Room.MaxPlayersPerRoom)
            return null;

        var playerId = Guid.NewGuid().ToString();
        room.AddUser(new User { PlayerId = playerId, ConnectionId = connectionId, Username = name.Trim() });
        repository.MapConnection(connectionId, roomId);

        return new EnterRoomResult(roomId, playerId, room.ToSnapshot());
    }

    public RoomSnapshot? WatchRoom(string roomId, string connectionId)
    {
        if (string.IsNullOrWhiteSpace(roomId))
            return null;

        var room = repository.GetRoom(roomId);
        if (room is null)
            return null;

        repository.MapConnection(connectionId, roomId);
        return room.ToSnapshot();
    }

    public ReconnectResult? Reconnect(string roomId, string playerId, string connectionId)
    {
        if (string.IsNullOrWhiteSpace(roomId) || string.IsNullOrWhiteSpace(playerId))
            return null;

        var room = repository.GetRoom(roomId);
        if (room is null)
            return null;

        var user = room.FindByPlayerId(playerId);
        if (user is null)
            return null;

        var oldConnectionId = user.ConnectionId;
        repository.UnmapConnection(oldConnectionId);
        room.Reconnect(playerId, connectionId);
        repository.MapConnection(connectionId, roomId);

        return new ReconnectResult(roomId, oldConnectionId, room.ToSnapshot());
    }

    public RoomSnapshot? GetRoomSettings(string connectionId)
    {
        var roomId = repository.GetRoomIdByConnection(connectionId);
        if (roomId is null)
            return null;

        return repository.GetRoom(roomId)?.ToSnapshot();
    }

    public RoomSnapshot? TransferOwnership(string roomId, string targetPlayerId, string connectionId)
    {
        if (string.IsNullOrWhiteSpace(roomId) || string.IsNullOrWhiteSpace(targetPlayerId))
            return null;

        var room = repository.GetRoom(roomId);
        if (room is null)
            return null;

        var caller = room.FindByConnectionId(connectionId);
        if (caller is null)
            return null;

        try
        {
            room.TransferOwnership(caller.PlayerId, targetPlayerId);
            return room.ToSnapshot();
        }
        catch (InvalidOperationException) { return null; }
    }

    public RoomSnapshot? SubmitVote(string roomId, string vote, string connectionId)
    {
        if (string.IsNullOrWhiteSpace(roomId) || string.IsNullOrWhiteSpace(vote) || vote.Length > Room.MaxVoteLength)
            return null;

        var room = repository.GetRoom(roomId);
        if (room is null)
            return null;

        var user = room.FindByConnectionId(connectionId);
        if (user is null)
            return null;

        try
        {
            room.SubmitVote(user.PlayerId, vote);
            return room.ToSnapshot();
        }
        catch (InvalidOperationException) { return null; }
    }

    public RoomSnapshot? RevealVotes(string roomId, string connectionId)
    {
        if (string.IsNullOrWhiteSpace(roomId))
            return null;

        var room = repository.GetRoom(roomId);
        if (room is null)
            return null;

        var user = room.FindByConnectionId(connectionId);
        if (user is null || room.OwnerId != user.PlayerId)
            return null;

        try
        {
            room.Reveal();
            return room.ToSnapshot();
        }
        catch (InvalidOperationException) { return null; }
    }

    public RoomSnapshot? ResetVotes(string roomId, string connectionId)
    {
        if (string.IsNullOrWhiteSpace(roomId))
            return null;

        var room = repository.GetRoom(roomId);
        if (room is null)
            return null;

        var user = room.FindByConnectionId(connectionId);
        if (user is null || room.OwnerId != user.PlayerId)
            return null;

        try
        {
            room.Reset();
            return room.ToSnapshot();
        }
        catch (InvalidOperationException) { return null; }
    }

    public KickResult? KickPlayer(string roomId, string targetPlayerId, string connectionId)
    {
        if (string.IsNullOrWhiteSpace(roomId) || string.IsNullOrWhiteSpace(targetPlayerId))
            return null;

        var room = repository.GetRoom(roomId);
        if (room is null)
            return null;

        var caller = room.FindByConnectionId(connectionId);
        if (caller is null || room.OwnerId != caller.PlayerId)
            return null;

        if (caller.PlayerId == targetPlayerId)
            return null;

        var target = room.FindByPlayerId(targetPlayerId);
        if (target is null)
            return null;

        var targetConnectionId = target.ConnectionId;
        repository.UnmapConnection(targetConnectionId);
        room.RemoveUser(targetPlayerId);

        return new KickResult(roomId, targetConnectionId, room.ToSnapshot());
    }

    public RoomSnapshot? ToggleBreakRequest(string roomId, string connectionId)
    {
        if (string.IsNullOrWhiteSpace(roomId))
            return null;

        var room = repository.GetRoom(roomId);
        if (room is null)
            return null;

        var user = room.FindByConnectionId(connectionId);
        if (user is null)
            return null;

        try
        {
            room.ToggleBreakRequest(user.PlayerId);
            return room.ToSnapshot();
        }
        catch (InvalidOperationException) { return null; }
    }

    public RoomSnapshot? ClearBreakRequests(string roomId, string connectionId)
    {
        if (string.IsNullOrWhiteSpace(roomId))
            return null;

        var room = repository.GetRoom(roomId);
        if (room is null)
            return null;

        var caller = room.FindByConnectionId(connectionId);
        if (caller is null || room.OwnerId != caller.PlayerId)
            return null;

        room.ClearBreakRequests();
        return room.ToSnapshot();
    }

    public LeaveResult? LeaveRoom(string roomId, string connectionId)
    {
        if (string.IsNullOrWhiteSpace(roomId))
            return null;

        var room = repository.GetRoom(roomId);
        if (room is null)
            return null;

        var user = room.FindByConnectionId(connectionId);
        repository.UnmapConnection(connectionId);

        if (user is null)
            return new LeaveResult(null, roomId, null);

        room.SetDisconnected(connectionId);
        var removal = PermanentlyRemovePlayer(roomId, user.PlayerId);

        return new LeaveResult(user.PlayerId, roomId, removal.Snapshot);
    }

    public DisconnectResult? HandleDisconnect(string connectionId)
    {
        var roomId = repository.GetRoomIdByConnection(connectionId);
        if (roomId is null)
            return null;

        var room = repository.GetRoom(roomId);
        if (room is null)
            return null;

        var user = room.FindByConnectionId(connectionId);
        if (user is null)
            return null;

        room.SetDisconnected(connectionId);
        repository.UnmapConnection(connectionId);

        return new DisconnectResult(roomId, user.PlayerId, room.ToSnapshot());
    }

    public RemovalResult PermanentlyRemovePlayer(string roomId, string playerId)
    {
        var room = repository.GetRoom(roomId);
        if (room is null)
            return new RemovalResult(true, null);

        var user = room.FindByPlayerId(playerId);
        if (user is null || user.Connected)
            return new RemovalResult(false, null);

        room.RemoveUser(playerId);
        room.TransferOwnerIfNeeded(playerId);

        if (room.IsEmpty)
        {
            repository.TryRemoveRoom(roomId);
            return new RemovalResult(true, null);
        }

        return new RemovalResult(false, room.ToSnapshot());
    }

    private static bool ValidateName(string? name)
        => !string.IsNullOrWhiteSpace(name) && name.Trim().Length <= Room.MaxNameLength;

    private static bool ValidateRoomName(string? roomName)
        => !string.IsNullOrWhiteSpace(roomName) && roomName.Trim().Length <= Room.MaxRoomNameLength;
}
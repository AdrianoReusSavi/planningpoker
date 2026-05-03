using System.Text.RegularExpressions;
using PlanningPoker.Application.Results;
using PlanningPoker.Application.Interfaces;
using PlanningPoker.Domain.Entities;
using PlanningPoker.Domain.Enums;
using PlanningPoker.Domain.Snapshots;

namespace PlanningPoker.Application.Services;

public partial class RoomService(IRoomRepository repository) : IRoomService
{
    private static readonly HashSet<string> AllowedReactions = new(StringComparer.Ordinal)
    {
        "like", "dislike", "thinking", "celebrate", "question", "laugh", "cry"
    };

    private static readonly HashSet<string> AllowedThrowItems = new(StringComparer.Ordinal)
    {
        "turtle", "tomato", "heart", "confused", "rocket"
    };

    private static readonly HashSet<string> AllowedPatterns = new(StringComparer.Ordinal)
    {
        "stripes", "dots", "grid", "waves", "zigzag", "none"
    };

    [GeneratedRegex(@"^#[0-9a-fA-F]{6}$")]
    private static partial Regex SolidColorRegex();

    [GeneratedRegex(@"^linear-gradient\((\d{1,3})deg, #[0-9a-fA-F]{6}, #[0-9a-fA-F]{6}\)$")]
    private static partial Regex GradientRegex();

    // ── Room lifecycle ──

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

    // ── Ownership ──

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

    // ── Voting ──

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

    // ── Player management ──

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

    // ── Break requests ──

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

    // ── Player interactions (reactions, style) ──

    public ReactionResult? ValidateReaction(string roomId, string reaction, string connectionId)
    {
        if (string.IsNullOrWhiteSpace(roomId) || reaction is null || !AllowedReactions.Contains(reaction))
            return null;

        var room = repository.GetRoom(roomId);
        if (room is null)
            return null;

        var sender = room.FindByConnectionId(connectionId);
        if (sender is null)
            return null;

        return new ReactionResult(roomId, reaction, sender.PlayerId);
    }

    public ThrowResult? ValidateThrow(string roomId, string targetPlayerId, string item, string connectionId)
    {
        if (string.IsNullOrWhiteSpace(roomId) || string.IsNullOrWhiteSpace(targetPlayerId)
            || item is null || !AllowedThrowItems.Contains(item))
            return null;

        var room = repository.GetRoom(roomId);
        if (room is null)
            return null;

        var sender = room.FindByConnectionId(connectionId);
        if (sender is null || sender.PlayerId == targetPlayerId)
            return null;

        if (room.FindByPlayerId(targetPlayerId) is null)
            return null;

        return new ThrowResult(roomId, sender.PlayerId, targetPlayerId, item);
    }

    public RoomSnapshot? UpdateStyle(string roomId, string? style, string? pattern, string? patternColor, string connectionId)
    {
        if (string.IsNullOrWhiteSpace(roomId))
            return null;

        if (style is not null && !IsValidStyle(style))
            return null;

        if (pattern is not null && !AllowedPatterns.Contains(pattern))
            return null;

        if (patternColor is not null && !SolidColorRegex().IsMatch(patternColor))
            return null;

        var room = repository.GetRoom(roomId);
        if (room is null)
            return null;

        var user = room.FindByConnectionId(connectionId);
        if (user is null)
            return null;

        try
        {
            room.SetCardStyle(user.PlayerId, style, pattern, patternColor);
            return room.ToSnapshot();
        }
        catch (InvalidOperationException) { return null; }
    }

    // ── Exit flow ──

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

    // ── Private helpers ──

    private static bool IsValidStyle(string style)
    {
        if (SolidColorRegex().IsMatch(style))
            return true;

        var gradientMatch = GradientRegex().Match(style);
        return gradientMatch.Success
            && int.TryParse(gradientMatch.Groups[1].Value, out var angle)
            && angle is >= 0 and <= 360;
    }

    private static bool ValidateName(string? name)
        => !string.IsNullOrWhiteSpace(name) && name.Trim().Length <= Room.MaxNameLength;

    private static bool ValidateRoomName(string? roomName)
        => !string.IsNullOrWhiteSpace(roomName) && roomName.Trim().Length <= Room.MaxRoomNameLength;
}
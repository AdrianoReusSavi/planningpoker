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
        "like", "dislike", "thinking", "celebrate", "question", "laugh", "cry", "coffee"
    };

    private static readonly HashSet<string> AllowedThrowItems = new(StringComparer.Ordinal)
    {
        "turtle", "tomato", "heart", "confused", "rocket", "paper"
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

    public EnterRoomOutcome EnterRoom(string roomId, string name, string connectionId)
    {
        if (!ValidateName(name))
            return EnterRoomOutcome.Failed(RoomJoinError.InvalidName);

        if (string.IsNullOrWhiteSpace(roomId))
            return EnterRoomOutcome.Failed(RoomJoinError.RoomNotFound);

        var room = repository.GetRoom(roomId);
        if (room is null)
            return EnterRoomOutcome.Failed(RoomJoinError.RoomNotFound);

        if (room.PlayerCount >= Room.MaxPlayersPerRoom)
            return EnterRoomOutcome.Failed(RoomJoinError.RoomFull);

        var playerId = Guid.NewGuid().ToString();
        room.AddUser(new User { PlayerId = playerId, ConnectionId = connectionId, Username = name.Trim() });
        repository.MapConnection(connectionId, roomId);

        return EnterRoomOutcome.Success(new EnterRoomResult(roomId, playerId, room.ToSnapshot()));
    }

    public WatchRoomOutcome WatchRoom(string roomId, string name, string connectionId)
    {
        if (!ValidateName(name))
            return WatchRoomOutcome.Failed(RoomJoinError.InvalidName);

        if (string.IsNullOrWhiteSpace(roomId))
            return WatchRoomOutcome.Failed(RoomJoinError.RoomNotFound);

        var room = repository.GetRoom(roomId);
        if (room is null)
            return WatchRoomOutcome.Failed(RoomJoinError.RoomNotFound);

        if (room.Watchers.Count >= Room.MaxWatchersPerRoom)
            return WatchRoomOutcome.Failed(RoomJoinError.RoomFull);

        if (repository.HasConnection(connectionId))
            return WatchRoomOutcome.Failed(RoomJoinError.AlreadyInRoom);

        var watcherId = Guid.NewGuid().ToString();
        var (accents, characters) = room.UsedLooks();
        room.AddWatcher(new Watcher
        {
            WatcherId = watcherId,
            ConnectionId = connectionId,
            Username = name.Trim(),
            Accent = NextAccent(accents),
            Character = NextCharacter(characters),
        });
        repository.MapConnection(connectionId, roomId);

        return WatchRoomOutcome.Success(new WatchRoomResult(roomId, watcherId, room.ToSnapshot()));
    }

    public RoomSnapshot? UpdateWatcherAppearance(string roomId, string accent, int character, string connectionId)
    {
        if (string.IsNullOrWhiteSpace(roomId) || accent is null || !SolidColorRegex().IsMatch(accent))
            return null;

        if (character < 0 || character >= Room.WatcherCharacterCount)
            return null;

        var room = repository.GetRoom(roomId);
        if (room is null)
            return null;

        var watcher = room.FindWatcherByConnectionId(connectionId);
        if (watcher is null)
            return null;

        room.SetWatcherAppearance(watcher.WatcherId, accent, character);
        return room.ToSnapshot();
    }

    private static string NextAccent(IReadOnlyList<string> taken) =>
        WatcherAccents.FirstOrDefault(a => !taken.Contains(a)) ?? WatcherAccents[taken.Count % WatcherAccents.Length];

    private static int NextCharacter(IReadOnlyList<int> taken)
    {
        for (var i = 0; i < Room.WatcherCharacterCount; i++)
            if (!taken.Contains(i)) return i;
        return taken.Count % Room.WatcherCharacterCount;
    }

    private static readonly string[] WatcherAccents =
    [
        "#f472b6", "#38bdf8", "#fbbf24", "#4ade80", "#a78bfa",
        "#fb923c", "#22d3ee", "#f87171", "#a3e635", "#e879f9",
    ];

    public ReconnectResult? Reconnect(string roomId, string playerId, string connectionId)
    {
        if (string.IsNullOrWhiteSpace(roomId) || string.IsNullOrWhiteSpace(playerId))
            return null;

        var room = repository.GetRoom(roomId);
        if (room is null)
            return null;

        var user = room.FindByPlayerId(playerId);
        if (user is null)
        {
            var watcher = room.FindWatcherById(playerId);
            if (watcher is null)
                return null;

            var oldWatcherConnection = watcher.ConnectionId;
            repository.UnmapConnection(oldWatcherConnection);
            room.ReconnectWatcher(playerId, connectionId);
            repository.MapConnection(connectionId, roomId);

            return new ReconnectResult(roomId, oldWatcherConnection, room.ToSnapshot());
        }

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

        var callerId = ParticipantId(room, connectionId);
        if (callerId is null)
            return null;

        try
        {
            room.TransferOwnership(callerId, targetPlayerId);
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

        if (!IsOwnedBy(room, connectionId))
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

        if (!IsOwnedBy(room, connectionId))
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

        var callerId = ParticipantId(room, connectionId);
        if (callerId is null || room.OwnerId != callerId)
            return null;

        if (callerId == targetPlayerId)
            return null;

        var target = room.FindByPlayerId(targetPlayerId);
        if (target is null)
            return null;

        var targetConnectionId = target.ConnectionId;
        repository.UnmapConnection(targetConnectionId);
        room.RemoveUser(targetPlayerId);

        var snapshot = room.ToSnapshot();
        if (room.IsEmpty)
            repository.TryRemoveRoom(roomId);

        return new KickResult(roomId, targetConnectionId, snapshot);
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

        if (!IsOwnedBy(room, connectionId))
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

        var senderId = ParticipantId(room, connectionId);
        if (senderId is null)
            return null;

        return new ReactionResult(roomId, reaction, senderId);
    }

    public ThrowResult? ValidateThrow(string roomId, string targetPlayerId, string item, string connectionId)
    {
        if (string.IsNullOrWhiteSpace(roomId) || string.IsNullOrWhiteSpace(targetPlayerId)
            || item is null || !AllowedThrowItems.Contains(item))
            return null;

        var room = repository.GetRoom(roomId);
        if (room is null)
            return null;

        var senderId = ParticipantId(room, connectionId);
        if (senderId is null || senderId == targetPlayerId)
            return null;

        if (room.FindByPlayerId(targetPlayerId) is null && room.FindWatcherById(targetPlayerId) is null)
            return null;

        return new ThrowResult(roomId, senderId, targetPlayerId, item);
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
        {
            var watcher = room.FindWatcherByConnectionId(connectionId);
            if (watcher is null)
                return new LeaveResult(null, roomId, null);

            room.RemoveWatcher(watcher.WatcherId);
            var watcherRemoval = FinishRemoval(room, roomId, watcher.WatcherId);
            return new LeaveResult(watcher.WatcherId, roomId, watcherRemoval.Snapshot);
        }

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

        var participantId = ParticipantId(room, connectionId);
        if (participantId is null)
            return null;

        room.SetDisconnected(connectionId);
        repository.UnmapConnection(connectionId);

        return new DisconnectResult(roomId, participantId, room.ToSnapshot());
    }

    public RemovalResult PermanentlyRemovePlayer(string roomId, string playerId)
    {
        var room = repository.GetRoom(roomId);
        if (room is null)
            return new RemovalResult(true, null);

        var user = room.FindByPlayerId(playerId);
        if (user is null)
        {
            var watcher = room.FindWatcherById(playerId);
            if (watcher is null || watcher.Connected)
                return new RemovalResult(false, null);

            room.RemoveWatcher(playerId);
            return FinishRemoval(room, roomId, playerId);
        }

        if (user.Connected)
            return new RemovalResult(false, null);

        room.RemoveUser(playerId);
        return FinishRemoval(room, roomId, playerId);
    }

    // ── Private helpers ──

    private static string? ParticipantId(Room room, string connectionId)
        => room.FindByConnectionId(connectionId)?.PlayerId
            ?? room.FindWatcherByConnectionId(connectionId)?.WatcherId;

    private static bool IsOwnedBy(Room room, string connectionId)
        => ParticipantId(room, connectionId) is { } participantId && room.OwnerId == participantId;

    private RemovalResult FinishRemoval(Room room, string roomId, string departedParticipantId)
    {
        room.TransferOwnerIfNeeded(departedParticipantId);

        if (room.IsEmpty)
        {
            repository.TryRemoveRoom(roomId);
            return new RemovalResult(true, null);
        }

        return new RemovalResult(false, room.ToSnapshot());
    }

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
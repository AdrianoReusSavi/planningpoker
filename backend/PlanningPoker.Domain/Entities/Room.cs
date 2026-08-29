using PlanningPoker.Domain.Enums;
using PlanningPoker.Domain.Snapshots;
using PlanningPoker.Domain.ValueObjects;

namespace PlanningPoker.Domain.Entities;

public class Room
{
    private readonly ReaderWriterLockSlim _lock = new();

    public required string RoomId { get; set; }
    public required string OwnerId { get; set; }
    public required string RoomName { get; set; }
    public List<User> Users { get; set; } = [];
    public List<Watcher> Watchers { get; } = [];
    public EstimationOptions VotingDeck { get; set; }
    public RoomPhase Phase { get; private set; } = RoomPhase.Waiting;

    private readonly List<RoundRecord> _history = [];
    private readonly HashSet<string> _breakRequesters = [];
    private int _roundNumber = 1;

    public const int MaxPlayersPerRoom = 10;
    public const int MaxWatchersPerRoom = 10;
    public const int WatcherCharacterCount = 6;
    public const int MaxNameLength = 50;
    public const int MaxRoomNameLength = 30;
    public const int MaxVoteLength = 10;

    public void StartVoting()
    {
        _lock.EnterWriteLock();
        try
        {
            if (Phase != RoomPhase.Waiting)
                throw new InvalidOperationException($"Cannot start voting from phase {Phase}.");
            Phase = RoomPhase.Voting;
        }
        finally { _lock.ExitWriteLock(); }
    }

    public void SubmitVote(string playerId, string value)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(value);
        if (value.Length > MaxVoteLength)
            throw new ArgumentException("Vote value too long.");

        _lock.EnterWriteLock();
        try
        {
            if (Phase != RoomPhase.Voting)
                throw new InvalidOperationException("Votes can only be submitted during VOTING phase.");

            var user = Users.FirstOrDefault(u => u.PlayerId == playerId)
                ?? throw new InvalidOperationException("Player not found in room.");

            user.Vote = value.Trim();
        }
        finally { _lock.ExitWriteLock(); }
    }

    public void Reveal()
    {
        _lock.EnterWriteLock();
        try
        {
            if (Phase != RoomPhase.Voting)
                throw new InvalidOperationException($"Cannot reveal from phase {Phase}.");

            var votes = Users
                .Where(u => u.Vote is not null)
                .Select(u => new RoundVote(u.PlayerId, u.Username, u.Vote!))
                .ToList();

            _history.Add(new RoundRecord(_roundNumber, votes, Users.Count, DateTime.UtcNow));
            _roundNumber++;

            Phase = RoomPhase.Revealed;
        }
        finally { _lock.ExitWriteLock(); }
    }

    public void Reset()
    {
        _lock.EnterWriteLock();
        try
        {
            if (Phase != RoomPhase.Revealed)
                throw new InvalidOperationException($"Cannot reset from phase {Phase}.");
            Users.ForEach(u => u.Vote = null);
            Phase = RoomPhase.Voting;
        }
        finally { _lock.ExitWriteLock(); }
    }

    public void AddUser(User user)
    {
        _lock.EnterWriteLock();
        try
        {
            if (Users.Count >= MaxPlayersPerRoom)
                throw new InvalidOperationException("Room is full.");
            Users.Add(user);
        }
        finally { _lock.ExitWriteLock(); }
    }

    public bool RemoveUser(string playerId)
    {
        _lock.EnterWriteLock();
        try
        {
            var user = Users.FirstOrDefault(u => u.PlayerId == playerId);
            if (user is null) return false;
            Users.Remove(user);
            _breakRequesters.Remove(playerId);
            return true;
        }
        finally { _lock.ExitWriteLock(); }
    }

    public void AddWatcher(Watcher watcher)
    {
        _lock.EnterWriteLock();
        try
        {
            if (Watchers.Count >= MaxWatchersPerRoom)
                throw new InvalidOperationException("Room has too many watchers.");
            Watchers.Add(watcher);
        }
        finally { _lock.ExitWriteLock(); }
    }

    public bool RemoveWatcher(string watcherId)
    {
        _lock.EnterWriteLock();
        try
        {
            var watcher = Watchers.FirstOrDefault(w => w.WatcherId == watcherId);
            if (watcher is null) return false;
            Watchers.Remove(watcher);
            return true;
        }
        finally { _lock.ExitWriteLock(); }
    }

    public void TakeSeat(string participantId)
    {
        _lock.EnterWriteLock();
        try
        {
            var watcher = Watchers.FirstOrDefault(w => w.WatcherId == participantId)
                ?? throw new InvalidOperationException("Watcher not found in room.");
            if (Users.Count >= MaxPlayersPerRoom)
                throw new InvalidOperationException("Room is full.");

            Watchers.Remove(watcher);
            Users.Add(new User
            {
                PlayerId = watcher.WatcherId,
                ConnectionId = watcher.ConnectionId,
                Username = watcher.Username,
                Connected = watcher.Connected
            });
        }
        finally { _lock.ExitWriteLock(); }
    }

    public void LeaveSeat(string participantId, string accent, int character)
    {
        _lock.EnterWriteLock();
        try
        {
            var user = Users.FirstOrDefault(u => u.PlayerId == participantId)
                ?? throw new InvalidOperationException("Player not found in room.");
            if (Users.Count == 1)
                throw new InvalidOperationException("The last seated player cannot leave the table.");
            if (Watchers.Count >= MaxWatchersPerRoom)
                throw new InvalidOperationException("Room has too many watchers.");

            Users.Remove(user);
            _breakRequesters.Remove(participantId);
            Watchers.Add(new Watcher
            {
                WatcherId = user.PlayerId,
                ConnectionId = user.ConnectionId,
                Username = user.Username,
                Connected = user.Connected,
                Accent = accent,
                Character = character
            });
        }
        finally { _lock.ExitWriteLock(); }
    }

    public Watcher? FindWatcherByConnectionId(string connectionId)
    {
        _lock.EnterReadLock();
        try { return Watchers.FirstOrDefault(w => w.ConnectionId == connectionId); }
        finally { _lock.ExitReadLock(); }
    }

    public Watcher? FindWatcherById(string watcherId)
    {
        _lock.EnterReadLock();
        try { return Watchers.FirstOrDefault(w => w.WatcherId == watcherId); }
        finally { _lock.ExitReadLock(); }
    }

    public void ReconnectWatcher(string watcherId, string newConnectionId)
    {
        _lock.EnterWriteLock();
        try
        {
            var watcher = Watchers.FirstOrDefault(w => w.WatcherId == watcherId)
                ?? throw new InvalidOperationException("Watcher not found in room.");
            watcher.ConnectionId = newConnectionId;
            watcher.Connected = true;
        }
        finally { _lock.ExitWriteLock(); }
    }

    public void SetWatcherAppearance(string watcherId, string accent, int character)
    {
        _lock.EnterWriteLock();
        try
        {
            var watcher = Watchers.FirstOrDefault(w => w.WatcherId == watcherId)
                ?? throw new InvalidOperationException("Watcher not found in room.");
            watcher.Accent = accent;
            watcher.Character = character;
        }
        finally { _lock.ExitWriteLock(); }
    }

    public (IReadOnlyList<string> Accents, IReadOnlyList<int> Characters) UsedLooks()
    {
        _lock.EnterReadLock();
        try { return (Watchers.Select(w => w.Accent).ToList(), Watchers.Select(w => w.Character).ToList()); }
        finally { _lock.ExitReadLock(); }
    }

    public bool ToggleBreakRequest(string playerId)
    {
        _lock.EnterWriteLock();
        try
        {
            if (!Users.Any(u => u.PlayerId == playerId))
                throw new InvalidOperationException("Player not found in room.");

            if (_breakRequesters.Add(playerId)) return true;
            _breakRequesters.Remove(playerId);
            return false;
        }
        finally { _lock.ExitWriteLock(); }
    }

    public void ClearBreakRequests()
    {
        _lock.EnterWriteLock();
        try { _breakRequesters.Clear(); }
        finally { _lock.ExitWriteLock(); }
    }

    public void SetCardStyle(string playerId, string? style, string? pattern, string? patternColor)
    {
        _lock.EnterWriteLock();
        try
        {
            var user = Users.FirstOrDefault(u => u.PlayerId == playerId)
                ?? throw new InvalidOperationException("Player not found in room.");
            user.Style = style;
            user.Pattern = pattern;
            user.PatternColor = patternColor;
        }
        finally { _lock.ExitWriteLock(); }
    }

    public User? FindByPlayerId(string playerId)
    {
        _lock.EnterReadLock();
        try { return Users.FirstOrDefault(u => u.PlayerId == playerId); }
        finally { _lock.ExitReadLock(); }
    }

    public User? FindByConnectionId(string connectionId)
    {
        _lock.EnterReadLock();
        try { return Users.FirstOrDefault(u => u.ConnectionId == connectionId); }
        finally { _lock.ExitReadLock(); }
    }

    public void Reconnect(string playerId, string newConnectionId)
    {
        _lock.EnterWriteLock();
        try
        {
            var user = Users.FirstOrDefault(u => u.PlayerId == playerId)
                ?? throw new InvalidOperationException("Player not found in room.");
            user.ConnectionId = newConnectionId;
            user.Connected = true;
        }
        finally { _lock.ExitWriteLock(); }
    }

    public void SetDisconnected(string connectionId)
    {
        _lock.EnterWriteLock();
        try
        {
            var user = Users.FirstOrDefault(u => u.ConnectionId == connectionId);
            if (user is not null) user.Connected = false;

            var watcher = Watchers.FirstOrDefault(w => w.ConnectionId == connectionId);
            if (watcher is not null) watcher.Connected = false;
        }
        finally { _lock.ExitWriteLock(); }
    }

    public void TransferOwnership(string currentOwnerId, string newOwnerId)
    {
        _lock.EnterWriteLock();
        try
        {
            if (OwnerId != currentOwnerId)
                throw new InvalidOperationException("Only the current owner can transfer ownership.");

            var targetConnected = ParticipantConnected(newOwnerId)
                ?? throw new InvalidOperationException("Target participant not found in room.");
            if (!targetConnected)
                throw new InvalidOperationException("Cannot transfer ownership to a disconnected participant.");

            OwnerId = newOwnerId;
        }
        finally { _lock.ExitWriteLock(); }
    }

    public void TransferOwnerIfNeeded(string departingParticipantId)
    {
        _lock.EnterWriteLock();
        try
        {
            if (OwnerId != departingParticipantId) return;

            var successor = Users.FirstOrDefault(u => u.Connected)?.PlayerId
                ?? Watchers.FirstOrDefault(w => w.Connected)?.WatcherId
                ?? Users.FirstOrDefault()?.PlayerId
                ?? Watchers.FirstOrDefault()?.WatcherId;

            if (successor is not null) OwnerId = successor;
        }
        finally { _lock.ExitWriteLock(); }
    }

    private bool? ParticipantConnected(string participantId)
        => Users.FirstOrDefault(u => u.PlayerId == participantId)?.Connected
            ?? Watchers.FirstOrDefault(w => w.WatcherId == participantId)?.Connected;

    public bool IsEmpty
    {
        get
        {
            _lock.EnterReadLock();
            try { return Users.Count == 0; }
            finally { _lock.ExitReadLock(); }
        }
    }

    public int PlayerCount
    {
        get
        {
            _lock.EnterReadLock();
            try { return Users.Count; }
            finally { _lock.ExitReadLock(); }
        }
    }

    public RoomSnapshot ToSnapshot()
    {
        _lock.EnterReadLock();
        try
        {
            var players = Users
                .Select(u => new PlayerSnapshot(u.PlayerId, u.Username, u.Vote is not null, u.Connected, u.Style, u.Pattern, u.PatternColor))
                .ToList();

            var watchers = Watchers
                .Select(w => new WatcherSnapshot(w.WatcherId, w.Username, w.Connected, w.Accent, w.Character))
                .ToList();

            var votes = Phase == RoomPhase.Revealed && _history.Count > 0
                ? _history[^1].Votes.ToDictionary(v => v.PlayerId, v => v.Vote)
                : EmptyVotes;

            return new RoomSnapshot(
                RoomId,
                OwnerId,
                RoomName,
                VotingDeck.ToString(),
                Phase.ToString().ToUpperInvariant(),
                players,
                watchers,
                votes,
                _history.ToList(),
                _breakRequesters.ToList()
            );
        }
        finally { _lock.ExitReadLock(); }
    }

    private static readonly IReadOnlyDictionary<string, string> EmptyVotes =
        new Dictionary<string, string>().AsReadOnly();
}
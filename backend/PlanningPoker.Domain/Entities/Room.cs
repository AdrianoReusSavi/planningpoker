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
    public EstimationOptions VotingDeck { get; set; }
    public RoomPhase Phase { get; private set; } = RoomPhase.Waiting;

    private readonly List<RoundRecord> _history = [];
    private readonly HashSet<string> _breakRequesters = [];
    private int _roundNumber = 1;

    public const int MaxPlayersPerRoom = 50;
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
                .ToDictionary(u => u.Username, u => u.Vote!);

            _history.Add(new RoundRecord(_roundNumber, votes, DateTime.UtcNow));
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
            var target = Users.FirstOrDefault(u => u.PlayerId == newOwnerId)
                ?? throw new InvalidOperationException("Target player not found in room.");
            if (!target.Connected)
                throw new InvalidOperationException("Cannot transfer ownership to a disconnected player.");
            OwnerId = newOwnerId;
        }
        finally { _lock.ExitWriteLock(); }
    }

    public void TransferOwnerIfNeeded(string departingPlayerId)
    {
        _lock.EnterWriteLock();
        try
        {
            if (OwnerId != departingPlayerId || Users.Count == 0) return;
            OwnerId = (Users.FirstOrDefault(u => u.Connected) ?? Users.First()).PlayerId;
        }
        finally { _lock.ExitWriteLock(); }
    }

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
                .Select(u => new PlayerSnapshot(u.PlayerId, u.Username, u.Vote is not null, u.Connected))
                .ToList();

            var votes = Phase == RoomPhase.Revealed
                ? Users
                    .Where(u => u.Vote is not null)
                    .ToDictionary(u => u.PlayerId, u => u.Vote!)
                : EmptyVotes;

            return new RoomSnapshot(
                RoomId,
                OwnerId,
                RoomName,
                VotingDeck.ToString(),
                Phase.ToString().ToUpperInvariant(),
                players,
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
using PlanningPoker.Domain.Entities;
using PlanningPoker.Domain.Enums;

namespace PlanningPoker.Tests.Domain;

public class RoomTests
{
    private static Room CreateRoom(int playerCount = 2)
    {
        var room = new Room
        {
            RoomId = Guid.NewGuid().ToString(),
            OwnerId = "owner",
            RoomName = "Test Room",
            VotingDeck = EstimationOptions.Fibonacci
        };
        room.StartVoting();

        for (var i = 0; i < playerCount; i++)
        {
            room.AddUser(new User
            {
                PlayerId = i == 0 ? "owner" : $"player-{i}",
                ConnectionId = $"conn-{i}",
                Username = $"Player {i}"
            });
        }

        return room;
    }

    #region State Machine Transitions

    [Fact]
    public void StartVoting_FromWaiting_TransitionsToVoting()
    {
        var room = new Room
        {
            RoomId = "r1", OwnerId = "o1", RoomName = "Test",
            VotingDeck = EstimationOptions.Fibonacci
        };

        room.StartVoting();

        var snapshot = room.ToSnapshot();
        Assert.Equal("VOTING", snapshot.Phase);
    }

    [Fact]
    public void StartVoting_FromVoting_Throws()
    {
        var room = CreateRoom();
        Assert.Throws<InvalidOperationException>(() => room.StartVoting());
    }

    [Fact]
    public void Reveal_FromVoting_TransitionsToRevealed()
    {
        var room = CreateRoom();
        room.Reveal();

        var snapshot = room.ToSnapshot();
        Assert.Equal("REVEALED", snapshot.Phase);
    }

    [Fact]
    public void Reveal_FromRevealed_Throws()
    {
        var room = CreateRoom();
        room.Reveal();
        Assert.Throws<InvalidOperationException>(() => room.Reveal());
    }

    [Fact]
    public void Reset_FromRevealed_TransitionsToVoting_ClearsVotes()
    {
        var room = CreateRoom();
        room.SubmitVote("owner", "5");
        room.SubmitVote("player-1", "8");
        room.Reveal();
        room.Reset();

        var snapshot = room.ToSnapshot();
        Assert.Equal("VOTING", snapshot.Phase);
        Assert.Empty(snapshot.Votes);
        Assert.All(snapshot.Players, p => Assert.False(p.HasVoted));
    }

    [Fact]
    public void Reset_FromVoting_Throws()
    {
        var room = CreateRoom();
        Assert.Throws<InvalidOperationException>(() => room.Reset());
    }

    #endregion

    #region Vote Submission

    [Fact]
    public void SubmitVote_InVotingPhase_RecordsVote()
    {
        var room = CreateRoom();
        room.SubmitVote("owner", "5");

        var snapshot = room.ToSnapshot();
        var player = snapshot.Players.First(p => p.Id == "owner");
        Assert.True(player.HasVoted);
    }

    [Fact]
    public void SubmitVote_InRevealedPhase_Throws()
    {
        var room = CreateRoom();
        room.Reveal();
        Assert.Throws<InvalidOperationException>(() => room.SubmitVote("owner", "5"));
    }

    [Fact]
    public void SubmitVote_InvalidPlayer_Throws()
    {
        var room = CreateRoom();
        Assert.Throws<InvalidOperationException>(() => room.SubmitVote("nonexistent", "5"));
    }

    [Fact]
    public void SubmitVote_EmptyValue_Throws()
    {
        var room = CreateRoom();
        Assert.Throws<ArgumentException>(() => room.SubmitVote("owner", ""));
    }

    [Fact]
    public void SubmitVote_TooLongValue_Throws()
    {
        var room = CreateRoom();
        Assert.Throws<ArgumentException>(() => room.SubmitVote("owner", new string('x', Room.MaxVoteLength + 1)));
    }

    [Fact]
    public void SubmitVote_OverwritesPreviousVote()
    {
        var room = CreateRoom();
        room.SubmitVote("owner", "5");
        room.SubmitVote("owner", "8");
        room.Reveal();

        var snapshot = room.ToSnapshot();
        Assert.Equal("8", snapshot.Votes["owner"]);
    }

    #endregion

    #region Snapshot Privacy

    [Fact]
    public void ToSnapshot_VotingPhase_HidesVotes()
    {
        var room = CreateRoom();
        room.SubmitVote("owner", "5");

        var snapshot = room.ToSnapshot();
        Assert.Empty(snapshot.Votes);
        Assert.True(snapshot.Players.First(p => p.Id == "owner").HasVoted);
    }

    [Fact]
    public void ToSnapshot_RevealedPhase_ShowsVotes()
    {
        var room = CreateRoom();
        room.SubmitVote("owner", "5");
        room.SubmitVote("player-1", "8");
        room.Reveal();

        var snapshot = room.ToSnapshot();
        Assert.Equal(2, snapshot.Votes.Count);
        Assert.Equal("5", snapshot.Votes["owner"]);
        Assert.Equal("8", snapshot.Votes["player-1"]);
    }

    #endregion

    #region Player Management

    [Fact]
    public void AddUser_UpToMax_Succeeds()
    {
        var room = new Room
        {
            RoomId = "r1", OwnerId = "o1", RoomName = "Test",
            VotingDeck = EstimationOptions.Fibonacci
        };
        room.StartVoting();

        for (var i = 0; i < Room.MaxPlayersPerRoom; i++)
        {
            room.AddUser(new User
            {
                PlayerId = $"p-{i}", ConnectionId = $"c-{i}", Username = $"User {i}"
            });
        }

        Assert.Equal(Room.MaxPlayersPerRoom, room.PlayerCount);
    }

    [Fact]
    public void AddUser_OverMax_Throws()
    {
        var room = new Room
        {
            RoomId = "r1", OwnerId = "o1", RoomName = "Test",
            VotingDeck = EstimationOptions.Fibonacci
        };
        room.StartVoting();

        for (var i = 0; i < Room.MaxPlayersPerRoom; i++)
        {
            room.AddUser(new User
            {
                PlayerId = $"p-{i}", ConnectionId = $"c-{i}", Username = $"User {i}"
            });
        }

        Assert.Throws<InvalidOperationException>(() =>
            room.AddUser(new User { PlayerId = "extra", ConnectionId = "extra", Username = "Extra" }));
    }

    [Fact]
    public void RemoveUser_ExistingPlayer_ReturnsTrue()
    {
        var room = CreateRoom();
        Assert.True(room.RemoveUser("player-1"));
        Assert.Equal(1, room.PlayerCount);
    }

    [Fact]
    public void RemoveUser_NonExistent_ReturnsFalse()
    {
        var room = CreateRoom();
        Assert.False(room.RemoveUser("nonexistent"));
    }

    [Fact]
    public void FindByPlayerId_ExistingPlayer_ReturnsUser()
    {
        var room = CreateRoom();
        var user = room.FindByPlayerId("owner");
        Assert.NotNull(user);
        Assert.Equal("Player 0", user.Username);
    }

    [Fact]
    public void FindByPlayerId_NonExistent_ReturnsNull()
    {
        var room = CreateRoom();
        Assert.Null(room.FindByPlayerId("nonexistent"));
    }

    [Fact]
    public void FindByConnectionId_ExistingConnection_ReturnsUser()
    {
        var room = CreateRoom();
        var user = room.FindByConnectionId("conn-0");
        Assert.NotNull(user);
        Assert.Equal("owner", user.PlayerId);
    }

    [Fact]
    public void FindByConnectionId_NonExistent_ReturnsNull()
    {
        var room = CreateRoom();
        Assert.Null(room.FindByConnectionId("nonexistent"));
    }

    [Fact]
    public void IsEmpty_WithPlayers_ReturnsFalse()
    {
        var room = CreateRoom();
        Assert.False(room.IsEmpty);
    }

    [Fact]
    public void IsEmpty_AfterRemovingAll_ReturnsTrue()
    {
        var room = CreateRoom();
        room.RemoveUser("owner");
        room.RemoveUser("player-1");
        Assert.True(room.IsEmpty);
    }

    #endregion

    #region Reconnection

    [Fact]
    public void Reconnect_UpdatesConnectionId()
    {
        var room = CreateRoom();
        room.Reconnect("owner", "new-conn");

        var user = room.FindByConnectionId("new-conn");
        Assert.NotNull(user);
        Assert.Equal("owner", user.PlayerId);
        Assert.True(user.Connected);
    }

    [Fact]
    public void Reconnect_NonExistentPlayer_Throws()
    {
        var room = CreateRoom();
        Assert.Throws<InvalidOperationException>(() => room.Reconnect("nonexistent", "conn"));
    }

    [Fact]
    public void SetDisconnected_MarksPlayerDisconnected()
    {
        var room = CreateRoom();
        room.SetDisconnected("conn-0");

        var snapshot = room.ToSnapshot();
        var player = snapshot.Players.First(p => p.Id == "owner");
        Assert.False(player.Connected);
    }

    #endregion

    #region Ownership Transfer

    [Fact]
    public void TransferOwnership_AsOwner_TransfersSuccessfully()
    {
        var room = CreateRoom();
        room.TransferOwnership("owner", "player-1");

        var snapshot = room.ToSnapshot();
        Assert.Equal("player-1", snapshot.OwnerId);
    }

    [Fact]
    public void TransferOwnership_NotOwner_Throws()
    {
        var room = CreateRoom();
        Assert.Throws<InvalidOperationException>(() => room.TransferOwnership("player-1", "owner"));
    }

    [Fact]
    public void TransferOwnership_TargetNotFound_Throws()
    {
        var room = CreateRoom();
        Assert.Throws<InvalidOperationException>(() => room.TransferOwnership("owner", "nonexistent"));
    }

    [Fact]
    public void TransferOwnership_TargetDisconnected_Throws()
    {
        var room = CreateRoom();
        room.SetDisconnected("conn-1");
        Assert.Throws<InvalidOperationException>(() => room.TransferOwnership("owner", "player-1"));
    }

    [Fact]
    public void TransferOwnerIfNeeded_TransfersToFirstConnected()
    {
        var room = CreateRoom(3);
        room.RemoveUser("owner");
        room.SetDisconnected("conn-1");

        room.TransferOwnerIfNeeded("owner");

        var snapshot = room.ToSnapshot();
        Assert.Equal("player-2", snapshot.OwnerId);
    }

    [Fact]
    public void TransferOwnerIfNeeded_NonOwnerLeaves_NoChange()
    {
        var room = CreateRoom();
        room.TransferOwnerIfNeeded("player-1");

        var snapshot = room.ToSnapshot();
        Assert.Equal("owner", snapshot.OwnerId);
    }

    #endregion

    #region Break Requests

    [Fact]
    public void ToggleBreakRequest_AddsRequester_OnFirstCall()
    {
        var room = CreateRoom();
        var added = room.ToggleBreakRequest("owner");

        Assert.True(added);
        var snapshot = room.ToSnapshot();
        Assert.Single(snapshot.BreakRequesters);
        Assert.Contains("owner", snapshot.BreakRequesters);
    }

    [Fact]
    public void ToggleBreakRequest_RemovesRequester_OnSecondCall()
    {
        var room = CreateRoom();
        room.ToggleBreakRequest("owner");
        var stillActive = room.ToggleBreakRequest("owner");

        Assert.False(stillActive);
        var snapshot = room.ToSnapshot();
        Assert.Empty(snapshot.BreakRequesters);
    }

    [Fact]
    public void ToggleBreakRequest_UnknownPlayer_Throws()
    {
        var room = CreateRoom();
        Assert.Throws<InvalidOperationException>(() => room.ToggleBreakRequest("nonexistent"));
    }

    [Fact]
    public void ToggleBreakRequest_MultiplePlayers_AccumulatesRequests()
    {
        var room = CreateRoom(3);
        room.ToggleBreakRequest("owner");
        room.ToggleBreakRequest("player-1");
        room.ToggleBreakRequest("player-2");

        var snapshot = room.ToSnapshot();
        Assert.Equal(3, snapshot.BreakRequesters.Count);
    }

    [Fact]
    public void ClearBreakRequests_RemovesAll()
    {
        var room = CreateRoom(3);
        room.ToggleBreakRequest("owner");
        room.ToggleBreakRequest("player-1");

        room.ClearBreakRequests();

        Assert.Empty(room.ToSnapshot().BreakRequesters);
    }

    [Fact]
    public void RemoveUser_AlsoRemovesPendingBreakRequest()
    {
        var room = CreateRoom();
        room.ToggleBreakRequest("player-1");

        room.RemoveUser("player-1");

        Assert.Empty(room.ToSnapshot().BreakRequesters);
    }

    #endregion

    #region Concurrency

    [Fact]
    public async Task ConcurrentVoteSubmission_DoesNotCorruptState()
    {
        var room = CreateRoom(20);

        var tasks = Enumerable.Range(1, 19).Select(i =>
            Task.Run(() =>
            {
                for (var j = 0; j < 100; j++)
                {
                    room.SubmitVote($"player-{i}", (j % 10).ToString());
                }
            })
        ).ToArray();

        await Task.WhenAll(tasks);

        var snapshot = room.ToSnapshot();
        Assert.Equal(20, snapshot.Players.Count);
    }

    [Fact]
    public async Task ConcurrentReadsAndWrites_DoNotDeadlock()
    {
        var room = CreateRoom(10);
        var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));

        var writers = Enumerable.Range(0, 5).Select(i =>
            Task.Run(() =>
            {
                while (!cts.Token.IsCancellationRequested)
                {
                    room.SubmitVote(i == 0 ? "owner" : $"player-{i}", "5");
                }
            }, cts.Token)
        );

        var readers = Enumerable.Range(0, 5).Select(_ =>
            Task.Run(() =>
            {
                while (!cts.Token.IsCancellationRequested)
                {
                    var snap = room.ToSnapshot();
                    Assert.True(snap.Players.Count > 0);
                    Assert.True(room.PlayerCount > 0);
                }
            }, cts.Token)
        );

        try { await Task.WhenAll([.. writers, .. readers]); }
        catch (OperationCanceledException) { }

        Assert.True(true);
    }

    #endregion
}
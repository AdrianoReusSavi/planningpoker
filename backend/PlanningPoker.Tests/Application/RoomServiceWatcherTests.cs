using PlanningPoker.Application.Results;
using PlanningPoker.Application.Services;
using PlanningPoker.Domain.Entities;
using PlanningPoker.Domain.Enums;
using PlanningPoker.Infrastructure.Repositories;

namespace PlanningPoker.Tests.Application;

public class RoomServiceWatcherTests
{
    private static (RoomService service, string roomId, string ownerId, string ownerConn) Setup()
    {
        var repo = new InMemoryRoomRepository();
        var service = new RoomService(repo);

        var ownerConn = "conn-owner";
        var create = service.CreateRoom("Owner", "Test Room", EstimationOptions.Fibonacci, false, ownerConn).Created;
        Assert.NotNull(create);

        return (service, create!.RoomId, create.ParticipantId, ownerConn);
    }

    [Fact]
    public void WatchRoom_DoesNotTakeASeat()
    {
        var (service, roomId, _, _) = Setup();
        for (var i = 1; i < Room.MaxPlayersPerRoom; i++)
            Assert.NotNull(service.EnterRoom(roomId, $"P{i}", $"conn-{i}").Joined);

        Assert.Equal(RoomJoinError.RoomFull, service.EnterRoom(roomId, "Late", "conn-late").Error);

        var watch = service.WatchRoom(roomId, "Scrum Master", "conn-sm").Joined;

        Assert.NotNull(watch);
        Assert.Equal(Room.MaxPlayersPerRoom, watch!.Snapshot.Players.Count);
        Assert.Single(watch.Snapshot.Watchers);
    }

    [Fact]
    public void WatchRoom_DoesNotChangeTheGameState()
    {
        var (service, roomId, _, ownerConn) = Setup();
        var before = service.GetRoomSettings(ownerConn);

        service.WatchRoom(roomId, "Observer", "conn-watch");
        var after = service.GetRoomSettings(ownerConn);

        Assert.NotNull(after);
        Assert.Equal(before!.Phase, after!.Phase);
        Assert.Equal(before.Players.Count, after.Players.Count);
        Assert.Equal(before.OwnerId, after.OwnerId);
        Assert.Equal(before.Votes.Count, after.Votes.Count);
    }

    [Fact]
    public void WatchRoom_WatcherIsNotAPlayer()
    {
        var (service, roomId, _, _) = Setup();

        var watch = service.WatchRoom(roomId, "Observer", "conn-watch").Joined;

        Assert.NotNull(watch);
        Assert.DoesNotContain(watch!.Snapshot.Players, p => p.Id == watch.WatcherId);
        Assert.DoesNotContain(watch.Snapshot.Players, p => p.Name == "Observer");
    }

    [Fact]
    public void WatchRoom_ExposesNameAndAccent()
    {
        var (service, roomId, _, _) = Setup();

        var watch = service.WatchRoom(roomId, "  Scrum Master  ", "conn-sm").Joined;

        Assert.NotNull(watch);
        var watcher = Assert.Single(watch!.Snapshot.Watchers);
        Assert.Equal("Scrum Master", watcher.Name);
        Assert.Equal(watch.WatcherId, watcher.Id);
        Assert.True(watcher.Connected);
        Assert.False(string.IsNullOrWhiteSpace(watcher.Accent));
    }

    [Fact]
    public void WatchRoom_GivesEachWatcherADifferentAccent()
    {
        var (service, roomId, _, _) = Setup();

        service.WatchRoom(roomId, "One", "conn-1");
        service.WatchRoom(roomId, "Two", "conn-2");
        var third = service.WatchRoom(roomId, "Three", "conn-3").Joined;

        var accents = third!.Snapshot.Watchers.Select(w => w.Accent).ToList();
        Assert.Equal(3, accents.Count);
        Assert.Equal(3, accents.Distinct().Count());
    }

    [Fact]
    public void WatchRoom_PlayersSeeTheWatcherArrive()
    {
        var (service, roomId, _, ownerConn) = Setup();

        service.WatchRoom(roomId, "Observer", "conn-watch");

        var fromPlayer = service.GetRoomSettings(ownerConn);
        Assert.Single(fromPlayer!.Watchers);
    }

    [Fact]
    public void ValidateReaction_FromWatcher_IsAccepted()
    {
        var (service, roomId, _, _) = Setup();
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch").Joined;

        var result = service.ValidateReaction(roomId, "coffee", "conn-watch");

        Assert.NotNull(result);
        Assert.Equal(watch!.WatcherId, result!.FromPlayerId);
    }

    [Fact]
    public void ValidateThrow_FromWatcherAtPlayer_IsAccepted()
    {
        var (service, roomId, ownerId, _) = Setup();
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch").Joined;

        var result = service.ValidateThrow(roomId, ownerId, "paper", "conn-watch");

        Assert.NotNull(result);
        Assert.Equal(watch!.WatcherId, result!.FromPlayerId);
        Assert.Equal(ownerId, result.ToPlayerId);
    }

    [Fact]
    public void ValidateThrow_AtWatcher_IsAccepted()
    {
        var (service, roomId, ownerId, ownerConn) = Setup();
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch").Joined;

        var result = service.ValidateThrow(roomId, watch!.WatcherId, "paper", ownerConn);

        Assert.NotNull(result);
        Assert.Equal(ownerId, result!.FromPlayerId);
        Assert.Equal(watch.WatcherId, result.ToPlayerId);
    }

    [Fact]
    public void ValidateThrow_BetweenWatchers_IsAccepted()
    {
        var (service, roomId, _, _) = Setup();
        var a = service.WatchRoom(roomId, "A", "conn-a").Joined;
        var b = service.WatchRoom(roomId, "B", "conn-b").Joined;

        var result = service.ValidateThrow(roomId, b!.WatcherId, "paper", "conn-a");

        Assert.NotNull(result);
        Assert.Equal(a!.WatcherId, result!.FromPlayerId);
    }

    [Fact]
    public void ValidateThrow_AtSomeoneWhoLeft_IsRejected()
    {
        var (service, roomId, _, ownerConn) = Setup();
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch").Joined;
        service.LeaveRoom(roomId, "conn-watch");

        Assert.Null(service.ValidateThrow(roomId, watch!.WatcherId, "paper", ownerConn));
    }

    [Fact]
    public void ValidateThrow_WatcherAtThemselves_IsRejected()
    {
        var (service, roomId, _, _) = Setup();
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch").Joined;

        Assert.Null(service.ValidateThrow(roomId, watch!.WatcherId, "paper", "conn-watch"));
    }

    [Fact]
    public void UpdateWatcherAppearance_ChangesColourAndCharacter()
    {
        var (service, roomId, _, _) = Setup();
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch").Joined;
        var assigned = watch!.Snapshot.Watchers[0];

        var snapshot = service.UpdateWatcherAppearance(roomId, "#ff6b6b", 4, "conn-watch");

        Assert.NotNull(snapshot);
        Assert.Equal("#ff6b6b", snapshot!.Watchers[0].Accent);
        Assert.Equal(4, snapshot.Watchers[0].Character);
        Assert.NotEqual(assigned.Accent, snapshot.Watchers[0].Accent);
    }

    [Fact]
    public void UpdateWatcherAppearance_KeepsTheSameWatcher()
    {
        var (service, roomId, _, _) = Setup();
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch").Joined;

        var snapshot = service.UpdateWatcherAppearance(roomId, "#ff6b6b", 3, "conn-watch");

        var watcher = Assert.Single(snapshot!.Watchers);
        Assert.Equal(watch!.WatcherId, watcher.Id);
        Assert.Equal("Observer", watcher.Name);
    }

    [Fact]
    public void WatchRoom_GivesEachWatcherADifferentCharacter()
    {
        var (service, roomId, _, _) = Setup();
        for (var i = 0; i < Room.WatcherCharacterCount; i++)
            service.WatchRoom(roomId, $"W{i}", $"conn-{i}");

        var characters = service.GetRoomSettings("conn-0")!.Watchers.Select(w => w.Character).ToList();

        Assert.Equal(Room.WatcherCharacterCount, characters.Count);
        Assert.Equal(characters.Count, characters.Distinct().Count());
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(Room.WatcherCharacterCount)]
    [InlineData(999)]
    public void UpdateWatcherAppearance_CharacterOutOfRange_IsRejected(int character)
    {
        var (service, roomId, _, _) = Setup();
        service.WatchRoom(roomId, "Observer", "conn-watch");

        Assert.Null(service.UpdateWatcherAppearance(roomId, "#ff6b6b", character, "conn-watch"));
    }

    [Theory]
    [InlineData("red")]
    [InlineData("#fff")]
    [InlineData("javascript:alert(1)")]
    [InlineData("")]
    [InlineData("linear-gradient(135deg, #ff6b6b, #4ade80)")]
    public void UpdateWatcherAppearance_InvalidColour_IsRejected(string accent)
    {
        var (service, roomId, _, _) = Setup();
        service.WatchRoom(roomId, "Observer", "conn-watch");

        Assert.Null(service.UpdateWatcherAppearance(roomId, accent, 0, "conn-watch"));
    }

    [Fact]
    public void UpdateWatcherAppearance_FromAPlayer_IsRejected()
    {
        var (service, roomId, _, ownerConn) = Setup();
        service.WatchRoom(roomId, "Observer", "conn-watch");

        Assert.Null(service.UpdateWatcherAppearance(roomId, "#ff6b6b", 0, ownerConn));
    }

    [Fact]
    public void UpdateWatcherAppearance_OnlyChangesTheCaller()
    {
        var (service, roomId, _, _) = Setup();
        var a = service.WatchRoom(roomId, "A", "conn-a").Joined;
        var b = service.WatchRoom(roomId, "B", "conn-b").Joined;
        var bAccent = b!.Snapshot.Watchers.First(w => w.Id == b.WatcherId).Accent;

        var snapshot = service.UpdateWatcherAppearance(roomId, "#ff6b6b", 2, "conn-a");

        Assert.Equal("#ff6b6b", snapshot!.Watchers.First(w => w.Id == a!.WatcherId).Accent);
        Assert.Equal(bAccent, snapshot.Watchers.First(w => w.Id == b.WatcherId).Accent);
    }

    [Fact]
    public void LeaveRoom_WatcherLeavesImmediately()
    {
        var (service, roomId, _, ownerConn) = Setup();
        service.WatchRoom(roomId, "Observer", "conn-watch");

        var leave = service.LeaveRoom(roomId, "conn-watch");

        Assert.NotNull(leave);
        Assert.Empty(leave!.Snapshot!.Watchers);
        Assert.Empty(service.GetRoomSettings(ownerConn)!.Watchers);
    }

    [Fact]
    public void HandleDisconnect_WatcherStaysListedButDisconnected()
    {
        var (service, roomId, _, _) = Setup();
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch").Joined;

        var result = service.HandleDisconnect("conn-watch");

        Assert.NotNull(result);
        Assert.Equal(watch!.WatcherId, result!.PlayerId);
        var watcher = Assert.Single(result.Snapshot.Watchers);
        Assert.False(watcher.Connected);
    }

    [Fact]
    public void Reconnect_BringsBackTheSameWatcher()
    {
        var (service, roomId, _, _) = Setup();
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch").Joined;
        service.HandleDisconnect("conn-watch");

        var result = service.Reconnect(roomId, watch!.WatcherId, "conn-watch-2");

        Assert.NotNull(result);
        var watcher = Assert.Single(result!.Snapshot.Watchers);
        Assert.Equal(watch.WatcherId, watcher.Id);
        Assert.True(watcher.Connected);
    }

    [Fact]
    public void PermanentlyRemovePlayer_AlsoRemovesADroppedWatcher()
    {
        var (service, roomId, _, _) = Setup();
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch").Joined;
        service.HandleDisconnect("conn-watch");

        var removal = service.PermanentlyRemovePlayer(roomId, watch!.WatcherId);

        Assert.NotNull(removal.Snapshot);
        Assert.Empty(removal.Snapshot!.Watchers);
    }

    [Fact]
    public void PermanentlyRemovePlayer_KeepsAConnectedWatcher()
    {
        var (service, roomId, _, _) = Setup();
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch").Joined;

        var removal = service.PermanentlyRemovePlayer(roomId, watch!.WatcherId);

        Assert.Null(removal.Snapshot);
        Assert.Single(service.GetRoomSettings("conn-watch")!.Watchers);
    }

    [Fact]
    public void Watchers_KeepTheRoomAliveWithNobodySeated()
    {
        var (service, roomId, ownerId, ownerConn) = Setup();
        service.WatchRoom(roomId, "Observer", "conn-watch");

        service.HandleDisconnect(ownerConn);
        var removal = service.PermanentlyRemovePlayer(roomId, ownerId);

        Assert.False(removal.RoomRemoved);
        var settings = service.GetRoomSettings("conn-watch");
        Assert.NotNull(settings);
        Assert.Empty(settings!.Players);
        Assert.Single(settings.Watchers);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void WatchRoom_BlankName_IsRejected(string? name)
    {
        var (service, roomId, _, _) = Setup();

        Assert.Equal(RoomJoinError.InvalidName, service.WatchRoom(roomId, name!, "conn-watch").Error);
    }

    [Fact]
    public void WatchRoom_UnknownRoom_IsRejected()
    {
        var (service, _, _, _) = Setup();

        Assert.Equal(RoomJoinError.RoomNotFound, service.WatchRoom("nonexistent-room", "Observer", "conn-watch").Error);
    }

    [Fact]
    public void WatchRoom_APlayerCannotAlsoWatch()
    {
        var (service, roomId, _, ownerConn) = Setup();

        Assert.Equal(RoomJoinError.AlreadyInRoom, service.WatchRoom(roomId, "Owner Again", ownerConn).Error);
    }

    [Fact]
    public void EnterRoom_UnknownRoom_IsRejected()
    {
        var (service, _, _, _) = Setup();

        Assert.Equal(RoomJoinError.RoomNotFound, service.EnterRoom("nonexistent-room", "Late", "conn-late").Error);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void EnterRoom_BlankName_IsRejected(string? name)
    {
        var (service, roomId, _, _) = Setup();

        Assert.Equal(RoomJoinError.InvalidName, service.EnterRoom(roomId, name!, "conn-late").Error);
    }

    [Fact]
    public void WatchRoom_BeyondTheLimit_IsRejected()
    {
        var (service, roomId, _, _) = Setup();
        for (var i = 0; i < Room.MaxWatchersPerRoom; i++)
            Assert.NotNull(service.WatchRoom(roomId, $"W{i}", $"conn-w{i}").Joined);

        Assert.Equal(RoomJoinError.RoomFull, service.WatchRoom(roomId, "One Too Many", "conn-extra").Error);
    }

    [Fact]
    public void TransferOwnership_ToAConnectedWatcher_MovesTheCrown()
    {
        var (service, roomId, ownerId, ownerConn) = Setup();
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch").Joined;

        var snapshot = service.TransferOwnership(roomId, watch!.WatcherId, ownerConn);

        Assert.NotNull(snapshot);
        Assert.Equal(watch.WatcherId, snapshot!.OwnerId);
        Assert.NotEqual(ownerId, snapshot.OwnerId);
    }

    [Fact]
    public void TransferOwnership_ToADisconnectedWatcher_IsRejected()
    {
        var (service, roomId, ownerId, ownerConn) = Setup();
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch").Joined;
        service.HandleDisconnect("conn-watch");

        Assert.Null(service.TransferOwnership(roomId, watch!.WatcherId, ownerConn));
        Assert.Equal(ownerId, service.GetRoomSettings(ownerConn)!.OwnerId);
    }

    [Fact]
    public void WatcherLeader_RevealsAndResetsTheRound()
    {
        var (service, roomId, _, ownerConn) = Setup();
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch").Joined;
        Assert.NotNull(service.TransferOwnership(roomId, watch!.WatcherId, ownerConn));
        Assert.NotNull(service.SubmitVote(roomId, "5", ownerConn));

        Assert.Equal("REVEALED", service.RevealVotes(roomId, "conn-watch")?.Phase);
        Assert.Equal("VOTING", service.ResetVotes(roomId, "conn-watch")?.Phase);
    }

    [Fact]
    public void Watcher_WithoutTheCrown_CannotRevealTheRound()
    {
        var (service, roomId, _, ownerConn) = Setup();
        service.WatchRoom(roomId, "Observer", "conn-watch");
        Assert.NotNull(service.SubmitVote(roomId, "5", ownerConn));

        Assert.Null(service.RevealVotes(roomId, "conn-watch"));
        Assert.Equal("VOTING", service.GetRoomSettings(ownerConn)!.Phase);
    }

    [Fact]
    public void Watcher_CanAskForABreak()
    {
        var (service, roomId, _, _) = Setup();
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch").Joined;
        Assert.NotNull(watch);

        var asked = service.ToggleBreakRequest(roomId, "conn-watch");

        Assert.NotNull(asked);
        Assert.Contains(watch!.WatcherId, asked!.BreakRequesters);

        var withdrawn = service.ToggleBreakRequest(roomId, "conn-watch");
        Assert.DoesNotContain(watch.WatcherId, withdrawn!.BreakRequesters);
    }

    [Fact]
    public void Watcher_LeavingTakesTheBreakRequestAlong()
    {
        var (service, roomId, _, _) = Setup();
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch").Joined;
        Assert.NotNull(watch);
        service.ToggleBreakRequest(roomId, "conn-watch");

        var leave = service.LeaveRoom(roomId, "conn-watch");

        Assert.NotNull(leave?.Snapshot);
        Assert.DoesNotContain(watch!.WatcherId, leave!.Snapshot!.BreakRequesters);
    }

    [Fact]
    public void WatcherLeader_ClearsBreakRequests()
    {
        var (service, roomId, _, ownerConn) = Setup();
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch").Joined;
        Assert.NotNull(service.TransferOwnership(roomId, watch!.WatcherId, ownerConn));
        Assert.NotNull(service.ToggleBreakRequest(roomId, ownerConn));

        Assert.Empty(service.ClearBreakRequests(roomId, "conn-watch")!.BreakRequesters);
    }

    [Fact]
    public void WatcherLeader_KicksAPlayer()
    {
        var (service, roomId, _, ownerConn) = Setup();
        var player = service.EnterRoom(roomId, "Player", "conn-player").Joined;
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch").Joined;
        Assert.NotNull(service.TransferOwnership(roomId, watch!.WatcherId, ownerConn));

        var kick = service.KickPlayer(roomId, player!.PlayerId, "conn-watch");

        Assert.NotNull(kick);
        Assert.DoesNotContain(kick!.Snapshot.Players, p => p.Id == player.PlayerId);
    }

    [Fact]
    public void WatcherLeader_KickingTheLastPlayer_KeepsTheRoomForTheBench()
    {
        var (service, roomId, ownerId, ownerConn) = Setup();
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch").Joined;
        Assert.NotNull(service.TransferOwnership(roomId, watch!.WatcherId, ownerConn));

        Assert.NotNull(service.KickPlayer(roomId, ownerId, "conn-watch"));

        var settings = service.GetRoomSettings("conn-watch");
        Assert.NotNull(settings);
        Assert.Empty(settings!.Players);
        Assert.Single(settings.Watchers);
    }

    [Fact]
    public void WatcherLeader_HandsTheCrownBackToAPlayer()
    {
        var (service, roomId, ownerId, ownerConn) = Setup();
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch").Joined;
        Assert.NotNull(service.TransferOwnership(roomId, watch!.WatcherId, ownerConn));

        Assert.Equal(ownerId, service.TransferOwnership(roomId, ownerId, "conn-watch")?.OwnerId);
    }

    [Fact]
    public void WatcherLeader_LeavingHandsTheCrownToAPlayer()
    {
        var (service, roomId, ownerId, ownerConn) = Setup();
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch").Joined;
        Assert.NotNull(service.TransferOwnership(roomId, watch!.WatcherId, ownerConn));

        Assert.Equal(ownerId, service.LeaveRoom(roomId, "conn-watch")?.Snapshot?.OwnerId);
    }
}

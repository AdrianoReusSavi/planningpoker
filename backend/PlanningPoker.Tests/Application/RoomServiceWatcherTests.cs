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
        var create = service.CreateRoom("Owner", "Test Room", EstimationOptions.Fibonacci, ownerConn);
        Assert.NotNull(create);

        return (service, create!.RoomId, create.PlayerId, ownerConn);
    }

    [Fact]
    public void WatchRoom_DoesNotTakeASeat()
    {
        var (service, roomId, _, _) = Setup();
        for (var i = 1; i < Room.MaxPlayersPerRoom; i++)
            Assert.NotNull(service.EnterRoom(roomId, $"P{i}", $"conn-{i}"));

        Assert.Null(service.EnterRoom(roomId, "Late", "conn-late"));

        var watch = service.WatchRoom(roomId, "Scrum Master", "conn-sm");

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

        var watch = service.WatchRoom(roomId, "Observer", "conn-watch");

        Assert.NotNull(watch);
        Assert.DoesNotContain(watch!.Snapshot.Players, p => p.Id == watch.WatcherId);
        Assert.DoesNotContain(watch.Snapshot.Players, p => p.Name == "Observer");
    }

    [Fact]
    public void WatchRoom_ExposesNameAndAccent()
    {
        var (service, roomId, _, _) = Setup();

        var watch = service.WatchRoom(roomId, "  Scrum Master  ", "conn-sm");

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
        var third = service.WatchRoom(roomId, "Three", "conn-3");

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
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch");

        var result = service.ValidateReaction(roomId, "coffee", "conn-watch");

        Assert.NotNull(result);
        Assert.Equal(watch!.WatcherId, result!.FromPlayerId);
    }

    [Fact]
    public void ValidateThrow_FromWatcherAtPlayer_IsAccepted()
    {
        var (service, roomId, ownerId, _) = Setup();
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch");

        var result = service.ValidateThrow(roomId, ownerId, "paper", "conn-watch");

        Assert.NotNull(result);
        Assert.Equal(watch!.WatcherId, result!.FromPlayerId);
        Assert.Equal(ownerId, result.ToPlayerId);
    }

    [Fact]
    public void ValidateThrow_AtWatcher_IsAccepted()
    {
        var (service, roomId, ownerId, ownerConn) = Setup();
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch");

        var result = service.ValidateThrow(roomId, watch!.WatcherId, "paper", ownerConn);

        Assert.NotNull(result);
        Assert.Equal(ownerId, result!.FromPlayerId);
        Assert.Equal(watch.WatcherId, result.ToPlayerId);
    }

    [Fact]
    public void ValidateThrow_BetweenWatchers_IsAccepted()
    {
        var (service, roomId, _, _) = Setup();
        var a = service.WatchRoom(roomId, "A", "conn-a");
        var b = service.WatchRoom(roomId, "B", "conn-b");

        var result = service.ValidateThrow(roomId, b!.WatcherId, "paper", "conn-a");

        Assert.NotNull(result);
        Assert.Equal(a!.WatcherId, result!.FromPlayerId);
    }

    [Fact]
    public void ValidateThrow_AtSomeoneWhoLeft_IsRejected()
    {
        var (service, roomId, _, ownerConn) = Setup();
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch");
        service.LeaveRoom(roomId, "conn-watch");

        Assert.Null(service.ValidateThrow(roomId, watch!.WatcherId, "paper", ownerConn));
    }

    [Fact]
    public void ValidateThrow_WatcherAtThemselves_IsRejected()
    {
        var (service, roomId, _, _) = Setup();
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch");

        Assert.Null(service.ValidateThrow(roomId, watch!.WatcherId, "paper", "conn-watch"));
    }

    [Fact]
    public void UpdateWatcherAppearance_ChangesColourAndCharacter()
    {
        var (service, roomId, _, _) = Setup();
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch");
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
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch");

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
        var a = service.WatchRoom(roomId, "A", "conn-a");
        var b = service.WatchRoom(roomId, "B", "conn-b");
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
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch");

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
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch");
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
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch");
        service.HandleDisconnect("conn-watch");

        var removal = service.PermanentlyRemovePlayer(roomId, watch!.WatcherId);

        Assert.NotNull(removal.Snapshot);
        Assert.Empty(removal.Snapshot!.Watchers);
    }

    [Fact]
    public void PermanentlyRemovePlayer_KeepsAConnectedWatcher()
    {
        var (service, roomId, _, _) = Setup();
        var watch = service.WatchRoom(roomId, "Observer", "conn-watch");

        var removal = service.PermanentlyRemovePlayer(roomId, watch!.WatcherId);

        Assert.Null(removal.Snapshot);
        Assert.Single(service.GetRoomSettings("conn-watch")!.Watchers);
    }

    [Fact]
    public void Watchers_DoNotKeepAnEmptyRoomAlive()
    {
        var (service, roomId, ownerId, ownerConn) = Setup();
        service.WatchRoom(roomId, "Observer", "conn-watch");

        service.HandleDisconnect(ownerConn);
        var removal = service.PermanentlyRemovePlayer(roomId, ownerId);

        Assert.True(removal.RoomRemoved);
        Assert.Null(service.GetRoomSettings("conn-watch"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void WatchRoom_BlankName_IsRejected(string? name)
    {
        var (service, roomId, _, _) = Setup();

        Assert.Null(service.WatchRoom(roomId, name!, "conn-watch"));
    }

    [Fact]
    public void WatchRoom_UnknownRoom_IsRejected()
    {
        var (service, _, _, _) = Setup();

        Assert.Null(service.WatchRoom("nonexistent-room", "Observer", "conn-watch"));
    }

    [Fact]
    public void WatchRoom_APlayerCannotAlsoWatch()
    {
        var (service, roomId, _, ownerConn) = Setup();

        Assert.Null(service.WatchRoom(roomId, "Owner Again", ownerConn));
    }

    [Fact]
    public void WatchRoom_BeyondTheLimit_IsRejected()
    {
        var (service, roomId, _, _) = Setup();
        for (var i = 0; i < Room.MaxWatchersPerRoom; i++)
            Assert.NotNull(service.WatchRoom(roomId, $"W{i}", $"conn-w{i}"));

        Assert.Null(service.WatchRoom(roomId, "One Too Many", "conn-extra"));
    }
}
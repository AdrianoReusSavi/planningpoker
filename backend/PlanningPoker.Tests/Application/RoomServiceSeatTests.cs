using PlanningPoker.Application.Results;
using PlanningPoker.Application.Services;
using PlanningPoker.Domain.Entities;
using PlanningPoker.Domain.Enums;
using PlanningPoker.Infrastructure.Repositories;

namespace PlanningPoker.Tests.Application;

public class RoomServiceSeatTests
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

    private static string Watch(RoomService service, string roomId, string name, string connectionId)
    {
        var watch = service.WatchRoom(roomId, name, connectionId).Joined;
        Assert.NotNull(watch);
        return watch!.WatcherId;
    }

    [Fact]
    public void TakeSeat_KeepsTheSameId()
    {
        var (service, roomId, _, _) = Setup();
        var watcherId = Watch(service, roomId, "Observer", "conn-watch");

        var seated = service.TakeSeat(roomId, "conn-watch").Joined;

        Assert.NotNull(seated);
        Assert.Equal(watcherId, seated!.PlayerId);
        Assert.Contains(seated.Snapshot.Players, p => p.Id == watcherId);
        Assert.DoesNotContain(seated.Snapshot.Watchers, w => w.Id == watcherId);
    }

    [Fact]
    public void TakeSeat_EntersWithoutAVote()
    {
        var (service, roomId, _, ownerConn) = Setup();
        Watch(service, roomId, "Observer", "conn-watch");
        service.SubmitVote(roomId, "5", ownerConn);

        var seated = service.TakeSeat(roomId, "conn-watch").Joined;

        Assert.NotNull(seated);
        var justSeated = seated!.Snapshot.Players.First(p => p.Id == seated.PlayerId);
        Assert.False(justSeated.HasVoted);
    }

    [Fact]
    public void LeaveSeat_KeepsTheSameId()
    {
        var (service, roomId, ownerId, ownerConn) = Setup();
        Assert.NotNull(service.EnterRoom(roomId, "Player", "conn-player").Joined);

        var watching = service.LeaveSeat(roomId, ownerConn).Joined;

        Assert.NotNull(watching);
        Assert.Equal(ownerId, watching!.WatcherId);
        Assert.Contains(watching.Snapshot.Watchers, w => w.Id == ownerId);
        Assert.DoesNotContain(watching.Snapshot.Players, p => p.Id == ownerId);
    }

    [Fact]
    public void LeaveSeat_DiscardsThePendingVote()
    {
        var (service, roomId, ownerId, ownerConn) = Setup();
        var other = service.EnterRoom(roomId, "Player", "conn-player").Joined;
        service.SubmitVote(roomId, "5", ownerConn);
        service.SubmitVote(roomId, "8", "conn-player");

        service.LeaveSeat(roomId, ownerConn);
        var revealed = service.RevealVotes(roomId, ownerConn);

        Assert.NotNull(revealed);
        var round = Assert.Single(revealed!.History);
        var vote = Assert.Single(round.Votes);
        Assert.Equal(other!.PlayerId, vote.PlayerId);
        Assert.DoesNotContain(revealed.Votes, v => v.Key == ownerId);
    }

    [Fact]
    public void LeaveSeat_KeepsTheCrown()
    {
        var (service, roomId, ownerId, ownerConn) = Setup();
        Assert.NotNull(service.EnterRoom(roomId, "Player", "conn-player").Joined);

        var watching = service.LeaveSeat(roomId, ownerConn).Joined;

        Assert.NotNull(watching);
        Assert.Equal(ownerId, watching!.Snapshot.OwnerId);
    }

    [Fact]
    public void LeaveSeat_ClearsTheBreakRequest()
    {
        var (service, roomId, ownerId, ownerConn) = Setup();
        Assert.NotNull(service.EnterRoom(roomId, "Player", "conn-player").Joined);
        service.ToggleBreakRequest(roomId, ownerConn);

        var watching = service.LeaveSeat(roomId, ownerConn).Joined;

        Assert.NotNull(watching);
        Assert.DoesNotContain(ownerId, watching!.Snapshot.BreakRequesters);
    }

    [Fact]
    public void SeatRoundTrip_KeepsTheSameId()
    {
        var (service, roomId, ownerId, ownerConn) = Setup();
        Assert.NotNull(service.EnterRoom(roomId, "Player", "conn-player").Joined);

        service.LeaveSeat(roomId, ownerConn);
        var seated = service.TakeSeat(roomId, ownerConn).Joined;

        Assert.NotNull(seated);
        Assert.Equal(ownerId, seated!.PlayerId);
        Assert.Contains(seated.Snapshot.Players, p => p.Id == ownerId);
    }

    [Fact]
    public void LeaveSeat_LastSeatedPlayer_LeavesTheTableEmpty()
    {
        var (service, roomId, ownerId, ownerConn) = Setup();
        Watch(service, roomId, "Observer", "conn-watch");

        var watching = service.LeaveSeat(roomId, ownerConn).Joined;

        Assert.NotNull(watching);
        Assert.Empty(watching!.Snapshot.Players);
        Assert.Equal(2, watching.Snapshot.Watchers.Count);
        Assert.Equal(ownerId, watching.Snapshot.OwnerId);
    }

    [Fact]
    public void LeaveSeat_WithTheBenchFull_IsRejected()
    {
        var (service, roomId, _, ownerConn) = Setup();
        Assert.NotNull(service.EnterRoom(roomId, "Player", "conn-player").Joined);
        for (var i = 0; i < Room.MaxWatchersPerRoom; i++)
            Watch(service, roomId, $"W{i}", $"conn-w{i}");

        Assert.Equal(RoomJoinError.RoomFull, service.LeaveSeat(roomId, ownerConn).Error);
    }

    [Fact]
    public void TakeSeat_WithTheTableFull_IsRejected()
    {
        var (service, roomId, _, _) = Setup();
        for (var i = 1; i < Room.MaxPlayersPerRoom; i++)
            Assert.NotNull(service.EnterRoom(roomId, $"P{i}", $"conn-{i}").Joined);
        Watch(service, roomId, "Observer", "conn-watch");

        Assert.Equal(RoomJoinError.RoomFull, service.TakeSeat(roomId, "conn-watch").Error);
    }

    [Fact]
    public void TakeSeat_FromAPlayer_IsRejected()
    {
        var (service, roomId, _, ownerConn) = Setup();

        Assert.Equal(RoomJoinError.NotInRoom, service.TakeSeat(roomId, ownerConn).Error);
    }

    [Fact]
    public void LeaveSeat_FromAWatcher_IsRejected()
    {
        var (service, roomId, _, _) = Setup();
        Watch(service, roomId, "Observer", "conn-watch");

        Assert.Equal(RoomJoinError.NotInRoom, service.LeaveSeat(roomId, "conn-watch").Error);
    }

    [Fact]
    public void SeatChange_WhileTheRoundIsRevealed_IsRejected()
    {
        var (service, roomId, _, ownerConn) = Setup();
        Assert.NotNull(service.EnterRoom(roomId, "Player", "conn-player").Joined);
        Watch(service, roomId, "Observer", "conn-watch");
        service.SubmitVote(roomId, "5", ownerConn);
        Assert.NotNull(service.RevealVotes(roomId, ownerConn));

        Assert.Equal(RoomJoinError.RoundRevealed, service.LeaveSeat(roomId, ownerConn).Error);
        Assert.Equal(RoomJoinError.RoundRevealed, service.TakeSeat(roomId, "conn-watch").Error);
    }

    [Fact]
    public void SeatChange_AfterTheRoundIsReset_IsAllowedAgain()
    {
        var (service, roomId, _, ownerConn) = Setup();
        Assert.NotNull(service.EnterRoom(roomId, "Player", "conn-player").Joined);
        Watch(service, roomId, "Observer", "conn-watch");
        service.SubmitVote(roomId, "5", ownerConn);
        service.RevealVotes(roomId, ownerConn);
        service.ResetVotes(roomId, ownerConn);

        Assert.NotNull(service.LeaveSeat(roomId, ownerConn).Joined);
        Assert.NotNull(service.TakeSeat(roomId, "conn-watch").Joined);
    }

    [Fact]
    public void SeatChange_UnknownRoom_IsRejected()
    {
        var (service, _, _, ownerConn) = Setup();

        Assert.Equal(RoomJoinError.RoomNotFound, service.TakeSeat("nonexistent-room", ownerConn).Error);
        Assert.Equal(RoomJoinError.RoomNotFound, service.LeaveSeat("nonexistent-room", ownerConn).Error);
    }
}
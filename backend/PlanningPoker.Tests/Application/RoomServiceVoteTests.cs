using PlanningPoker.Application.Services;
using PlanningPoker.Domain.Enums;
using PlanningPoker.Infrastructure.Repositories;

namespace PlanningPoker.Tests.Application;

public class RoomServiceVoteTests
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
    public void ClearVote_RemovesOnlyTheCallersVote()
    {
        var (service, roomId, ownerId, ownerConn) = Setup();
        var other = service.EnterRoom(roomId, "Other", "conn-other").Joined;
        service.SubmitVote(roomId, "5", ownerConn);
        service.SubmitVote(roomId, "8", "conn-other");

        var snapshot = service.ClearVote(roomId, ownerConn);

        Assert.NotNull(snapshot);
        Assert.False(snapshot!.Players.First(p => p.Id == ownerId).HasVoted);
        Assert.True(snapshot.Players.First(p => p.Id == other!.PlayerId).HasVoted);
    }

    [Fact]
    public void ClearVote_AfterTheReveal_IsRejected()
    {
        var (service, roomId, _, ownerConn) = Setup();
        service.SubmitVote(roomId, "5", ownerConn);
        service.RevealVotes(roomId, ownerConn);

        Assert.Null(service.ClearVote(roomId, ownerConn));
    }

    [Fact]
    public void ClearVote_FromAWatcher_IsRejected()
    {
        var (service, roomId, _, _) = Setup();
        service.WatchRoom(roomId, "Observer", "conn-watch");

        Assert.Null(service.ClearVote(roomId, "conn-watch"));
    }

    [Fact]
    public void EveryoneVoted_TurnsTrueOnlyWhenEverySeatedPlayerHasVoted()
    {
        var (service, roomId, _, ownerConn) = Setup();
        service.EnterRoom(roomId, "Other", "conn-other");
        service.WatchRoom(roomId, "Observer", "conn-watch");

        var afterFirst = service.SubmitVote(roomId, "5", ownerConn);
        Assert.False(afterFirst!.EveryoneVoted);

        var afterSecond = service.SubmitVote(roomId, "8", "conn-other");
        Assert.True(afterSecond!.EveryoneVoted);
    }

    [Fact]
    public void EveryoneVoted_TurnsFalseAgainWhenSomeoneClearsTheVote()
    {
        var (service, roomId, _, ownerConn) = Setup();
        service.SubmitVote(roomId, "5", ownerConn);

        var cleared = service.ClearVote(roomId, ownerConn);

        Assert.False(cleared!.EveryoneVoted);
    }

    [Fact]
    public void EveryoneVoted_IgnoresTheRevealedPhase()
    {
        var (service, roomId, _, ownerConn) = Setup();
        service.SubmitVote(roomId, "5", ownerConn);

        var revealed = service.RevealVotes(roomId, ownerConn);

        Assert.False(revealed!.EveryoneVoted);
    }

    [Fact]
    public void EveryoneVoted_TurnsTrueWhenTheLastPlayerWithoutAVoteLeaves()
    {
        var (service, roomId, _, ownerConn) = Setup();
        service.EnterRoom(roomId, "Silent", "conn-silent");
        service.SubmitVote(roomId, "5", ownerConn);

        var leave = service.LeaveRoom(roomId, "conn-silent");

        Assert.True(leave!.Snapshot!.EveryoneVoted);
    }

    [Fact]
    public void SetAutoReveal_TurnsTheAutomaticRevealOff()
    {
        var (service, roomId, _, ownerConn) = Setup();

        var snapshot = service.SetAutoReveal(roomId, false, ownerConn);

        Assert.NotNull(snapshot);
        Assert.False(snapshot!.AutoRevealEnabled);
        Assert.Equal(3, snapshot.AutoRevealSeconds);
    }

    [Fact]
    public void SetAutoReveal_StartsEnabledWithThreeSeconds()
    {
        var (service, _, _, ownerConn) = Setup();

        var snapshot = service.GetRoomSettings(ownerConn);

        Assert.NotNull(snapshot);
        Assert.True(snapshot!.AutoRevealEnabled);
        Assert.Equal(3, snapshot.AutoRevealSeconds);
    }

    [Fact]
    public void SetAutoReveal_FromSomeoneWhoIsNotTheLeader_IsRejected()
    {
        var (service, roomId, _, _) = Setup();
        service.EnterRoom(roomId, "Other", "conn-other");

        Assert.Null(service.SetAutoReveal(roomId, false, "conn-other"));
    }

    [Fact]
    public void SetAutoReveal_FromAWatcherLeader_IsAccepted()
    {
        var (service, roomId, ownerId, ownerConn) = Setup();
        service.EnterRoom(roomId, "Player", "conn-player");
        Assert.NotNull(service.LeaveSeat(roomId, ownerConn).Joined);

        var snapshot = service.SetAutoReveal(roomId, true, ownerConn);

        Assert.NotNull(snapshot);
        Assert.True(snapshot!.AutoRevealEnabled);
        Assert.Equal(ownerId, snapshot.OwnerId);
    }

    [Fact]
    public void AutoReveal_RevealsWithoutBeingTheOwner()
    {
        var (service, roomId, _, ownerConn) = Setup();
        service.SubmitVote(roomId, "5", ownerConn);

        var revealed = service.AutoReveal(roomId);

        Assert.NotNull(revealed);
        Assert.Equal("REVEALED", revealed!.Phase);
        Assert.Single(revealed.History);
    }

    [Fact]
    public void AutoReveal_OnAnAlreadyRevealedRound_DoesNothing()
    {
        var (service, roomId, _, ownerConn) = Setup();
        service.SubmitVote(roomId, "5", ownerConn);
        service.RevealVotes(roomId, ownerConn);

        Assert.Null(service.AutoReveal(roomId));
    }

    [Fact]
    public void AutoReveal_OnAnUnknownRoom_DoesNothing()
    {
        var (service, _, _, _) = Setup();

        Assert.Null(service.AutoReveal("nonexistent-room"));
    }
}
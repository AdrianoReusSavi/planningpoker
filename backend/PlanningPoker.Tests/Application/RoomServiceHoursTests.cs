using PlanningPoker.Application.Services;
using PlanningPoker.Domain.Enums;
using PlanningPoker.Infrastructure.Repositories;

namespace PlanningPoker.Tests.Application;

public class RoomServiceHoursTests
{
    private static (RoomService service, string roomId, string ownerId, string ownerConn) Setup(bool hoursEnabled = true, PlayerRole ownerRole = PlayerRole.Dev)
    {
        var repo = new InMemoryRoomRepository();
        var service = new RoomService(repo);

        var ownerConn = "conn-owner";
        var create = service.CreateRoom("Owner", "Test Room", EstimationOptions.Fibonacci, false, ownerConn, hoursEnabled, ownerRole).Created;
        Assert.NotNull(create);

        return (service, create!.RoomId, create.ParticipantId, ownerConn);
    }

    [Fact]
    public void GetRoomPreview_TellsWhetherTheRoomEstimatesHours()
    {
        var (service, roomId, _, _) = Setup();

        Assert.True(service.GetRoomPreview(roomId)!.HoursEnabled);
    }

    [Fact]
    public void SubmitVote_WithoutHours_DoesNotCountAsVotedForADev()
    {
        var (service, roomId, ownerId, ownerConn) = Setup();

        var snapshot = service.SubmitVote(roomId, "5", ownerConn);

        Assert.False(snapshot!.Players.First(p => p.Id == ownerId).HasVoted);
        Assert.False(snapshot.EveryoneVoted);
    }

    [Fact]
    public void PointsAndHours_TogetherCountAsVoted()
    {
        var (service, roomId, ownerId, ownerConn) = Setup();

        service.SubmitVote(roomId, "5", ownerConn);
        var snapshot = service.SubmitHours(roomId, 6m, ownerConn);

        Assert.True(snapshot!.Players.First(p => p.Id == ownerId).HasVoted);
    }

    [Fact]
    public void Snapshot_TellsEachPartApart()
    {
        var (service, roomId, ownerId, ownerConn) = Setup();

        var hoursOnly = service.SubmitHours(roomId, 6m, ownerConn)!.Players.First(p => p.Id == ownerId);
        var both = service.SubmitVote(roomId, "5", ownerConn)!.Players.First(p => p.Id == ownerId);

        Assert.Equal((false, true, false), (hoursOnly.HasPoints, hoursOnly.HasHours, hoursOnly.HasVoted));
        Assert.Equal((true, true, true), (both.HasPoints, both.HasHours, both.HasVoted));
    }

    [Fact]
    public void ClearVote_KeepsTheHours()
    {
        var (service, roomId, ownerId, ownerConn) = Setup();
        service.SubmitVote(roomId, "5", ownerConn);
        service.SubmitHours(roomId, 6m, ownerConn);

        var owner = service.ClearVote(roomId, ownerConn)!.Players.First(p => p.Id == ownerId);

        Assert.Equal((false, true), (owner.HasPoints, owner.HasHours));
    }

    [Fact]
    public void SubmitHours_WithNull_ClearsTheHours()
    {
        var (service, roomId, ownerId, ownerConn) = Setup();
        service.SubmitHours(roomId, 6m, ownerConn);

        var owner = service.SubmitHours(roomId, null, ownerConn)!.Players.First(p => p.Id == ownerId);

        Assert.False(owner.HasHours);
    }

    [Fact]
    public void SubmitHours_AfterTheReveal_IsRejected()
    {
        var (service, roomId, _, ownerConn) = Setup();
        service.SubmitVote(roomId, "5", ownerConn);
        service.RevealVotes(roomId, ownerConn);

        Assert.Null(service.SubmitHours(roomId, 6m, ownerConn));
    }

    [Fact]
    public void SubmitVote_FromAPlayerWithoutRole_NeedsNoHours()
    {
        var (service, roomId, _, ownerConn) = Setup();
        var po = service.EnterRoom(roomId, "PO", "conn-po", PlayerRole.None).Joined;

        var snapshot = service.SubmitVote(roomId, "5", "conn-po");

        Assert.True(snapshot!.Players.First(p => p.Id == po!.PlayerId).HasVoted);
    }

    [Fact]
    public void SubmitHours_InARoomWithoutHours_IsRejected()
    {
        var (service, roomId, ownerId, ownerConn) = Setup(hoursEnabled: false);

        var voted = service.SubmitVote(roomId, "5", ownerConn);

        Assert.True(voted!.Players.First(p => p.Id == ownerId).HasVoted);
        Assert.Null(service.SubmitHours(roomId, 8m, ownerConn));
    }

    [Fact]
    public void SubmitHours_FromAPlayerWithoutRole_IsRejected()
    {
        var (service, roomId, _, _) = Setup();
        service.EnterRoom(roomId, "PO", "conn-po", PlayerRole.None);

        Assert.Null(service.SubmitHours(roomId, 8m, "conn-po"));
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(0)]
    [InlineData(1000)]
    [InlineData(2.3)]
    public void SubmitHours_WithInvalidHours_IsRejected(double hours)
    {
        var (service, roomId, _, ownerConn) = Setup();

        Assert.Null(service.SubmitHours(roomId, (decimal)hours, ownerConn));
    }

    [Fact]
    public void SubmitHours_AcceptsHalfHoursFromTheMinimum()
    {
        var (service, roomId, _, ownerConn) = Setup();
        service.EnterRoom(roomId, "Tester", "conn-qa", PlayerRole.Qa);

        Assert.NotNull(service.SubmitHours(roomId, 2.5m, ownerConn));
        Assert.NotNull(service.SubmitHours(roomId, 0.5m, "conn-qa"));
    }

    [Fact]
    public void Reveal_RecordsRoleAndHoursOfEachVote()
    {
        var (service, roomId, ownerId, ownerConn) = Setup();
        var qa = service.EnterRoom(roomId, "Tester", "conn-qa", PlayerRole.Qa).Joined;
        service.SubmitVote(roomId, "5", ownerConn);
        service.SubmitHours(roomId, 6m, ownerConn);
        service.SubmitVote(roomId, "3", "conn-qa");
        service.SubmitHours(roomId, 2.5m, "conn-qa");

        var snapshot = service.RevealVotes(roomId, ownerConn);

        var votes = snapshot!.History[^1].Votes;
        var dev = votes.Single(v => v.PlayerId == ownerId);
        var tester = votes.Single(v => v.PlayerId == qa!.PlayerId);
        Assert.Equal((PlayerRole.Dev, 6m), (dev.Role, dev.Hours));
        Assert.Equal((PlayerRole.Qa, 2.5m), (tester.Role, tester.Hours));
    }

    [Fact]
    public void Reveal_KeepsThePointsOfSomeoneWhoHasNotFilledTheHoursYet()
    {
        var (service, roomId, ownerId, ownerConn) = Setup();
        service.SubmitVote(roomId, "5", ownerConn);

        var snapshot = service.RevealVotes(roomId, ownerConn);

        var vote = snapshot!.History[^1].Votes.Single(v => v.PlayerId == ownerId);
        Assert.Equal("5", vote.Vote);
        Assert.Null(vote.Hours);
    }

    [Fact]
    public void Reset_ClearsTheHours()
    {
        var (service, roomId, ownerId, ownerConn) = Setup();
        service.SubmitVote(roomId, "5", ownerConn);
        service.SubmitHours(roomId, 6m, ownerConn);
        service.RevealVotes(roomId, ownerConn);
        service.ResetVotes(roomId, ownerConn);

        var snapshot = service.SubmitVote(roomId, "5", ownerConn);

        Assert.False(snapshot!.Players.First(p => p.Id == ownerId).HasHours);
    }

    [Fact]
    public void EnterRoom_WithAnUnknownRole_IsRejected()
    {
        var (service, roomId, _, _) = Setup();

        Assert.Null(service.EnterRoom(roomId, "Someone", "conn-x", (PlayerRole)42).Joined);
    }

    [Fact]
    public void Watcher_KeepsTheRoleWhenTakingASeat()
    {
        var (service, roomId, _, _) = Setup();
        var watcher = service.WatchRoom(roomId, "Tester", "conn-qa", PlayerRole.Qa).Joined;

        var snapshot = service.TakeSeat(roomId, "conn-qa").Joined!.Snapshot;

        Assert.Equal(PlayerRole.Qa, snapshot.Players.First(p => p.Id == watcher!.WatcherId).Role);
    }

    [Fact]
    public void Player_KeepsTheRoleWhenLeavingTheSeat()
    {
        var (service, roomId, ownerId, ownerConn) = Setup();

        var snapshot = service.LeaveSeat(roomId, ownerConn).Joined!.Snapshot;

        Assert.Equal(PlayerRole.Dev, snapshot.Watchers.First(w => w.Id == ownerId).Role);
    }
}
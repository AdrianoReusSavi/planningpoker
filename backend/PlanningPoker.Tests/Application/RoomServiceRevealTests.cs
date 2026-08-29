using PlanningPoker.Application.Services;
using PlanningPoker.Domain.Enums;
using PlanningPoker.Infrastructure.Repositories;

namespace PlanningPoker.Tests.Application;

public class RoomServiceRevealTests
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
    public void KickingAPlayerAfterTheReveal_DoesNotChangeTheRevealedRound()
    {
        var (service, roomId, _, ownerConn) = Setup();
        var target = service.EnterRoom(roomId, "Target", "conn-target").Joined;
        Assert.NotNull(target);
        service.SubmitVote(roomId, "5", ownerConn);
        service.SubmitVote(roomId, "8", "conn-target");
        Assert.NotNull(service.RevealVotes(roomId, ownerConn));

        var kick = service.KickPlayer(roomId, target!.PlayerId, ownerConn);

        Assert.NotNull(kick);
        Assert.Equal("8", kick!.Snapshot.Votes[target.PlayerId]);
        Assert.DoesNotContain(kick.Snapshot.Players, p => p.Id == target.PlayerId);
    }

    [Fact]
    public void LeavingAfterTheReveal_DoesNotChangeTheRevealedRound()
    {
        var (service, roomId, _, ownerConn) = Setup();
        var leaver = service.EnterRoom(roomId, "Leaver", "conn-leaver").Joined;
        Assert.NotNull(leaver);
        service.SubmitVote(roomId, "5", ownerConn);
        service.SubmitVote(roomId, "8", "conn-leaver");
        Assert.NotNull(service.RevealVotes(roomId, ownerConn));

        var leave = service.LeaveRoom(roomId, "conn-leaver");

        Assert.NotNull(leave?.Snapshot);
        Assert.Equal("8", leave!.Snapshot!.Votes[leaver!.PlayerId]);
        Assert.DoesNotContain(leave.Snapshot.Players, p => p.Id == leaver.PlayerId);
    }

    [Fact]
    public void ResettingTheRound_ClearsTheRevealedVotes()
    {
        var (service, roomId, _, ownerConn) = Setup();
        service.SubmitVote(roomId, "5", ownerConn);
        service.RevealVotes(roomId, ownerConn);

        var reset = service.ResetVotes(roomId, ownerConn);

        Assert.NotNull(reset);
        Assert.Empty(reset!.Votes);
        Assert.Single(reset.History);
    }
}
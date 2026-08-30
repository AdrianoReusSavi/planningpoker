using PlanningPoker.Application.Results;
using PlanningPoker.Application.Services;
using PlanningPoker.Domain.Enums;
using PlanningPoker.Infrastructure.Repositories;

namespace PlanningPoker.Tests.Application;

public class RoomServiceLifecycleTests
{
    private static (RoomService service, InMemoryRoomRepository repo) Setup()
    {
        var repo = new InMemoryRoomRepository();
        return (new RoomService(repo), repo);
    }

    [Fact]
    public void CreateRoom_AsWatcher_StartsWithNobodySeated()
    {
        var (service, _) = Setup();

        var created = service.CreateRoom("SM", "Refinement", EstimationOptions.Fibonacci, true, "conn-sm").Created;

        Assert.NotNull(created);
        Assert.Empty(created!.Snapshot.Players);
        var watcher = Assert.Single(created.Snapshot.Watchers);
        Assert.Equal(created.ParticipantId, watcher.Id);
        Assert.Equal(created.ParticipantId, created.Snapshot.OwnerId);
    }

    [Fact]
    public void CreateRoom_AsWatcher_TheOwnerCanTakeASeatLater()
    {
        var (service, _) = Setup();
        var created = service.CreateRoom("SM", "Refinement", EstimationOptions.Fibonacci, true, "conn-sm").Created;

        var seated = service.TakeSeat(created!.RoomId, "conn-sm").Joined;

        Assert.NotNull(seated);
        Assert.Equal(created.ParticipantId, seated!.PlayerId);
        Assert.Single(seated.Snapshot.Players);
        Assert.Empty(seated.Snapshot.Watchers);
    }

    [Fact]
    public void CreateRoom_FromAConnectionAlreadyInARoom_IsRejected()
    {
        var (service, _) = Setup();
        service.CreateRoom("Owner", "First", EstimationOptions.Fibonacci, false, "conn-owner");

        var second = service.CreateRoom("Owner", "Second", EstimationOptions.Fibonacci, false, "conn-owner");

        Assert.Equal(RoomJoinError.AlreadyInRoom, second.Error);
    }

    [Fact]
    public void CreateRoom_WithABlankName_IsRejected()
    {
        var (service, _) = Setup();

        Assert.Equal(RoomJoinError.InvalidName,
            service.CreateRoom("   ", "Room", EstimationOptions.Fibonacci, false, "conn-owner").Error);
    }

    [Fact]
    public void TheRoomSurvivesTheLastPlayerLeaving_WhenAWatcherStays()
    {
        var (service, repo) = Setup();
        var created = service.CreateRoom("Owner", "Room", EstimationOptions.Fibonacci, false, "conn-owner").Created;
        var roomId = created!.RoomId;
        service.WatchRoom(roomId, "SM", "conn-sm");

        var leave = service.LeaveRoom(roomId, "conn-owner");

        Assert.NotNull(leave);
        Assert.NotNull(repo.GetRoom(roomId));
        Assert.Empty(leave!.Snapshot!.Players);
        Assert.Single(leave.Snapshot.Watchers);
    }

    [Fact]
    public void TheWatcherIsNotStuckAfterTheLastPlayerLeaves()
    {
        var (service, _) = Setup();
        var created = service.CreateRoom("Owner", "Room", EstimationOptions.Fibonacci, false, "conn-owner").Created;
        service.WatchRoom(created!.RoomId, "SM", "conn-sm");
        service.LeaveRoom(created.RoomId, "conn-owner");

        var seated = service.TakeSeat(created.RoomId, "conn-sm").Joined;

        Assert.NotNull(seated);
        Assert.Single(seated!.Snapshot.Players);
    }

    [Fact]
    public void TheRoomIsCollectedWhenTheLastWatcherLeaves()
    {
        var (service, repo) = Setup();
        var created = service.CreateRoom("SM", "Room", EstimationOptions.Fibonacci, true, "conn-sm").Created;

        service.LeaveRoom(created!.RoomId, "conn-sm");

        Assert.Null(repo.GetRoom(created.RoomId));
    }

    [Fact]
    public void GetRoomName_AnswersBeforeAnyoneJoins()
    {
        var (service, _) = Setup();
        var created = service.CreateRoom("Owner", "Refinamento do time", EstimationOptions.Fibonacci, false, "conn-owner").Created;

        Assert.Equal("Refinamento do time", service.GetRoomName(created!.RoomId));
    }

    [Fact]
    public void GetRoomName_OnAnUnknownRoom_ReturnsNull()
    {
        var (service, _) = Setup();

        Assert.Null(service.GetRoomName("nonexistent-room"));
    }

    [Fact]
    public void RevealingWithNobodySeated_IsRejected()
    {
        var (service, _) = Setup();
        var created = service.CreateRoom("SM", "Room", EstimationOptions.Fibonacci, true, "conn-sm").Created;

        Assert.Null(service.RevealVotes(created!.RoomId, "conn-sm"));
    }
}
using PlanningPoker.Application.Results;
using PlanningPoker.Application.Services;
using PlanningPoker.Domain.Entities;
using PlanningPoker.Domain.Enums;
using PlanningPoker.Infrastructure.Repositories;

namespace PlanningPoker.Tests.Application;

public class RoomServiceEnterRoomTests
{
    private static (RoomService service, InMemoryRoomRepository repo, string roomId) SetupWithPlayers(int playerCount)
    {
        var repo = new InMemoryRoomRepository();
        var service = new RoomService(repo);
        var created = service.CreateRoom("Owner", "Test Room", EstimationOptions.Fibonacci, false, "conn-owner").Created;
        
        Assert.NotNull(created);

        for (var i = 1; i < playerCount; i++)
            Assert.NotNull(service.EnterRoom(created!.RoomId, $"P{i}", $"conn-{i}").Joined);

        return (service, repo, created!.RoomId);
    }

    [Fact]
    public void EnterRoom_WithTheTableFull_IsRejected()
    {
        var (service, _, roomId) = SetupWithPlayers(Room.MaxPlayersPerRoom);

        var outcome = service.EnterRoom(roomId, "Late", "conn-late");

        Assert.Null(outcome.Joined);
        Assert.Equal(RoomJoinError.RoomFull, outcome.Error);
    }

    [Fact]
    public void EnterRoom_WhenTheConnectionIsAlreadyInARoom_IsRejected()
    {
        var (service, _, roomId) = SetupWithPlayers(2);

        var outcome = service.EnterRoom(roomId, "Again", "conn-1");

        Assert.Null(outcome.Joined);
        Assert.Equal(RoomJoinError.AlreadyInRoom, outcome.Error);
    }

    [Fact]
    public async Task EnterRoom_ConcurrentJoinsForTheLastSeat_OnlyOneSucceeds()
    {
        for (var round = 0; round < 200; round++)
            await RaceForTheLastSeat(contenders: 8);
    }

    private static async Task RaceForTheLastSeat(int contenders)
    {
        var (service, repo, roomId) = SetupWithPlayers(Room.MaxPlayersPerRoom - 1);
        using var barrier = new Barrier(contenders);

        var attempts = Enumerable.Range(0, contenders).Select(i =>
            Task.Factory.StartNew(() =>
            {
                barrier.SignalAndWait();
                EnterRoomOutcome? outcome = null;
                var error = Record.Exception(() => outcome = service.EnterRoom(roomId, $"C{i}", $"conn-c{i}"));
                return (outcome, error);
            }, TaskCreationOptions.LongRunning));

        var results = await Task.WhenAll(attempts);

        Assert.All(results, r => Assert.Null(r.error));
        Assert.Single(results, r => r.outcome!.Joined is not null);
        Assert.Equal(contenders - 1, results.Count(r => r.outcome!.Error == RoomJoinError.RoomFull));
        Assert.Equal(Room.MaxPlayersPerRoom, repo.GetRoom(roomId)!.PlayerCount);
    }
}
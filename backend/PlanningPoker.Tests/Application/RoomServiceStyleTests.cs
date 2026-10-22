using PlanningPoker.Application.Services;
using PlanningPoker.Domain.Enums;
using PlanningPoker.Infrastructure.Repositories;

namespace PlanningPoker.Tests.Application;

public class RoomServiceStyleTests
{
    private static (RoomService service, string roomId, string ownerConnId) Setup()
    {
        var repo = new InMemoryRoomRepository();
        var service = new RoomService(repo);

        var ownerConnId = "conn-owner";
        var create = service.CreateRoom("Owner", "Test Room", EstimationOptions.Fibonacci, false, ownerConnId).Created;
        Assert.NotNull(create);

        return (service, create!.RoomId, ownerConnId);
    }

    [Theory]
    [InlineData("stripes")]
    [InlineData("dots")]
    [InlineData("grid")]
    [InlineData("waves")]
    [InlineData("zigzag")]
    [InlineData("stars")]
    [InlineData("none")]
    public void UpdateStyle_AllowedPatterns_ReturnsSnapshot(string pattern)
    {
        var (service, roomId, ownerConn) = Setup();

        var result = service.UpdateStyle(roomId, null, pattern, null, ownerConn);

        Assert.NotNull(result);
    }

    [Theory]
    [InlineData("hearts")]
    [InlineData("Stars")]
    [InlineData("")]
    public void UpdateStyle_DisallowedPatterns_ReturnsNull(string pattern)
    {
        var (service, roomId, ownerConn) = Setup();

        var result = service.UpdateStyle(roomId, null, pattern, null, ownerConn);

        Assert.Null(result);
    }
}

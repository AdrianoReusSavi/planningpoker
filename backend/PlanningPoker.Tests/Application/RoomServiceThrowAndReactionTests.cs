using PlanningPoker.Application.Services;
using PlanningPoker.Domain.Enums;
using PlanningPoker.Infrastructure.Repositories;

namespace PlanningPoker.Tests.Application;

public class RoomServiceThrowAndReactionTests
{
    private static (RoomService service, string roomId, string ownerPlayerId, string ownerConnId, string targetPlayerId, string targetConnId) Setup()
    {
        var repo = new InMemoryRoomRepository();
        var service = new RoomService(repo);

        var ownerConnId = "conn-owner";
        var create = service.CreateRoom("Owner", "Test Room", EstimationOptions.Fibonacci, ownerConnId);
        Assert.NotNull(create);

        var targetConnId = "conn-target";
        var enter = service.EnterRoom(create!.RoomId, "Target", targetConnId);
        Assert.NotNull(enter);

        return (service, create.RoomId, create.PlayerId, ownerConnId, enter!.PlayerId, targetConnId);
    }

    // ── ValidateThrow ──

    [Theory]
    [InlineData("turtle")]
    [InlineData("tomato")]
    [InlineData("heart")]
    [InlineData("confused")]
    [InlineData("rocket")]
    public void ValidateThrow_AllowedItems_ReturnsResult(string item)
    {
        var (service, roomId, _, ownerConn, targetPlayerId, _) = Setup();

        var result = service.ValidateThrow(roomId, targetPlayerId, item, ownerConn);

        Assert.NotNull(result);
        Assert.Equal(roomId, result!.RoomId);
        Assert.Equal(targetPlayerId, result.ToPlayerId);
        Assert.Equal(item, result.Item);
    }

    [Theory]
    [InlineData("paper")]
    [InlineData("coffee")]
    [InlineData("pillow")]
    [InlineData("")]
    [InlineData("unknown")]
    public void ValidateThrow_DisallowedItems_ReturnsNull(string item)
    {
        var (service, roomId, _, ownerConn, targetPlayerId, _) = Setup();

        var result = service.ValidateThrow(roomId, targetPlayerId, item, ownerConn);

        Assert.Null(result);
    }

    [Fact]
    public void ValidateThrow_PopulatesFromPlayerIdFromConnection()
    {
        var (service, roomId, ownerPlayerId, ownerConn, targetPlayerId, _) = Setup();

        var result = service.ValidateThrow(roomId, targetPlayerId, "tomato", ownerConn);

        Assert.NotNull(result);
        Assert.Equal(ownerPlayerId, result!.FromPlayerId);
    }

    [Fact]
    public void ValidateThrow_RejectsSelfThrow()
    {
        var (service, roomId, ownerPlayerId, ownerConn, _, _) = Setup();

        var result = service.ValidateThrow(roomId, ownerPlayerId, "heart", ownerConn);

        Assert.Null(result);
    }

    [Fact]
    public void ValidateThrow_TargetNotInRoom_ReturnsNull()
    {
        var (service, roomId, _, ownerConn, _, _) = Setup();

        var result = service.ValidateThrow(roomId, "ghost-player", "tomato", ownerConn);

        Assert.Null(result);
    }

    [Fact]
    public void ValidateThrow_RoomNotFound_ReturnsNull()
    {
        var (service, _, _, ownerConn, targetPlayerId, _) = Setup();

        var result = service.ValidateThrow("nonexistent-room", targetPlayerId, "tomato", ownerConn);

        Assert.Null(result);
    }

    [Fact]
    public void ValidateThrow_SenderConnectionUnknown_ReturnsNull()
    {
        var (service, roomId, _, _, targetPlayerId, _) = Setup();

        var result = service.ValidateThrow(roomId, targetPlayerId, "tomato", "stranger-conn");

        Assert.Null(result);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void ValidateThrow_BlankRoomId_ReturnsNull(string? roomId)
    {
        var (service, _, _, ownerConn, targetPlayerId, _) = Setup();

        var result = service.ValidateThrow(roomId!, targetPlayerId, "tomato", ownerConn);

        Assert.Null(result);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void ValidateThrow_BlankTargetId_ReturnsNull(string? targetId)
    {
        var (service, roomId, _, ownerConn, _, _) = Setup();

        var result = service.ValidateThrow(roomId, targetId!, "tomato", ownerConn);

        Assert.Null(result);
    }

    // ── ValidateReaction ──

    [Theory]
    [InlineData("like")]
    [InlineData("dislike")]
    [InlineData("thinking")]
    [InlineData("celebrate")]
    [InlineData("question")]
    [InlineData("laugh")]
    [InlineData("cry")]
    public void ValidateReaction_AllowedKeys_ReturnsResult(string reaction)
    {
        var (service, roomId, _, ownerConn, _, _) = Setup();

        var result = service.ValidateReaction(roomId, reaction, ownerConn);

        Assert.NotNull(result);
        Assert.Equal(roomId, result!.RoomId);
        Assert.Equal(reaction, result.Reaction);
    }

    [Fact]
    public void ValidateReaction_PopulatesFromPlayerIdFromConnection()
    {
        var (service, roomId, ownerPlayerId, ownerConn, _, _) = Setup();

        var result = service.ValidateReaction(roomId, "like", ownerConn);

        Assert.NotNull(result);
        Assert.Equal(ownerPlayerId, result!.FromPlayerId);
    }

    [Fact]
    public void ValidateReaction_DistinguishesSenderByConnection()
    {
        var (service, roomId, ownerPlayerId, ownerConn, targetPlayerId, targetConn) = Setup();

        var fromOwner = service.ValidateReaction(roomId, "like", ownerConn);
        var fromTarget = service.ValidateReaction(roomId, "like", targetConn);

        Assert.NotNull(fromOwner);
        Assert.NotNull(fromTarget);
        Assert.Equal(ownerPlayerId, fromOwner!.FromPlayerId);
        Assert.Equal(targetPlayerId, fromTarget!.FromPlayerId);
    }

    [Theory]
    [InlineData("clap")]
    [InlineData("")]
    [InlineData("unknown-reaction")]
    public void ValidateReaction_DisallowedKeys_ReturnsNull(string reaction)
    {
        var (service, roomId, _, ownerConn, _, _) = Setup();

        var result = service.ValidateReaction(roomId, reaction, ownerConn);

        Assert.Null(result);
    }

    [Fact]
    public void ValidateReaction_RoomNotFound_ReturnsNull()
    {
        var (service, _, _, ownerConn, _, _) = Setup();

        var result = service.ValidateReaction("nonexistent-room", "like", ownerConn);

        Assert.Null(result);
    }

    [Fact]
    public void ValidateReaction_SenderConnectionUnknown_ReturnsNull()
    {
        var (service, roomId, _, _, _, _) = Setup();

        var result = service.ValidateReaction(roomId, "like", "stranger-conn");

        Assert.Null(result);
    }
}
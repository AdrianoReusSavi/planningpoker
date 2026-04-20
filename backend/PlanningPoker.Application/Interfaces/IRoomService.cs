using PlanningPoker.Application.Results;
using PlanningPoker.Domain.Enums;
using PlanningPoker.Domain.Snapshots;

namespace PlanningPoker.Application.Interfaces;

public interface IRoomService
{
    CreateRoomResult? CreateRoom(string name, string roomName, EstimationOptions votingDeck, string connectionId);
    EnterRoomResult? EnterRoom(string roomId, string name, string connectionId);
    RoomSnapshot? WatchRoom(string roomId, string connectionId);
    ReconnectResult? Reconnect(string roomId, string playerId, string connectionId);
    RoomSnapshot? GetRoomSettings(string connectionId);
    RoomSnapshot? TransferOwnership(string roomId, string targetPlayerId, string connectionId);
    RoomSnapshot? SubmitVote(string roomId, string vote, string connectionId);
    RoomSnapshot? RevealVotes(string roomId, string connectionId);
    RoomSnapshot? ResetVotes(string roomId, string connectionId);
    KickResult? KickPlayer(string roomId, string targetPlayerId, string connectionId);
    RoomSnapshot? ToggleBreakRequest(string roomId, string connectionId);
    RoomSnapshot? ClearBreakRequests(string roomId, string connectionId);
    ReactionResult? ValidateReaction(string roomId, string reaction, string connectionId);
    LeaveResult? LeaveRoom(string roomId, string connectionId);
    DisconnectResult? HandleDisconnect(string connectionId);
    RemovalResult PermanentlyRemovePlayer(string roomId, string playerId);
}
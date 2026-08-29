using PlanningPoker.Application.Results;

namespace PlanningPoker.Api.Contracts;

public record JoinRoomResponse(string? Id, string? Error)
{
    public static JoinRoomResponse Accepted(string participantId) => new(participantId, null);

    public static JoinRoomResponse Rejected(RoomJoinError error) => new(null, Code(error));

    private static string Code(RoomJoinError error) => error switch
    {
        RoomJoinError.InvalidName => "INVALID_NAME",
        RoomJoinError.RoomNotFound => "ROOM_NOT_FOUND",
        RoomJoinError.RoomFull => "ROOM_FULL",
        RoomJoinError.AlreadyInRoom => "ALREADY_IN_ROOM",
        RoomJoinError.NotInRoom => "NOT_IN_ROOM",
        RoomJoinError.RoundRevealed => "ROUND_REVEALED",
        _ => "UNKNOWN",
    };
}
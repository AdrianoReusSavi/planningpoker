namespace PlanningPoker.Application.Results;

public record EnterRoomOutcome(EnterRoomResult? Joined, RoomJoinError Error)
{
    public static EnterRoomOutcome Success(EnterRoomResult joined) => new(joined, RoomJoinError.None);

    public static EnterRoomOutcome Failed(RoomJoinError error) => new(null, error);
}
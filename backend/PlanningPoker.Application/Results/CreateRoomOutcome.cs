namespace PlanningPoker.Application.Results;

public record CreateRoomOutcome(CreateRoomResult? Created, RoomJoinError Error)
{
    public static CreateRoomOutcome Success(CreateRoomResult created) => new(created, RoomJoinError.None);

    public static CreateRoomOutcome Failed(RoomJoinError error) => new(null, error);
}
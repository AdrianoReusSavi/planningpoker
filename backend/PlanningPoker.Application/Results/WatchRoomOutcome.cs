namespace PlanningPoker.Application.Results;

public record WatchRoomOutcome(WatchRoomResult? Joined, RoomJoinError Error)
{
    public static WatchRoomOutcome Success(WatchRoomResult joined) => new(joined, RoomJoinError.None);

    public static WatchRoomOutcome Failed(RoomJoinError error) => new(null, error);
}
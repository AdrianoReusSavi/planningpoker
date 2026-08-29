namespace PlanningPoker.Application.Results;

public enum RoomJoinError
{
    None,
    InvalidName,
    RoomNotFound,
    RoomFull,
    AlreadyInRoom,
    NotInRoom,
    LastSeatedPlayer,
    RoundRevealed
}
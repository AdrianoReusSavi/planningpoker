using PlanningPoker.Domain.Snapshots;

namespace PlanningPoker.Application.Results;

public record EnterRoomResult(string RoomId, string PlayerId, RoomSnapshot Snapshot);
using PlanningPoker.Domain.Snapshots;

namespace PlanningPoker.Application.Results;

public record CreateRoomResult(string RoomId, string PlayerId, RoomSnapshot Snapshot);
using PlanningPoker.Domain.Snapshots;

namespace PlanningPoker.Application.Results;

public record WatchRoomResult(string RoomId, string WatcherId, RoomSnapshot Snapshot);
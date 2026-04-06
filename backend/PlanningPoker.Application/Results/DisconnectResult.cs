using PlanningPoker.Domain.Snapshots;

namespace PlanningPoker.Application.Results;

public record DisconnectResult(string RoomId, string PlayerId, RoomSnapshot Snapshot);
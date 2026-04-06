using PlanningPoker.Domain.Snapshots;

namespace PlanningPoker.Application.Results;

public record KickResult(string RoomId, string TargetConnectionId, RoomSnapshot Snapshot);
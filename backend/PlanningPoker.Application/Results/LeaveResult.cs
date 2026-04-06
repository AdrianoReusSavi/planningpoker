using PlanningPoker.Domain.Snapshots;

namespace PlanningPoker.Application.Results;

public record LeaveResult(string? PlayerId, string RoomId, RoomSnapshot? Snapshot);
using PlanningPoker.Domain.Snapshots;

namespace PlanningPoker.Application.Results;

public record ReconnectResult(string RoomId, string? OldConnectionId, RoomSnapshot Snapshot);
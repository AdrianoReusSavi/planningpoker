using PlanningPoker.Domain.Snapshots;

namespace PlanningPoker.Application.Results;

public record RemovalResult(bool RoomRemoved, RoomSnapshot? Snapshot);
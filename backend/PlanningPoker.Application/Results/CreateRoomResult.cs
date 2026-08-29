using PlanningPoker.Domain.Snapshots;

namespace PlanningPoker.Application.Results;

public record CreateRoomResult(string RoomId, string ParticipantId, RoomSnapshot Snapshot);
namespace PlanningPoker.Application.Results;

public record ThrowResult(string RoomId, string FromPlayerId, string ToPlayerId, string Item);
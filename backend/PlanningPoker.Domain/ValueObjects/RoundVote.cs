using PlanningPoker.Domain.Enums;

namespace PlanningPoker.Domain.ValueObjects;

public record RoundVote(
    string PlayerId,
    string Name,
    string Vote,
    PlayerRole Role = PlayerRole.None,
    decimal? Hours = null
);
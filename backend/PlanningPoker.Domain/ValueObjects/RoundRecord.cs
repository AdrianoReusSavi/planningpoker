namespace PlanningPoker.Domain.ValueObjects;

public record RoundRecord(
    int Round,
    IReadOnlyList<RoundVote> Votes,
    DateTime CompletedAt
);
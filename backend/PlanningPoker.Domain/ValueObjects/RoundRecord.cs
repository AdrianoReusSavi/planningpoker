namespace PlanningPoker.Domain.ValueObjects;

public record RoundRecord(
    int Round,
    IReadOnlyDictionary<string, string> Votes,
    DateTime CompletedAt
);
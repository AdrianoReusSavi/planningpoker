namespace PlanningPoker.Domain.ValueObjects;

public record RoundVote(
    string PlayerId,
    string Name,
    string Vote
);
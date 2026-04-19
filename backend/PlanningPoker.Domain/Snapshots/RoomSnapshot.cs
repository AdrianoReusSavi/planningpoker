using PlanningPoker.Domain.ValueObjects;

namespace PlanningPoker.Domain.Snapshots;

public record RoomSnapshot(
    string Id,
    string OwnerId,
    string RoomName,
    string VotingDeck,
    string Phase,
    IReadOnlyList<PlayerSnapshot> Players,
    IReadOnlyDictionary<string, string> Votes,
    IReadOnlyList<RoundRecord> History,
    IReadOnlyList<string> BreakRequesters
);
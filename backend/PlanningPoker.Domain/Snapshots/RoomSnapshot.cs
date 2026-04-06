namespace PlanningPoker.Domain.Snapshots;

public record RoomSnapshot(
    string Id,
    string OwnerId,
    string RoomName,
    string VotingDeck,
    string Phase,
    IReadOnlyList<PlayerSnapshot> Players
);
namespace PlanningPoker.Domain.Snapshots;

public record PlayerSnapshot(string Id, string Name, bool HasVoted, bool Connected);
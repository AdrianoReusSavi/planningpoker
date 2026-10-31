using PlanningPoker.Domain.Enums;

namespace PlanningPoker.Domain.Snapshots;

public record PlayerSnapshot(string Id, string Name, bool HasVoted, bool Connected, string? Style, string? Pattern, string? PatternColor, PlayerRole Role, bool HasPoints, bool HasHours);
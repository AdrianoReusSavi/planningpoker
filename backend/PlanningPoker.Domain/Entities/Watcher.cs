namespace PlanningPoker.Domain.Entities;

public class Watcher
{
    public required string WatcherId { get; set; }
    public required string ConnectionId { get; set; }
    public required string Username { get; set; }
    public bool Connected { get; set; } = true;
    public required string Accent { get; set; }
    public required int Character { get; set; }
}
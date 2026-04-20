namespace PlanningPoker.Domain.Entities;

public class User
{
    public required string PlayerId { get; set; }
    public required string ConnectionId { get; set; }
    public required string Username { get; set; }
    public string? Vote { get; set; }
    public bool Connected { get; set; } = true;
    public string? Style { get; set; }
    public string? Pattern { get; set; }
    public string? PatternColor { get; set; }
}
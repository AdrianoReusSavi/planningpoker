using PlanningPoker.Domain.Entities;

namespace PlanningPoker.Application.Interfaces;

public interface IRoomRepository
{
    Room? GetRoom(string roomId);
    bool TryAddRoom(Room room);
    bool TryRemoveRoom(string roomId);
    string? GetRoomIdByConnection(string connectionId);
    void MapConnection(string connectionId, string roomId);
    bool UnmapConnection(string connectionId);
    bool HasConnection(string connectionId);
}
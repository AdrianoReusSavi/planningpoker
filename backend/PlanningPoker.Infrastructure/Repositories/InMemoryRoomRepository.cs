using System.Collections.Concurrent;
using PlanningPoker.Application.Interfaces;
using PlanningPoker.Domain.Entities;

namespace PlanningPoker.Infrastructure.Repositories;

public class InMemoryRoomRepository : IRoomRepository
{
    private readonly ConcurrentDictionary<string, Room> _rooms = new();
    private readonly ConcurrentDictionary<string, string> _userRooms = new();

    public Room? GetRoom(string roomId)
        => _rooms.TryGetValue(roomId, out var room) ? room : null;

    public bool TryAddRoom(Room room)
        => _rooms.TryAdd(room.RoomId, room);

    public bool TryRemoveRoom(string roomId)
        => _rooms.TryRemove(roomId, out _);

    public string? GetRoomIdByConnection(string connectionId)
        => _userRooms.TryGetValue(connectionId, out var roomId) ? roomId : null;

    public void MapConnection(string connectionId, string roomId)
        => _userRooms[connectionId] = roomId;

    public bool UnmapConnection(string connectionId)
        => _userRooms.TryRemove(connectionId, out _);

    public bool HasConnection(string connectionId)
        => _userRooms.ContainsKey(connectionId);
}
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useConnection } from './ConnectionContext'
import { useRoomActions } from '../hooks/useRoomActions'
import { useSessionStorage } from '../hooks/useSessionStorage'
import type { RoomSnapshot } from '../types/room'

interface RoomContextValue {
  snapshot: RoomSnapshot | null
  playerId: string | null
  isWatching: boolean
  setPlayerId: (id: string | null) => void
  clearRoom: () => void
}

const RoomContext = createContext<RoomContextValue>({
  snapshot: null,
  playerId: null,
  isWatching: false,
  setPlayerId: () => {},
  clearRoom: () => {},
})

export function RoomProvider({ children }: { children: ReactNode }) {
  const { connection, connected } = useConnection()
  const { reconnect } = useRoomActions(connection, connected)
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null)
  const [playerId, setPlayerId] = useSessionStorage('playerId')
  const [, setRoomId] = useSessionStorage('roomId')
  const reconnectAttempted = useRef(false)

  const clearRoom = useCallback(() => {
    setSnapshot(null)
    setPlayerId(null)
    setRoomId(null)
  }, [setPlayerId, setRoomId])

  useEffect(() => {
    localStorage.removeItem('playerId')
    localStorage.removeItem('roomId')
  }, [])

  useEffect(() => {
    if (!connection) return

    const handleStateSync = (room: RoomSnapshot) => {
      setSnapshot(room)
      setRoomId(room.id)
    }

    const handleKicked = () => {
      clearRoom()
    }

    connection.on('STATE_SYNC', handleStateSync)
    connection.on('KICKED', handleKicked)
    return () => {
      connection.off('STATE_SYNC', handleStateSync)
      connection.off('KICKED', handleKicked)
    }
  }, [connection, clearRoom, setRoomId])

  useEffect(() => {
    if (!connection || !connected) {
      reconnectAttempted.current = false
      return
    }

    const savedRoomId = sessionStorage.getItem('roomId')
    const savedPlayerId = sessionStorage.getItem('playerId')

    if (!savedRoomId || !savedPlayerId || reconnectAttempted.current) return
    reconnectAttempted.current = true

    const urlRoomId = new URLSearchParams(window.location.search).get('roomId')
    if (urlRoomId && urlRoomId !== savedRoomId) {
      clearRoom()
      return
    }

    reconnect(savedRoomId, savedPlayerId)
      .then((success) => {
        if (success) {
          setPlayerId(savedPlayerId)
        } else {
          clearRoom()
        }
      })
      .catch(() => {
        clearRoom()
      })
  }, [connection, connected, clearRoom, reconnect, setPlayerId])

  const isWatching = snapshot !== null && playerId !== null
    && snapshot.watchers.some(w => w.id === playerId)

  return (
    <RoomContext.Provider value={{ snapshot, playerId, isWatching, setPlayerId, clearRoom }}>
      {children}
    </RoomContext.Provider>
  )
}

export function useRoom() {
  return useContext(RoomContext)
}
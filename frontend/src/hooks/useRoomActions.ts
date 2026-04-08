import { useCallback } from 'react'
import type { HubConnection } from '@microsoft/signalr'

export function useRoomActions(connection: HubConnection | null, connected: boolean) {
  const invoke = useCallback(async <T>(method: string, ...args: unknown[]): Promise<T | null> => {
    if (!connection || !connected) return null
    return connection.invoke<T>(method, ...args)
  }, [connection, connected])

  const createRoom = useCallback(
    (name: string, roomName: string, votingDeck: number) =>
      invoke<string>('CreateRoom', name, roomName, votingDeck),
    [invoke],
  )

  const enterRoom = useCallback(
    (roomId: string, name: string) =>
      invoke<string>('EnterRoom', roomId, name),
    [invoke],
  )

  const reconnect = useCallback(
    (roomId: string, playerId: string) =>
      invoke<boolean>('Reconnect', roomId, playerId),
    [invoke],
  )

  const submitVote = useCallback(
    (roomId: string, vote: string) =>
      invoke<void>('SubmitVote', roomId, vote),
    [invoke],
  )

  const revealVotes = useCallback(
    (roomId: string) => invoke<void>('RevealVotes', roomId),
    [invoke],
  )

  const resetVotes = useCallback(
    (roomId: string) => invoke<void>('ResetVotes', roomId),
    [invoke],
  )

  const leaveRoom = useCallback(
    (roomId: string) => invoke<void>('LeaveRoom', roomId),
    [invoke],
  )

  const kickPlayer = useCallback(
    (roomId: string, targetId: string) =>
      invoke<void>('KickPlayer', roomId, targetId),
    [invoke],
  )

  const transferOwnership = useCallback(
    (roomId: string, targetId: string) =>
      invoke<void>('TransferOwnership', roomId, targetId),
    [invoke],
  )

  const requestBreak = useCallback(
    (roomId: string) => invoke<void>('RequestBreak', roomId),
    [invoke],
  )

  return {
    createRoom,
    enterRoom,
    reconnect,
    submitVote,
    revealVotes,
    resetVotes,
    leaveRoom,
    kickPlayer,
    requestBreak,
    transferOwnership,
  }
}
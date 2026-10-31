import { useCallback } from 'react'
import type { HubConnection } from '@microsoft/signalr'
import type { JoinRoomResponse, PlayerRole, RoomPreview } from '../types/room'

export function useRoomActions(connection: HubConnection | null, connected: boolean) {
  const invoke = useCallback(async <T>(method: string, ...args: unknown[]): Promise<T | null> => {
    if (!connection || !connected) return null
    return connection.invoke<T>(method, ...args)
  }, [connection, connected])

  const createRoom = useCallback(
    (name: string, roomName: string, votingDeck: number, asWatcher: boolean, hoursEnabled: boolean, role: PlayerRole) =>
      invoke<JoinRoomResponse>('CreateRoom', name, roomName, votingDeck, asWatcher, hoursEnabled, role),
    [invoke],
  )

  const enterRoom = useCallback(
    (roomId: string, name: string, role: PlayerRole) =>
      invoke<JoinRoomResponse>('EnterRoom', roomId, name, role),
    [invoke],
  )

  const watchRoom = useCallback(
    (roomId: string, name: string, role: PlayerRole) =>
      invoke<JoinRoomResponse>('WatchRoom', roomId, name, role),
    [invoke],
  )

  const takeSeat = useCallback(
    (roomId: string) =>
      invoke<JoinRoomResponse>('TakeSeat', roomId),
    [invoke],
  )

  const leaveSeat = useCallback(
    (roomId: string) =>
      invoke<JoinRoomResponse>('LeaveSeat', roomId),
    [invoke],
  )

  const updateWatcherAppearance = useCallback(
    (roomId: string, accent: string, character: number) =>
      invoke<void>('UpdateWatcherAppearance', roomId, accent, character),
    [invoke],
  )

  const getRoomPreview = useCallback(
    (roomId: string) =>
      invoke<RoomPreview>('GetRoomPreview', roomId),
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

  const submitHours = useCallback(
    (roomId: string, hours: number | null) =>
      invoke<void>('SubmitHours', roomId, hours),
    [invoke],
  )

  const clearVote = useCallback(
    (roomId: string) =>
      invoke<void>('ClearVote', roomId),
    [invoke],
  )

  const setAutoReveal = useCallback(
    (roomId: string, enabled: boolean) =>
      invoke<void>('SetAutoReveal', roomId, enabled),
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

  const toggleBreakRequest = useCallback(
    (roomId: string) => invoke<void>('ToggleBreakRequest', roomId),
    [invoke],
  )

  const clearBreakRequests = useCallback(
    (roomId: string) => invoke<void>('ClearBreakRequests', roomId),
    [invoke],
  )

  const sendReaction = useCallback(
    (roomId: string, reaction: string) =>
      invoke<void>('SendReaction', roomId, reaction),
    [invoke],
  )

  const throwItem = useCallback(
    (roomId: string, targetPlayerId: string, item: string) =>
      invoke<void>('ThrowItem', roomId, targetPlayerId, item),
    [invoke],
  )

  const updateStyle = useCallback(
    (roomId: string, style: string | null, pattern: string | null, patternColor: string | null) =>
      invoke<void>('UpdateStyle', roomId, style, pattern, patternColor),
    [invoke],
  )

  return {
    createRoom,
    enterRoom,
    watchRoom,
    getRoomPreview,
    takeSeat,
    leaveSeat,
    updateWatcherAppearance,
    reconnect,
    submitVote,
    submitHours,
    clearVote,
    setAutoReveal,
    revealVotes,
    resetVotes,
    leaveRoom,
    kickPlayer,
    toggleBreakRequest,
    clearBreakRequests,
    sendReaction,
    throwItem,
    updateStyle,
    transferOwnership,
  }
}
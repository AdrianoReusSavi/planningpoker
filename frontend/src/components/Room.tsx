import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useConnection } from '../contexts/ConnectionContext'
import { useRoom } from '../contexts/RoomContext'
import { useRoomActions } from '../hooks/useRoomActions'
import { useBroadcastChannel } from '../hooks/useBroadcastChannel'
import { useToast } from '../contexts/ToastContext'
import { useI18n } from '../contexts/I18nContext'
import { getDeckByKey } from '../constants/estimationOptions'
import RoomHeader from './RoomHeader'
import PlayerGrid, { type PlayerView } from './PlayerGrid'
import VoteSummary from './VoteSummary'
import VotingControls from './VotingControls'
import VotingDeck from './VotingDeck'
import RoundHistory from './RoundHistory'
import Fireworks from './Fireworks'
import ConfirmModal from './ConfirmModal'
import ConnectionBanner from './ConnectionBanner'
import BreakRequestBanner from './BreakRequestBanner'
import ReactionBar from './ReactionBar'
import ReactionOverlay from './ReactionOverlay'
import ThrowOverlay from './ThrowOverlay'
import StyleEditor from './StyleEditor'
import BreakButton from './BreakButton'
import WatcherList from './WatcherList'
import WatcherEditor from './WatcherEditor'
import { EyeIcon, SeatIcon, LoadingIcon } from './Icons'
import type { RoomJoinError } from '../types/room'
import type { TranslationKey } from '../i18n/locales'

const PLAYER_STYLE_KEY = 'playerStyle'
const PLAYER_PATTERN_KEY = 'playerPattern'
const PLAYER_PATTERN_COLOR_KEY = 'playerPatternColor'

const seatErrorKey = (taking: boolean, error: RoomJoinError | null | undefined): TranslationKey => {
  if (error === 'ROOM_FULL') return taking ? 'seat.tableFull' : 'seat.benchFull'
  if (error === 'LAST_SEATED_PLAYER') return 'seat.lastPlayer'
  if (error === 'ROUND_REVEALED') return 'seat.revealed'
  return 'seat.failed'
}

interface ModalState {
  title: string
  message: string
  confirmText: string
  danger?: boolean
  onConfirm: () => void
}

export default function Room() {
  const { connection, connected, status } = useConnection()
  const { snapshot, playerId, isWatching, clearRoom } = useRoom()
  const actions = useRoomActions(connection, connected)
  const { showToast } = useToast()
  const { t } = useI18n()
  const [vote, setVote] = useState('')
  const [modal, setModal] = useState<ModalState | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [miniViewOpen, setMiniViewOpen] = useState(false)
  const [revealLoading, setRevealLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [leaveLoading, setLeaveLoading] = useState(false)
  const [styleEditorOpen, setStyleEditorOpen] = useState(false)
  const [watcherEditorOpen, setWatcherEditorOpen] = useState(false)
  const [seatLoading, setSeatLoading] = useState(false)
  const hydratedRoomRef = useRef<string | null>(null)

  const roomId = snapshot?.id ?? ''
  const flipped = snapshot?.phase === 'REVEALED'
  const isLeader = snapshot?.ownerId === playerId
  const votingDeck = getDeckByKey(snapshot?.votingDeck ?? '').list

  const players: PlayerView[] = useMemo(() => {
    if (!snapshot) return []
    return snapshot.players.map(p => ({
      id: p.id,
      username: p.name,
      hasVoted: p.hasVoted,
      vote: snapshot.votes[p.id] ?? '',
      connected: p.connected,
      style: p.style,
      pattern: p.pattern,
      patternColor: p.patternColor,
    }))
  }, [snapshot])

  const selfPlayer = playerId !== null ? players.find(p => p.id === playerId) : undefined
  const selfWatcher = playerId !== null ? snapshot?.watchers.find(w => w.id === playerId) : undefined

  const allVoted = players.length > 0 && players.every(u => u.hasVoted)
  const someVoted = players.some(u => u.hasVoted)
  const history = snapshot?.history ?? []
  const revealedRound = flipped ? history[history.length - 1] : undefined
  const revealedVotes = revealedRound?.votes.map(v => v.vote) ?? []
  const showFireworks = revealedVotes.length > 1
    && revealedVotes.length === revealedRound?.seatedCount
    && revealedVotes.every(v => v === revealedVotes[0])

  const breakRequesters = snapshot?.breakRequesters ?? []
  const breakCount = breakRequesters.length
  const hasActiveBreakRequest = playerId !== null && breakRequesters.includes(playerId)

  const postRef = useRef<(data: unknown) => void>(() => {})
  const postToMini = useBroadcastChannel('planning-poker-sync', useCallback((data: Record<string, unknown>) => {
    if (data.type === 'MINI_OPENED') {
      setMiniViewOpen(true)
    } else if (data.type === 'MINI_CLOSED') {
      setMiniViewOpen(false)
    } else if (data.type === 'VOTE' && roomId) {
      setVote(data.value as string)
      actions.submitVote(roomId, data.value as string).catch(() => {})
    } else if (data.type === 'REVEAL' && roomId) {
      actions.revealVotes(roomId).catch(() => {})
    } else if (data.type === 'RESET' && roomId) {
      actions.resetVotes(roomId).catch(() => {})
    } else if (data.type === 'REACTION' && roomId) {
      actions.sendReaction(roomId, data.value as string).catch(() => {})
    } else if (data.type === 'BREAK' && roomId) {
      actions.toggleBreakRequest(roomId).catch(() => {})
    } else if (data.type === 'REQUEST_SYNC' && snapshot && playerId) {
      postRef.current({ type: 'SYNC', snapshot, playerId, vote })
    }
  }, [roomId, snapshot, playerId, vote]))

  postRef.current = postToMini

  useEffect(() => {
    if (snapshot && playerId) {
      postToMini({ type: 'SYNC', snapshot, playerId, vote })
    }
  }, [snapshot, playerId, vote, postToMini])

  useEffect(() => {
    if (!selfPlayer?.hasVoted) setVote('')
  }, [selfPlayer?.hasVoted])

  const submitVote = async (value: string) => {
    if (!roomId) return
    setVote(value)
    try {
      await actions.submitVote(roomId, value)
    } catch {
      showToast(t('room.voteError'), 'error')
      setVote('')
    }
  }

  const revealVotes = async () => {
    setRevealLoading(true)
    try {
      await actions.revealVotes(roomId)
    } catch {
      showToast(t('room.revealError'), 'error')
    } finally {
      setRevealLoading(false)
    }
  }

  const resetVotes = async () => {
    setResetLoading(true)
    try {
      await actions.resetVotes(roomId)
    } catch {
      showToast(t('room.resetError'), 'error')
    } finally {
      setResetLoading(false)
    }
  }

  const requestLeave = () => {
    setModal({
      title: t('modal.leave.title'),
      message: t('modal.leave.message'),
      confirmText: t('modal.leave.confirm'),
      danger: true,
      onConfirm: async () => {
        setModal(null)
        setLeaveLoading(true)
        try {
          await actions.leaveRoom(roomId)
        } finally {
          clearRoom()
        }
      },
    })
  }

  const requestKick = (targetId: string) => {
    const target = players.find(u => u.id === targetId)
    setModal({
      title: t('modal.kick.title'),
      message: t('modal.kick.message', { name: target?.username ?? '' }),
      confirmText: t('modal.kick.confirm'),
      danger: true,
      onConfirm: async () => {
        setModal(null)
        try {
          await actions.kickPlayer(roomId, targetId)
        } catch {
          showToast(t('room.kickError'), 'error')
        }
      },
    })
  }

  const requestTransfer = (targetId: string) => {
    const targetName = players.find(u => u.id === targetId)?.username
      ?? snapshot?.watchers.find(w => w.id === targetId)?.name
      ?? ''
    setModal({
      title: t('modal.transfer.title'),
      message: t('modal.transfer.message', { name: targetName }),
      confirmText: t('modal.transfer.confirm'),
      onConfirm: async () => {
        setModal(null)
        try {
          await actions.transferOwnership(roomId, targetId)
        } catch {
          showToast(t('room.transferError'), 'error')
        }
      },
    })
  }

  const copyLink = () => {
    const url = `${window.location.origin}?roomId=${encodeURIComponent(roomId)}`
    navigator.clipboard.writeText(url)
    showToast(t('room.linkCopied'))
  }

  const toggleBreakRequest = useCallback(async () => {
    if (!roomId) return
    try { await actions.toggleBreakRequest(roomId) } catch { /* rate limited */ }
  }, [actions, roomId])

  const clearBreakRequests = useCallback(async () => {
    if (!roomId) return
    try { await actions.clearBreakRequests(roomId) } catch { /* rate limited */ }
  }, [actions, roomId])

  const sendReaction = useCallback(async (key: string) => {
    if (!roomId) return
    try { await actions.sendReaction(roomId, key) } catch { /* rate limited */ }
  }, [actions, roomId])

  const changeWatcherLook = useCallback(async (accent: string, character: number) => {
    if (!roomId) return
    try { await actions.updateWatcherAppearance(roomId, accent, character) } catch { /* rate limited */ }
  }, [actions, roomId])

  const throwItem = useCallback(async (targetId: string, itemKey: string) => {
    if (!roomId) return
    try { await actions.throwItem(roomId, targetId, itemKey) } catch { /* rate limited */ }
  }, [actions, roomId])

  const saveStyle = useCallback(async (style: string | null, pattern: string | null, patternColor: string | null) => {
    if (!roomId) return
    const persist = (key: string, value: string | null) => {
      if (value) localStorage.setItem(key, value)
      else localStorage.removeItem(key)
    }
    persist(PLAYER_STYLE_KEY, style)
    persist(PLAYER_PATTERN_KEY, pattern)
    persist(PLAYER_PATTERN_COLOR_KEY, patternColor)
    setStyleEditorOpen(false)
    try { await actions.updateStyle(roomId, style, pattern, patternColor) } catch { /* ignore */ }
  }, [actions, roomId])

  useEffect(() => {
    const sidebarVisible = !miniViewOpen
    document.body.classList.toggle('has-room-sidebar', sidebarVisible)
    return () => { document.body.classList.remove('has-room-sidebar') }
  }, [isWatching, miniViewOpen])

  useEffect(() => {
    if (!roomId || !playerId || !selfPlayer) return
    if (hydratedRoomRef.current === roomId) return
    hydratedRoomRef.current = roomId

    const savedStyle = localStorage.getItem(PLAYER_STYLE_KEY)
    const savedPattern = localStorage.getItem(PLAYER_PATTERN_KEY)
    const savedPatternColor = localStorage.getItem(PLAYER_PATTERN_COLOR_KEY)

    const needsSync =
      savedStyle !== selfPlayer.style ||
      savedPattern !== selfPlayer.pattern ||
      savedPatternColor !== selfPlayer.patternColor

    if (needsSync && (savedStyle || savedPattern || savedPatternColor)) {
      actions.updateStyle(roomId, savedStyle, savedPattern, savedPatternColor).catch(() => {})
    }
  }, [roomId, playerId, selfPlayer, actions])

  const toggleSeat = async () => {
    if (!roomId) return
    const taking = isWatching
    setSeatLoading(true)
    try {
      const result = taking ? await actions.takeSeat(roomId) : await actions.leaveSeat(roomId)
      if (result?.id) {
        if (taking) hydratedRoomRef.current = null
      } else {
        showToast(t(seatErrorKey(taking, result?.error)), 'error')
      }
    } catch {
      showToast(t('seat.failed'), 'error')
    } finally {
      setSeatLoading(false)
    }
  }

  const openMiniView = () => {
    window.open('/mini', 'planning-poker-mini', 'width=520,height=400,resizable=yes,scrollbars=no')
  }

  return (
    <div className="room">
      <div className="room-head">
        <RoomHeader
          roomName={snapshot?.roomName ?? ''}
          status={status}
          leaveLoading={leaveLoading}
          historyCount={history.length}
          watcherCount={snapshot?.watchers?.length ?? 0}
          onCopyLink={copyLink}
          onLeave={requestLeave}
          onOpenHistory={() => setHistoryOpen(true)}
          onOpenMiniView={openMiniView}
        />

        <div className="room-banners">
          <ConnectionBanner status={status} />
          <BreakRequestBanner
            count={breakCount}
            canClear={isLeader}
            onClear={clearBreakRequests}
          />
        </div>
      </div>

      {showFireworks && <Fireworks />}

      <div className="room-body">
        <div className="room-stage">
          <PlayerGrid
            players={players}
            ownerId={snapshot?.ownerId ?? ''}
            currentPlayerId={playerId}
            isLeader={isLeader}
            flipped={flipped}
            onKick={requestKick}
            onTransfer={requestTransfer}
            onEditStyle={() => setStyleEditorOpen(true)}
            onThrow={throwItem}
          />

          <WatcherList
            watchers={snapshot?.watchers ?? []}
            currentPlayerId={playerId}
            ownerId={snapshot?.ownerId ?? ''}
            isLeader={isLeader}
            onThrow={throwItem}
            onTransfer={requestTransfer}
            onEditSelf={() => setWatcherEditorOpen(true)}
          />

          <div className="room-stage-center">
            <VoteSummary
              flipped={flipped}
              votes={revealedVotes}
              votingDeck={votingDeck}
            />
          </div>
        </div>

        {!miniViewOpen && (
          <aside className={`room-sidebar ${isWatching ? 'watching' : ''}`}>
            {(!isWatching || isLeader) && <div className="sidebar-section sidebar-section-controls">
              <VotingControls
                isLeader={isLeader}
                flipped={flipped}
                allVoted={allVoted}
                someVoted={someVoted}
                revealLoading={revealLoading}
                resetLoading={resetLoading}
                onReveal={revealVotes}
                onReset={resetVotes}
              />
            </div>}
            {!isWatching && <div className="sidebar-section sidebar-section-deck">
              <VotingDeck
                cards={votingDeck}
                selectedVote={vote}
                onVote={submitVote}
                disabled={flipped}
              />
            </div>}
            <div className="sidebar-section sidebar-section-extras">
              <ReactionBar onSend={sendReaction} />
              {!isWatching && <BreakButton active={hasActiveBreakRequest} onClick={toggleBreakRequest} />}
              <button
                type="button"
                className="btn-seat"
                onClick={toggleSeat}
                disabled={seatLoading || flipped}
                title={flipped ? t('seat.revealed') : isWatching ? t('seat.take') : t('seat.leave')}
              >
                {seatLoading ? <LoadingIcon /> : isWatching ? <SeatIcon /> : <EyeIcon />}
                {isWatching ? t('seat.take') : t('seat.leave')}
              </button>
            </div>
          </aside>
        )}
      </div>

      <RoundHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
      />

      <ReactionOverlay />
      <ThrowOverlay />

      {watcherEditorOpen && selfWatcher && (
        <WatcherEditor
          initialAccent={selfWatcher.accent}
          initialCharacter={selfWatcher.character}
          isLeader={isLeader}
          onSave={(accent, character) => {
            setWatcherEditorOpen(false)
            if (accent !== selfWatcher.accent || character !== selfWatcher.character) {
              changeWatcherLook(accent, character)
            }
          }}
          onCancel={() => setWatcherEditorOpen(false)}
        />
      )}

      {styleEditorOpen && selfPlayer && (
        <StyleEditor
          initialStyle={selfPlayer.style}
          initialPattern={selfPlayer.pattern}
          initialPatternColor={selfPlayer.patternColor}
          onSave={saveStyle}
          onCancel={() => setStyleEditorOpen(false)}
        />
      )}

      {modal && (
        <ConfirmModal
          title={modal.title}
          message={modal.message}
          confirmText={modal.confirmText}
          danger={modal.danger}
          onConfirm={modal.onConfirm}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  )
}
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

const PLAYER_STYLE_KEY = 'playerStyle'
const PLAYER_PATTERN_KEY = 'playerPattern'
const PLAYER_PATTERN_COLOR_KEY = 'playerPatternColor'

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

  const allVoted = players.length > 0 && players.every(u => u.hasVoted)
  const someVoted = players.some(u => u.hasVoted)
  const votedPlayers = players.filter(u => u.vote)
  const showFireworks = flipped && allVoted && votedPlayers.length > 1 && votedPlayers.every(u => u.vote === votedPlayers[0].vote)

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
    if (!flipped) setVote('')
  }, [flipped])

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
    const target = players.find(u => u.id === targetId)
    setModal({
      title: t('modal.transfer.title'),
      message: t('modal.transfer.message', { name: target?.username ?? '' }),
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
    const sidebarVisible = !isWatching && !miniViewOpen
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
          historyCount={snapshot?.history?.length ?? 0}
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

          <div className="room-stage-center">
            <VoteSummary
              flipped={flipped}
              players={players}
              votingDeck={votingDeck}
            />
          </div>
        </div>

        {!isWatching && !miniViewOpen && (
          <aside className="room-sidebar">
            <div className="sidebar-section sidebar-section-controls">
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
            </div>
            <div className="sidebar-section sidebar-section-deck">
              <VotingDeck
                cards={votingDeck}
                selectedVote={vote}
                onVote={submitVote}
                disabled={flipped}
              />
            </div>
            <div className="sidebar-section sidebar-section-extras">
              <ReactionBar onSend={sendReaction} />
              <BreakButton active={hasActiveBreakRequest} onClick={toggleBreakRequest} />
            </div>
          </aside>
        )}
      </div>

      <RoundHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={snapshot?.history ?? []}
      />

      <ReactionOverlay />
      <ThrowOverlay />

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
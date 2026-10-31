import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RoomSnapshot } from '../types/room'
import { useBroadcastChannel } from '../hooks/useBroadcastChannel'
import { miniChannel } from '../hooks/miniChannel'
import { useI18n } from '../contexts/I18nContext'
import { getDeckByKey } from '../constants/estimationOptions'
import VoteSummary from '../components/VoteSummary'
import AutoRevealCountdown from '../components/AutoRevealCountdown'
import VotingControls from '../components/VotingControls'
import VotingDeck from '../components/VotingDeck'
import ReactionBar from '../components/ReactionBar'
import BreakButton from '../components/BreakButton'
import HoursInput from '../components/HoursInput'
import { DEFAULT_HOURS, estimatesHours } from '../utils/hours'
import { EyeIcon, SeatIcon } from '../components/Icons'
import type { PlayerView } from '../components/PlayerGrid'

export default function MiniView() {
  const { t } = useI18n()
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [vote, setVote] = useState('')
  const [hours, setHours] = useState(DEFAULT_HOURS)
  const [hoursConfirmed, setHoursConfirmed] = useState(false)
  const editingHoursRef = useRef(false)

  const [owner] = useState(() => new URLSearchParams(window.location.search).get('owner'))

  const postMessage = useBroadcastChannel(miniChannel(owner), useCallback((data: Record<string, unknown>) => {
    if (data.type === 'SYNC') {
      setSnapshot(data.snapshot as RoomSnapshot)
      setPlayerId(data.playerId as string)
      if (typeof data.vote === 'string') setVote(data.vote)
      if (typeof data.hours === 'string' && !editingHoursRef.current) setHours(data.hours)
      setHoursConfirmed(data.hoursConfirmed === true)
    }
  }, []))

  useEffect(() => {
    postMessage({ type: 'REQUEST_SYNC' })
    postMessage({ type: 'MINI_OPENED' })

    const handleBeforeUnload = () => postMessage({ type: 'MINI_CLOSED' })
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      postMessage({ type: 'MINI_CLOSED' })
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [postMessage])

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
      role: p.role,
      hasPoints: p.hasPoints,
      hasHours: p.hasHours,
      hours: null,
    }))
  }, [snapshot])

  const history = snapshot?.history ?? []
  const revealedRoundVotes = flipped ? (history[history.length - 1]?.votes ?? []) : []
  const revealedVotes = revealedRoundVotes.map(v => v.vote)
  const isWatching = playerId !== null && (snapshot?.watchers.some(w => w.id === playerId) ?? false)
  const allVoted = players.length > 0 && players.every(u => u.hasVoted)
  const someVoted = players.some(u => u.hasVoted)
  const votedCount = players.filter(u => u.hasVoted).length

  const selfRole = snapshot?.players.find(p => p.id === playerId)?.role
  const needsHours = !isWatching && estimatesHours(snapshot?.hoursEnabled ?? false, selfRole)

  useEffect(() => {
    if (flipped) return
    setVote('')
    setHours(DEFAULT_HOURS)
  }, [flipped])

  const changeHours = (value: string) => {
    setHours(value)
    postMessage({ type: 'HOURS', value })
  }

  const submitVote = (value: string) => {
    setVote(value === vote ? '' : value)
    postMessage({ type: 'VOTE', value })
  }

  const revealVotes = () => postMessage({ type: 'REVEAL' })
  const resetVotes = () => postMessage({ type: 'RESET' })
  const sendReaction = (key: string) => postMessage({ type: 'REACTION', value: key })
  const toggleBreakRequest = () => postMessage({ type: 'BREAK' })
  const toggleSeat = () => postMessage({ type: 'SEAT' })

  const breakRequesters = snapshot?.breakRequesters ?? []
  const hasActiveBreakRequest = playerId !== null && breakRequesters.includes(playerId)

  if (!snapshot) {
    return (
      <div className="mini-view-loading">
        {t('mini.waiting')}
        <br />
        {t('mini.keepOpen')}
      </div>
    )
  }

  const seatLabel = isWatching ? t('seat.take') : t('seat.leave')

  return (
    <div className="mini-view">
      <div className="mini-view-header">
        <div className="mini-view-title">
          <span className="mini-view-room" title={snapshot.roomName}>{snapshot.roomName}</span>
          <span className={`status-tag ${flipped ? 'tag-accent' : 'tag-info'}`}>
            {flipped ? t('mini.revealed') : t('mini.voting')}
          </span>
          <span className="status-tag tag-default">{votedCount}/{players.length} {t('mini.voted')}</span>
        </div>
        <VotingControls
          isLeader={isLeader}
          flipped={flipped}
          allVoted={allVoted}
          someVoted={someVoted}
          revealLoading={false}
          resetLoading={false}
          onReveal={revealVotes}
          onReset={resetVotes}
        />
      </div>

      <div className="mini-view-toolbar">
        <ReactionBar onSend={sendReaction} />
        <BreakButton active={hasActiveBreakRequest} onClick={toggleBreakRequest} compact />
        <button
          type="button"
          className="btn-seat compact"
          onClick={toggleSeat}
          disabled={flipped}
          title={flipped ? t('seat.revealed') : seatLabel}
          aria-label={seatLabel}
        >
          {isWatching ? <SeatIcon /> : <EyeIcon />}
        </button>
      </div>

      <div className="mini-view-body">
        <div className="mini-view-stage">
          <VoteSummary
            flipped={flipped}
            votes={revealedVotes}
            votingDeck={votingDeck}
            hoursEnabled={snapshot.hoursEnabled}
            roundVotes={revealedRoundVotes}
          />
          <AutoRevealCountdown
            active={!flipped && snapshot.everyoneVoted && snapshot.autoRevealEnabled}
            seconds={snapshot.autoRevealSeconds}
          />
        </div>

        {!isWatching && (
          <div className="room-dock mini-view-dock">
            {needsHours && selfRole && (
              <div
                className="mini-view-hours"
                onFocus={() => { editingHoursRef.current = true }}
                onBlur={() => { editingHoursRef.current = false }}
              >
                <HoursInput
                  role={selfRole}
                  value={hours}
                  onChange={changeHours}
                  confirmed={hoursConfirmed}
                  onConfirm={() => postMessage({ type: 'HOURS_CONFIRM' })}
                  onEdit={() => postMessage({ type: 'HOURS_EDIT' })}
                  pending={vote !== '' && !hoursConfirmed}
                  disabled={flipped}
                />
              </div>
            )}
            <VotingDeck
              cards={votingDeck}
              selectedVote={vote}
              onVote={submitVote}
              disabled={flipped}
            />
          </div>
        )}
      </div>
    </div>
  )
}
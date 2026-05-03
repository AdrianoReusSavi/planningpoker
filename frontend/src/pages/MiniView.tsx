import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RoomSnapshot } from '../types/room'
import { useBroadcastChannel } from '../hooks/useBroadcastChannel'
import { useI18n } from '../contexts/I18nContext'
import { getDeckByKey } from '../constants/estimationOptions'
import VoteSummary from '../components/VoteSummary'
import VotingControls from '../components/VotingControls'
import VotingDeck from '../components/VotingDeck'
import ReactionBar from '../components/ReactionBar'
import BreakButton from '../components/BreakButton'
import type { PlayerView } from '../components/PlayerGrid'

export default function MiniView() {
  const { t } = useI18n()
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [vote, setVote] = useState('')

  const postMessage = useBroadcastChannel('planning-poker-sync', useCallback((data: Record<string, unknown>) => {
    if (data.type === 'SYNC') {
      setSnapshot(data.snapshot as RoomSnapshot)
      setPlayerId(data.playerId as string)
      if (typeof data.vote === 'string') setVote(data.vote)
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
    }))
  }, [snapshot])

  const allVoted = players.length > 0 && players.every(u => u.hasVoted)
  const someVoted = players.some(u => u.hasVoted)
  const votedCount = players.filter(u => u.hasVoted).length

  useEffect(() => {
    if (!flipped) setVote('')
  }, [flipped])

  const submitVote = (value: string) => {
    setVote(value)
    postMessage({ type: 'VOTE', value })
  }

  const revealVotes = () => postMessage({ type: 'REVEAL' })
  const resetVotes = () => postMessage({ type: 'RESET' })
  const sendReaction = (key: string) => postMessage({ type: 'REACTION', value: key })
  const toggleBreakRequest = () => postMessage({ type: 'BREAK' })

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

  return (
    <div className="mini-view">
      <div className="mini-view-header">
        <span className="mini-view-room">{snapshot.roomName}</span>
        <span className={`status-tag ${flipped ? 'tag-accent' : 'tag-info'}`}>
          {flipped ? t('mini.revealed') : t('mini.voting')}
        </span>
        <span className="status-tag tag-default">{votedCount}/{players.length} {t('mini.voted')}</span>
      </div>

      <VoteSummary
        flipped={flipped}
        players={players}
        votingDeck={votingDeck}
      />

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

      <VotingDeck
        cards={votingDeck}
        selectedVote={vote}
        onVote={submitVote}
        disabled={flipped}
      />

      <div className="mini-view-reactions">
        <ReactionBar onSend={sendReaction} />
        <BreakButton active={hasActiveBreakRequest} onClick={toggleBreakRequest} />
      </div>
    </div>
  )
}
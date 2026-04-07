import { useEffect, useMemo, useState } from 'react'
import { useConnection } from '../contexts/ConnectionContext'
import { useRoom } from '../contexts/RoomContext'
import { useRoomActions } from '../hooks/useRoomActions'
import { useToast } from '../contexts/ToastContext'
import { getDeckByKey } from '../constants/estimationOptions'
import RoomHeader from './RoomHeader'
import PlayerGrid, { type PlayerView } from './PlayerGrid'
import VotingControls from './VotingControls'
import VotingDeck from './VotingDeck'
import ConfirmModal from './ConfirmModal'

export default function Room() {
  const { connection, connected, status } = useConnection()
  const { snapshot, playerId, isWatching, clearRoom } = useRoom()
  const actions = useRoomActions(connection, connected)
  const { showToast } = useToast()
  const [vote, setVote] = useState('')
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [revealLoading, setRevealLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [leaveLoading, setLeaveLoading] = useState(false)

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
    }))
  }, [snapshot])

  const allVoted = players.length > 0 && players.every(u => u.hasVoted)
  const someVoted = players.some(u => u.hasVoted)

  useEffect(() => {
    if (!flipped) setVote('')
  }, [flipped])

  const submitVote = async (value: string) => {
    if (!roomId) return
    setVote(value)
    try {
      await actions.submitVote(roomId, value)
    } catch {
      showToast('Falha ao enviar voto.', 'error')
      setVote('')
    }
  }

  const revealVotes = async () => {
    setRevealLoading(true)
    try {
      await actions.revealVotes(roomId)
    } catch {
      showToast('Falha ao revelar votos.', 'error')
    } finally {
      setRevealLoading(false)
    }
  }

  const resetVotes = async () => {
    setResetLoading(true)
    try {
      await actions.resetVotes(roomId)
    } catch {
      showToast('Falha ao resetar votos.', 'error')
    } finally {
      setResetLoading(false)
    }
  }

  const confirmLeave = async () => {
    setShowLeaveModal(false)
    setLeaveLoading(true)
    try {
      await actions.leaveRoom(roomId)
    } finally {
      clearRoom()
    }
  }

  const copyLink = () => {
    const url = `${window.location.origin}?roomId=${encodeURIComponent(roomId)}`
    navigator.clipboard.writeText(url)
    showToast('Link copiado com sucesso!')
  }

  return (
    <div className="room">
      <RoomHeader
        roomName={snapshot?.roomName ?? ''}
        status={status}
        leaveLoading={leaveLoading}
        onCopyLink={copyLink}
        onLeave={() => setShowLeaveModal(true)}
      />

      <PlayerGrid
        players={players}
        ownerId={snapshot?.ownerId ?? ''}
        flipped={flipped}
      />

      {!isWatching && (
        <>
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
          <VotingDeck
            cards={votingDeck}
            selectedVote={vote}
            onVote={submitVote}
            disabled={flipped}
          />
        </>
      )}

      {showLeaveModal && (
        <ConfirmModal
          title="Sair da sala"
          message="Tem certeza que deseja sair? Você será removido da votação."
          confirmText="Sair"
          danger
          onConfirm={confirmLeave}
          onCancel={() => setShowLeaveModal(false)}
        />
      )}
    </div>
  )
}
import { useState } from 'react'
import { useConnection } from '../contexts/ConnectionContext'
import { useRoom } from '../contexts/RoomContext'
import { useRoomActions } from '../hooks/useRoomActions'
import { useUsername } from '../hooks/useUsername'
import { useToast } from '../contexts/ToastContext'
import { useI18n } from '../contexts/I18nContext'
import { LoadingIcon } from './Icons'
import DeckSelect from './DeckSelect'

export default function CreateRoom() {
  const { connection, connected } = useConnection()
  const { setPlayerId } = useRoom()
  const { createRoom } = useRoomActions(connection, connected)
  const { showToast } = useToast()
  const { t } = useI18n()
  const [username, setUsername] = useUsername()
  const [roomName, setRoomName] = useState('')
  const [votingDeck, setVotingDeck] = useState(0)
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!username.trim() || !roomName.trim()) return
    setLoading(true)
    try {
      const playerId = await createRoom(username.trim(), roomName.trim(), votingDeck)
      if (playerId) {
        setPlayerId(playerId)
      } else {
        showToast(t('create.error'), 'error')
      }
    } catch {
      showToast(t('create.connectionError'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate()
  }

  return (
    <div className="form-panel">
      <input
        type="text"
        placeholder={t('create.name')}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={50}
      />
      <input
        type="text"
        placeholder={t('create.roomName')}
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={30}
      />
      <DeckSelect value={votingDeck} onChange={setVotingDeck} />
      <button
        onClick={handleCreate}
        disabled={!username.trim() || !roomName.trim() || !connected || loading}
      >
        {loading && <LoadingIcon />} {loading ? t('create.loading') : t('create.submit')}
      </button>
    </div>
  )
}
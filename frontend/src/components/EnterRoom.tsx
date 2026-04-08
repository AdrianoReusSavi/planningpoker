import { useState } from 'react'
import { useConnection } from '../contexts/ConnectionContext'
import { useRoom } from '../contexts/RoomContext'
import { useRoomActions } from '../hooks/useRoomActions'
import { useUsername } from '../hooks/useUsername'
import { useToast } from '../contexts/ToastContext'
import { useI18n } from '../contexts/I18nContext'
import { LoadingIcon } from './Icons'

interface EnterRoomProps {
  roomId: string
  onGoToCreate: () => void
}

export default function EnterRoom({ roomId, onGoToCreate }: EnterRoomProps) {
  const { connection, connected } = useConnection()
  const { setPlayerId } = useRoom()
  const { enterRoom } = useRoomActions(connection, connected)
  const { showToast } = useToast()
  const { t } = useI18n()
  const [username, setUsername] = useUsername()
  const [loading, setLoading] = useState(false)

  const handleEnter = async () => {
    if (!username.trim() || !roomId) return
    setLoading(true)
    try {
      const playerId = await enterRoom(roomId, username.trim())
      if (playerId) {
        setPlayerId(playerId)
      } else {
        showToast(t('enter.notFound'), 'error')
      }
    } catch {
      showToast(t('enter.connectionError'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-panel">
      <input
        type="text"
        placeholder={t('enter.name')}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleEnter()}
        maxLength={50}
      />
      <input type="password" value={roomId} disabled />
      <div className="button-row">
        <button
          onClick={handleEnter}
          disabled={!username.trim() || !roomId || !connected || loading}
        >
          {loading && <LoadingIcon />} {loading ? t('enter.loading') : t('enter.submit')}
        </button>
        <button className="secondary" onClick={onGoToCreate}>
          {t('enter.create')}
        </button>
      </div>
    </div>
  )
}
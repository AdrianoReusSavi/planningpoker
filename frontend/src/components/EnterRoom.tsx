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
  const { enterRoom, watchRoom } = useRoomActions(connection, connected)
  const { showToast } = useToast()
  const { t } = useI18n()
  const [username, setUsername] = useUsername()
  const [loading, setLoading] = useState<'play' | 'watch' | null>(null)

  const join = async (mode: 'play' | 'watch') => {
    if (!username.trim() || !roomId) return
    setLoading(mode)
    try {
      const id = mode === 'play'
        ? await enterRoom(roomId, username.trim())
        : await watchRoom(roomId, username.trim())
      if (id) {
        setPlayerId(id)
      } else {
        showToast(mode === 'play' ? t('enter.notFound') : t('enter.watchFailed'), 'error')
      }
    } catch {
      showToast(t('enter.connectionError'), 'error')
    } finally {
      setLoading(null)
    }
  }

  const handleEnter = () => join('play')

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
          disabled={!username.trim() || !roomId || !connected || loading !== null}
        >
          {loading === 'play' && <LoadingIcon />} {loading === 'play' ? t('enter.loading') : t('enter.submit')}
        </button>
        <button
          className="watch"
          onClick={() => join('watch')}
          disabled={!username.trim() || !roomId || !connected || loading !== null}
          title={t('enter.watchHint')}
        >
          {loading === 'watch' && <LoadingIcon />} {loading === 'watch' ? t('enter.loading') : t('enter.watch')}
        </button>
        <button className="secondary" onClick={onGoToCreate}>
          {t('enter.create')}
        </button>
      </div>
    </div>
  )
}
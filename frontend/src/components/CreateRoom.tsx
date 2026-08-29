import { useState } from 'react'
import { useConnection } from '../contexts/ConnectionContext'
import { useRoom } from '../contexts/RoomContext'
import { useRoomActions } from '../hooks/useRoomActions'
import { useUsername } from '../hooks/useUsername'
import { useToast } from '../contexts/ToastContext'
import { useI18n } from '../contexts/I18nContext'
import { LoadingIcon } from './Icons'
import DeckSelect from './DeckSelect'
import type { RoomJoinError } from '../types/room'
import type { TranslationKey } from '../i18n/locales'

const errorKey = (error: RoomJoinError | null | undefined): TranslationKey =>
  error === 'ALREADY_IN_ROOM' ? 'create.alreadyInRoom' : 'create.error'

export default function CreateRoom() {
  const { connection, connected } = useConnection()
  const { setPlayerId } = useRoom()
  const { createRoom } = useRoomActions(connection, connected)
  const { showToast } = useToast()
  const { t } = useI18n()
  const [username, setUsername] = useUsername()
  const [roomName, setRoomName] = useState('')
  const [votingDeck, setVotingDeck] = useState(0)
  const [loading, setLoading] = useState<'play' | 'watch' | null>(null)

  const create = async (mode: 'play' | 'watch') => {
    if (!username.trim() || !roomName.trim()) return
    setLoading(mode)
    try {
      const result = await createRoom(username.trim(), roomName.trim(), votingDeck, mode === 'watch')
      if (result?.id) setPlayerId(result.id)
      else showToast(t(errorKey(result?.error)), 'error')
    } catch {
      showToast(t('create.connectionError'), 'error')
    } finally {
      setLoading(null)
    }
  }

  const handleCreate = () => create('play')

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
      <div className="button-row">
        <button
          onClick={handleCreate}
          disabled={!username.trim() || !roomName.trim() || !connected || loading !== null}
        >
          {loading === 'play' && <LoadingIcon />} {loading === 'play' ? t('create.loading') : t('create.submit')}
        </button>
        <button
          className="watch"
          onClick={() => create('watch')}
          disabled={!username.trim() || !roomName.trim() || !connected || loading !== null}
          title={t('create.watchHint')}
        >
          {loading === 'watch' && <LoadingIcon />} {loading === 'watch' ? t('create.loading') : t('create.watch')}
        </button>
      </div>
    </div>
  )
}
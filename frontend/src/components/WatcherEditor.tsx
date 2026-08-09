import { useState } from 'react'
import { HexColorPicker, HexColorInput } from 'react-colorful'
import { useI18n } from '../contexts/I18nContext'
import WatcherCharacter, { CHARACTER_COUNT } from './WatcherCharacter'

interface WatcherEditorProps {
  initialAccent: string
  initialCharacter: number
  onSave: (accent: string, character: number) => void
  onCancel: () => void
}

export default function WatcherEditor({ initialAccent, initialCharacter, onSave, onCancel }: WatcherEditorProps) {
  const { t } = useI18n()
  const [accent, setAccent] = useState(initialAccent)
  const [character, setCharacter] = useState(initialCharacter)

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal watcher-editor" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{t('watch.editorTitle')}</h3>

        <div className="watcher-editor-preview">
          <span className="watcher-chip self" style={{ ['--watcher-accent' as string]: accent }}>
            <span className="watcher-peek" aria-hidden="true">
              <WatcherCharacter character={character} />
            </span>
            <span className="watcher-name">{t('watch.previewName')}</span>
          </span>
        </div>

        <div className="style-row">
          <span className="style-row-label">{t('watch.character')}</span>
        </div>
        <div className="watcher-editor-faces">
          {Array.from({ length: CHARACTER_COUNT }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`watcher-face ${character === i ? 'active' : ''}`}
              onClick={() => setCharacter(i)}
              aria-pressed={character === i}
              title={t('watch.pickCharacter')}
            >
              <WatcherCharacter character={i} size={40} />
            </button>
          ))}
        </div>

        <div className="style-row watcher-editor-label">
          <span className="style-row-label">{t('watch.colour')}</span>
          <span className="watcher-editor-hint">{t('watch.colourHint')}</span>
        </div>
        <div className="watcher-editor-colour">
          <HexColorPicker color={accent} onChange={setAccent} />
          <HexColorInput className="watcher-editor-hex" color={accent} onChange={setAccent} prefixed />
        </div>

        <div className="modal-actions">
          <button className="modal-btn cancel" onClick={onCancel}>{t('modal.cancel')}</button>
          <button className="modal-btn confirm" onClick={() => onSave(accent, character)}>
            {t('style.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
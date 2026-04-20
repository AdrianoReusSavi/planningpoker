import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { HexColorPicker, HexColorInput } from 'react-colorful'
import { useI18n } from '../contexts/I18nContext'
import type { TranslationKey } from '../i18n/locales'
import ConfirmModal from './ConfirmModal'

interface StyleEditorProps {
  initialStyle: string | null
  initialPattern: string | null
  initialPatternColor: string | null
  onSave: (style: string | null, pattern: string | null, patternColor: string | null) => void
  onCancel: () => void
}

const DEFAULT_COLOR = '#818cf8'
const DEFAULT_SECOND_COLOR = '#f472b6'
const DEFAULT_ANGLE = 135
const DEFAULT_PATTERN_COLOR = '#ffffff'

type PatternKey = 'stripes' | 'dots' | 'grid' | 'waves' | 'zigzag' | 'none'
type ColorFieldKey = 'primary' | 'secondary' | 'pattern'

const PATTERNS: { key: PatternKey; labelKey: TranslationKey }[] = [
  { key: 'stripes', labelKey: 'pattern.stripes' },
  { key: 'dots', labelKey: 'pattern.dots' },
  { key: 'grid', labelKey: 'pattern.grid' },
  { key: 'waves', labelKey: 'pattern.waves' },
  { key: 'zigzag', labelKey: 'pattern.zigzag' },
  { key: 'none', labelKey: 'pattern.none' },
]

interface ParsedStyle {
  primary: string
  gradient: boolean
  secondary: string
  angle: number
}

function parseStyle(style: string | null): ParsedStyle {
  if (!style) {
    return { primary: DEFAULT_COLOR, gradient: false, secondary: DEFAULT_SECOND_COLOR, angle: DEFAULT_ANGLE }
  }

  const gradientMatch = style.match(/^linear-gradient\((\d{1,3})deg, (#[0-9a-fA-F]{6}), (#[0-9a-fA-F]{6})\)$/)
  if (gradientMatch) {
    return {
      primary: gradientMatch[2],
      gradient: true,
      secondary: gradientMatch[3],
      angle: parseInt(gradientMatch[1], 10),
    }
  }

  if (/^#[0-9a-fA-F]{6}$/.test(style)) {
    return { primary: style, gradient: false, secondary: DEFAULT_SECOND_COLOR, angle: DEFAULT_ANGLE }
  }

  return { primary: DEFAULT_COLOR, gradient: false, secondary: DEFAULT_SECOND_COLOR, angle: DEFAULT_ANGLE }
}

function buildStyle(s: ParsedStyle): string {
  return s.gradient
    ? `linear-gradient(${s.angle}deg, ${s.primary}, ${s.secondary})`
    : s.primary
}

function normalizeHex(value: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : DEFAULT_COLOR
}

function normalizePattern(value: string | null): PatternKey {
  if (value && PATTERNS.some(p => p.key === value)) return value as PatternKey
  return 'stripes'
}

interface ColorFieldProps {
  id: string
  label: string
  value: string
  open: boolean
  onToggle: () => void
  onClose: () => void
  onChange: (value: string) => void
}

function ColorField({ id, label, value, open, onToggle, onClose, onChange }: ColorFieldProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const hex = normalizeHex(value).toUpperCase()

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  return (
    <div className="style-row">
      <label className="style-row-label" htmlFor={id}>{label}</label>
      <div className="color-field" ref={wrapperRef}>
        <button
          id={id}
          type="button"
          className={`color-swatch ${open ? 'open' : ''}`}
          onClick={onToggle}
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <span className="color-swatch-chip" style={{ background: hex }} />
          <span className="color-swatch-hex">{hex}</span>
        </button>
        {open && (
          <div className="color-popover" role="dialog">
            <HexColorPicker color={hex} onChange={onChange} />
            <div className="color-popover-input">
              <span>#</span>
              <HexColorInput color={hex} onChange={onChange} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function StyleEditor({ initialStyle, initialPattern, initialPatternColor, onSave, onCancel }: StyleEditorProps) {
  const { t } = useI18n()
  const [state, setState] = useState<ParsedStyle>(() => parseStyle(initialStyle))
  const [pattern, setPattern] = useState<PatternKey>(() => normalizePattern(initialPattern))
  const [patternColor, setPatternColor] = useState<string>(() => initialPatternColor ?? DEFAULT_PATTERN_COLOR)
  const [patternColorCustom, setPatternColorCustom] = useState<boolean>(() => initialPatternColor !== null)
  const [openField, setOpenField] = useState<ColorFieldKey | null>(null)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)

  const background = buildStyle(state)

  const previewStyle: CSSProperties = { background }
  if (patternColorCustom && pattern !== 'none') {
    const extra = previewStyle as Record<string, string>
    extra['--pattern-color'] = patternColor
    extra['--pattern-alpha'] = '25%'
  }

  const toggle = (field: ColorFieldKey) => setOpenField(curr => curr === field ? null : field)
  const close = () => setOpenField(null)

  const save = () => {
    onSave(
      background,
      pattern,
      patternColorCustom && pattern !== 'none' ? patternColor : null,
    )
  }

  return (
    <>
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal style-editor" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{t('style.title')}</h3>

        <div className={`style-preview card-front pattern-${pattern}`} style={previewStyle} />

        <div className="style-section">
          <ColorField
            id="style-primary"
            label={t('style.primary')}
            value={state.primary}
            open={openField === 'primary'}
            onToggle={() => toggle('primary')}
            onClose={close}
            onChange={(v) => setState(s => ({ ...s, primary: v }))}
          />

          <div className="style-row">
            <input
              id="style-gradient"
              type="checkbox"
              checked={state.gradient}
              onChange={(e) => setState(s => ({ ...s, gradient: e.target.checked }))}
            />
            <label className="style-row-label" htmlFor="style-gradient">{t('style.gradient')}</label>
          </div>

          {state.gradient && (
            <>
              <div className="style-row-indent-group">
                <ColorField
                  id="style-secondary"
                  label={t('style.secondary')}
                  value={state.secondary}
                  open={openField === 'secondary'}
                  onToggle={() => toggle('secondary')}
                  onClose={close}
                  onChange={(v) => setState(s => ({ ...s, secondary: v }))}
                />
              </div>

              <div className="style-row style-row-indent">
                <label className="style-row-label" htmlFor="style-angle">{t('style.angle')}</label>
                <div className="style-row-inline">
                  <input
                    id="style-angle"
                    type="range"
                    min={0}
                    max={360}
                    value={state.angle}
                    onChange={(e) => setState(s => ({ ...s, angle: parseInt(e.target.value, 10) }))}
                  />
                  <input
                    type="number"
                    className="style-row-number"
                    min={0}
                    max={360}
                    value={state.angle}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10)
                      if (!isNaN(v)) setState(s => ({ ...s, angle: Math.min(360, Math.max(0, v)) }))
                    }}
                    aria-label={t('style.angle')}
                  />
                  <span className="style-row-suffix">°</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="style-section">
          <span className="style-section-title">{t('style.pattern')}</span>
          <div className="style-pattern-options">
            {PATTERNS.map(p => (
              <button
                key={p.key}
                type="button"
                className={`style-pattern-btn ${pattern === p.key ? 'active' : ''}`}
                onClick={() => setPattern(p.key)}
                aria-pressed={pattern === p.key}
              >
                <span className={`style-pattern-swatch pattern-${p.key}`} />
                <span className="style-pattern-text">{t(p.labelKey)}</span>
              </button>
            ))}
          </div>

          {pattern !== 'none' && (
            <>
              <div className="style-row">
                <input
                  id="style-pattern-custom"
                  type="checkbox"
                  checked={patternColorCustom}
                  onChange={(e) => setPatternColorCustom(e.target.checked)}
                />
                <label className="style-row-label" htmlFor="style-pattern-custom">{t('style.patternColor')}</label>
              </div>

              {patternColorCustom && (
                <div className="style-row-indent-group">
                  <ColorField
                    id="style-pattern-color"
                    label={t('style.primary')}
                    value={patternColor}
                    open={openField === 'pattern'}
                    onToggle={() => toggle('pattern')}
                    onClose={close}
                    onChange={setPatternColor}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-actions style-editor-actions">
          <button className="modal-btn reset" onClick={() => setResetConfirmOpen(true)}>{t('style.reset')}</button>
          <div className="style-editor-actions-right">
            <button className="modal-btn cancel" onClick={onCancel}>{t('modal.cancel')}</button>
            <button className="modal-btn confirm" onClick={save}>{t('style.save')}</button>
          </div>
        </div>
      </div>
    </div>

    {resetConfirmOpen && (
      <ConfirmModal
        title={t('style.resetConfirmTitle')}
        message={t('style.resetConfirmMessage')}
        confirmText={t('style.reset')}
        danger
        onConfirm={() => { setResetConfirmOpen(false); onSave(null, null, null) }}
        onCancel={() => setResetConfirmOpen(false)}
      />
    )}
    </>
  )
}
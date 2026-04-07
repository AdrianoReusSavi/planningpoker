import { useEffect, useRef, useState } from 'react'
import estimationOptions from '../constants/estimationOptions'

interface DeckSelectProps {
  value: number
  onChange: (value: number) => void
}

export default function DeckSelect({ value, onChange }: DeckSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = estimationOptions.find(o => o.value === value)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="deck-select" ref={ref}>
      <button
        type="button"
        className="deck-select-trigger"
        onClick={() => setOpen(!open)}
      >
        <span>{selected?.label}</span>
        <span className="deck-select-arrow">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <ul className="deck-select-dropdown">
          {estimationOptions.map((opt) => (
            <li
              key={opt.value}
              className={`deck-select-option ${opt.value === value ? 'active' : ''}`}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
            >
              <span className="deck-option-label">{opt.label}</span>
              <span className="deck-option-desc">{opt.desc}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
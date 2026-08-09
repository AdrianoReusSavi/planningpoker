const EYES = (
  <>
    <ellipse cx="30" cy="22" rx="4.6" ry="5.2" fill="#fff" />
    <ellipse cx="39.5" cy="22" rx="4.6" ry="5.2" fill="#fff" />
    <circle className="watcher-pupil" cx="30.8" cy="22.6" r="2.2" fill="#1e293b" />
    <circle className="watcher-pupil" cx="40.3" cy="22.6" r="2.2" fill="#1e293b" />
  </>
)

const OUTLINE = 'rgba(0, 0, 0, 0.25)'

const CHARACTERS = [
  {
    key: 'fox',
    body: (
      <>
        <path d="M14 16 L20 4 L27 14 Z" fill="#c2410c" stroke={OUTLINE} strokeWidth="1" strokeLinejoin="round" />
        <path d="M34 14 L40 5 L44 17 Z" fill="#c2410c" stroke={OUTLINE} strokeWidth="1" strokeLinejoin="round" />
        <path d="M8 26 Q8 12 26 12 Q44 12 44 26 Q44 40 26 40 Q8 40 8 26 Z" fill="#f97316" stroke={OUTLINE} strokeWidth="1" />
        <path d="M30 30 Q35 26 42 29 Q40 37 34 37 Q30 35 30 30 Z" fill="#fed7aa" />
        <circle cx="41" cy="31" r="2" fill="#1e293b" />
        {EYES}
      </>
    ),
  },
  {
    key: 'cat',
    body: (
      <>
        <path d="M13 18 L15 6 L25 13 Z" fill="#7c3aed" stroke={OUTLINE} strokeWidth="1" strokeLinejoin="round" />
        <path d="M36 13 L44 6 L45 18 Z" fill="#7c3aed" stroke={OUTLINE} strokeWidth="1" strokeLinejoin="round" />
        <ellipse cx="26" cy="26" rx="18" ry="15" fill="#8b5cf6" stroke={OUTLINE} strokeWidth="1" />
        {EYES}
        <path d="M35 31 L37 33 L39 31" stroke="#312e81" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M43 28 L47 27 M43 31 L47 32" stroke="#ddd6fe" strokeWidth="1.2" strokeLinecap="round" />
      </>
    ),
  },
  {
    key: 'bird',
    body: (
      <>
        <path d="M24 11 Q26 3 31 6" stroke="#ca8a04" strokeWidth="2" fill="none" strokeLinecap="round" />
        <ellipse cx="26" cy="26" rx="18" ry="16" fill="#facc15" stroke={OUTLINE} strokeWidth="1" />
        {EYES}
        <path d="M42 27 L47.5 30 L42 33 Z" fill="#f97316" stroke={OUTLINE} strokeWidth="0.8" strokeLinejoin="round" />
      </>
    ),
  },
  {
    key: 'ghost',
    body: (
      <>
        <path
          d="M8 28 Q8 10 26 10 Q44 10 44 28 L44 42 L39 37 L34 42 L29 37 L24 42 L19 37 L14 42 L8 37 Z"
          fill="#a5b4fc"
          stroke={OUTLINE}
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {EYES}
        <ellipse cx="35" cy="31" rx="3" ry="2.2" fill="#4c1d95" opacity="0.55" />
      </>
    ),
  },
  {
    key: 'robot',
    body: (
      <>
        <path d="M33 9 L33 3" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" />
        <circle cx="33" cy="2.5" r="2.5" fill="#f43f5e" />
        <rect x="9" y="9" width="35" height="32" rx="8" fill="#14b8a6" stroke={OUTLINE} strokeWidth="1" />
        <ellipse cx="30" cy="22" rx="4.6" ry="5.2" fill="#fff" />
        <ellipse cx="39.5" cy="22" rx="4.6" ry="5.2" fill="#fff" />
        <rect className="watcher-pupil" x="28.6" y="19" width="2.8" height="6" rx="1.2" fill="#1e293b" />
        <rect className="watcher-pupil" x="38.1" y="19" width="2.8" height="6" rx="1.2" fill="#1e293b" />
        <rect x="31" y="31" width="10" height="3" rx="1.5" fill="#0f766e" />
        <rect x="44" y="19" width="3" height="9" rx="1.5" fill="#0f766e" />
      </>
    ),
  },
  {
    key: 'cyclops',
    body: (
      <>
        <path d="M36 10 L39 2 L42 11" stroke="#065f46" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 27 Q8 11 26 11 Q44 11 44 27 Q44 41 26 41 Q8 41 8 27 Z" fill="#34d399" stroke={OUTLINE} strokeWidth="1" />
        <ellipse cx="35" cy="23" rx="8" ry="8.5" fill="#fff" />
        <circle className="watcher-pupil" cx="37" cy="24" r="3.6" fill="#1e293b" />
        <path d="M29 34 Q35 38 41 34" stroke="#065f46" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </>
    ),
  },
] as const

export const CHARACTER_COUNT = CHARACTERS.length

export const EYE_CENTER = { x: 35, y: 22 }
export const PUPIL_RANGE = 1.6

interface WatcherCharacterProps {
  character: number
  size?: number
}

export default function WatcherCharacter({ character, size = 40 }: WatcherCharacterProps) {
  const chosen = CHARACTERS[((character % CHARACTERS.length) + CHARACTERS.length) % CHARACTERS.length]
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" focusable="false">
      {chosen.body}
    </svg>
  )
}
import type { ReactNode } from 'react'
import type { TranslationKey } from '../i18n/locales'

export type ImpactArrangement = 'radial' | 'heart'

export interface Throwable {
  key: string
  display: ReactNode
  titleKey: TranslationKey
  impactColor: string
  particles: readonly ReactNode[]
  particleCount: number
  arrangement: ImpactArrangement
}

export const THROWABLES: readonly Throwable[] = [
  {
    key: 'turtle',
    display: '🐢',
    titleKey: 'throw.turtle',
    impactColor: 'rgba(132, 169, 140, 0.85)',
    particles: ['🐢', '💤', '🐌', '⏰'],
    particleCount: 6,
    arrangement: 'radial',
  },
  {
    key: 'tomato',
    display: '🍅',
    titleKey: 'throw.tomato',
    impactColor: 'rgba(220, 38, 38, 0.85)',
    particles: ['🍅', '🌿', '🍃', '😡'],
    particleCount: 7,
    arrangement: 'radial',
  },
  {
    key: 'heart',
    display: '❤️',
    titleKey: 'throw.heart',
    impactColor: 'rgba(244, 114, 182, 0.85)',
    particles: ['❤️', '💖', '💕', '💗'],
    particleCount: 9,
    arrangement: 'heart',
  },
  {
    key: 'confused',
    display: '🤔',
    titleKey: 'throw.confused',
    impactColor: 'rgba(168, 162, 158, 0.85)',
    particles: ['❓', '❔', '💭', '❗'],
    particleCount: 6,
    arrangement: 'radial',
  },
  {
    key: 'rocket',
    display: '🚀',
    titleKey: 'throw.rocket',
    impactColor: 'rgba(249, 115, 22, 0.85)',
    particles: ['✨', '💥', '⭐', '🔥'],
    particleCount: 7,
    arrangement: 'radial',
  },
]

export const throwableByKey: Record<string, Throwable> = Object.fromEntries(
  THROWABLES.map(t => [t.key, t]),
)
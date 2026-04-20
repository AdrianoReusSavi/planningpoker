import type { TranslationKey } from '../i18n/locales'

export interface Reaction {
  key: string
  emoji: string
  titleKey: TranslationKey
}

export const REACTIONS: readonly Reaction[] = [
  { key: 'like', emoji: '👍', titleKey: 'reaction.like' },
  { key: 'dislike', emoji: '👎', titleKey: 'reaction.dislike' },
  { key: 'thinking', emoji: '🤔', titleKey: 'reaction.thinking' },
  { key: 'celebrate', emoji: '🎉', titleKey: 'reaction.celebrate' },
  { key: 'question', emoji: '❓', titleKey: 'reaction.question' },
  { key: 'laugh', emoji: '😆', titleKey: 'reaction.laugh' },
  { key: 'cry', emoji: '😭', titleKey: 'reaction.cry' },
]

export const emojiByKey: Record<string, string> = Object.fromEntries(
  REACTIONS.map(r => [r.key, r.emoji]),
)
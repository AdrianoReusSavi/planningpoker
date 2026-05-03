export type CardAnchor = 'center' | 'top'

export interface Point {
  x: number
  y: number
}

export function findCardAnchor(playerId: string, anchor: CardAnchor = 'center'): Point | null {
  const card = document.querySelector(`[data-player-id="${CSS.escape(playerId)}"]`) as HTMLElement | null
  if (!card) return null
  const flip = card.querySelector('.card-flip-container') as HTMLElement | null
  const rect = (flip ?? card).getBoundingClientRect()
  return {
    x: rect.left + rect.width / 2,
    y: anchor === 'top' ? rect.top : rect.top + rect.height / 2,
  }
}
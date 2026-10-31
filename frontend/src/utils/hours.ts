import type { PlayerRole, RoundVote } from '../types/room'

export const MIN_HOURS = 0.5
export const MAX_HOURS = 999
export const HOURS_STEP = 0.5
export const DEFAULT_HOURS = '0'

export const parseHours = (raw: string): number | null => {
  const text = raw.trim().replace(',', '.')
  if (!text) return null
  const value = Number(text)
  if (!Number.isFinite(value) || value < MIN_HOURS || value > MAX_HOURS) return null
  return Number.isInteger(value / HOURS_STEP) ? value : null
}

export const stepHours = (raw: string, direction: 1 | -1) => {
  const value = Number(raw.trim().replace(',', '.'))
  if (!raw.trim() || !Number.isFinite(value)) return direction > 0 ? MIN_HOURS : 0
  const snapped = direction > 0
    ? Math.floor(value / HOURS_STEP) * HOURS_STEP + HOURS_STEP
    : Math.ceil(value / HOURS_STEP) * HOURS_STEP - HOURS_STEP

  if (snapped < MIN_HOURS) return 0
  return Math.min(MAX_HOURS, snapped)
}

export const estimatesHours = (hoursEnabled: boolean, role: PlayerRole | undefined) =>
  hoursEnabled && role !== undefined && role !== 'None'

export const hoursOf = (votes: RoundVote[], role: PlayerRole) =>
  votes.filter(v => v.role === role && v.hours !== null).map(v => v.hours as number)

export const meanOf = (values: number[]) =>
  values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null

export const formatHours = (value: number | null) =>
  value === null ? '—' : `${Number(value.toFixed(1))}h`
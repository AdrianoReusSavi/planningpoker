export function miniChannel(participantId: string | null) {
  return `planning-poker-sync:${participantId ?? 'none'}`
}
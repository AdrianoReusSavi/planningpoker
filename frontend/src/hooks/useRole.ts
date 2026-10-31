import { useEffect, useState } from 'react'
import type { PlayerRole } from '../types/room'

const ROLE_KEY = 'playerRole'
const ROLES: PlayerRole[] = ['Dev', 'Qa', 'None']

const readRole = (): PlayerRole | null => {
  const saved = localStorage.getItem(ROLE_KEY)
  return ROLES.find(r => r === saved) ?? null
}

export function useRole() {
  const [role, setRole] = useState<PlayerRole | null>(readRole)

  useEffect(() => {
    if (role) localStorage.setItem(ROLE_KEY, role)
  }, [role])

  return [role, setRole] as const
}
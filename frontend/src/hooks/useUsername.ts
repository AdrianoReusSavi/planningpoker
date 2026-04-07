import { useEffect, useState } from 'react'

export function useUsername() {
  const [username, setUsername] = useState(() => localStorage.getItem('username') ?? '')

  useEffect(() => {
    if (username) {
      localStorage.setItem('username', username)
    }
  }, [username])

  return [username, setUsername] as const
}
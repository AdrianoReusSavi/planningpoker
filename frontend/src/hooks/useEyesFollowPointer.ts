import { useEffect, type RefObject } from 'react'
import { EYE_CENTER, PUPIL_RANGE } from '../components/WatcherCharacter'

const VIEWBOX = 48
const DEAD_ZONE = 24

export function useEyesFollowPointer(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let pointerX = 0
    let pointerY = 0
    let frame = 0

    const apply = () => {
      frame = 0
      const container = containerRef.current
      if (!container) return

      for (const svg of container.querySelectorAll<SVGSVGElement>('.watcher-peek svg')) {
        const rect = svg.getBoundingClientRect()
        if (rect.width === 0) continue

        const scale = rect.width / VIEWBOX
        const eyeX = rect.left + EYE_CENTER.x * scale
        const eyeY = rect.top + EYE_CENTER.y * scale

        const dx = pointerX - eyeX
        const dy = pointerY - eyeY
        const distance = Math.hypot(dx, dy)

        const reach = distance < DEAD_ZONE ? (distance / DEAD_ZONE) * PUPIL_RANGE : PUPIL_RANGE
        const unit = distance === 0 ? 0 : reach / distance

        svg.style.setProperty('--pupil-dx', `${(dx * unit).toFixed(2)}px`)
        svg.style.setProperty('--pupil-dy', `${(dy * unit).toFixed(2)}px`)
      }
    }

    const onMove = (e: PointerEvent) => {
      pointerX = e.clientX
      pointerY = e.clientY
      if (!frame) frame = requestAnimationFrame(apply)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [containerRef])
}
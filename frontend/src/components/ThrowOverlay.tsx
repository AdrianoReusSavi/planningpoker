import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useConnection } from '../contexts/ConnectionContext'
import { throwableByKey, type ImpactArrangement } from '../constants/throwables'
import { findCardAnchor } from '../utils/cardLocator'

interface ThrowEvent {
  fromPlayerId: string
  toPlayerId: string
  item: string
}

interface Particle {
  display: ReactNode
  dx: number
  dy: number
  rot: number
  scale: number
  delay: number
}

interface ActiveThrow {
  id: number
  display: ReactNode
  impactColor: string
  particles: Particle[]
  fromX: number
  fromY: number
  toX: number
  toY: number
  peakY: number
}

const FLIGHT_MS = 1000
const IMPACT_MS = 900
const CLEANUP_BUFFER_MS = 200
const MIN_PEAK_HEIGHT = 80
const PEAK_LIFT_RATIO = 0.3

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function buildParticles(
  arrangement: ImpactArrangement,
  palette: readonly ReactNode[],
  count: number,
): Particle[] {
  const pick = (idx: number) => palette[idx % palette.length]

  if (arrangement === 'heart') {
    const scale = 3.4
    return Array.from({ length: count }, (_, i) => {
      const t = (i / count) * Math.PI * 2
      const x = 16 * Math.pow(Math.sin(t), 3)
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))
      return {
        display: pick(i),
        dx: x * scale,
        dy: y * scale,
        rot: randomBetween(-30, 30),
        scale: randomBetween(0.85, 1.1),
        delay: i * 25,
      }
    })
  }

  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + randomBetween(-0.25, 0.25)
    const distance = randomBetween(38, 64)
    return {
      display: pick(i),
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      rot: randomBetween(-180, 180),
      scale: randomBetween(0.75, 1.15),
      delay: Math.random() * 80,
    }
  })
}

export default function ThrowOverlay() {
  const { connection } = useConnection()
  const [throws, setThrows] = useState<ActiveThrow[]>([])
  const nextIdRef = useRef(0)

  useEffect(() => {
    const renderThrow = (data: ThrowEvent) => {
      const meta = throwableByKey[data.item]
      if (!meta) return

      const fromCenter = findCardAnchor(data.fromPlayerId, 'center')
      const toCenter = findCardAnchor(data.toPlayerId, 'center')
      if (!fromCenter || !toCenter) return

      const id = ++nextIdRef.current
      const distance = Math.hypot(toCenter.x - fromCenter.x, toCenter.y - fromCenter.y)
      const peakLift = Math.max(MIN_PEAK_HEIGHT, distance * PEAK_LIFT_RATIO)
      const peakY = Math.min(fromCenter.y, toCenter.y) - peakLift
      const particles = buildParticles(meta.arrangement, meta.particles, meta.particleCount)

      setThrows(prev => [...prev, {
        id,
        display: meta.display,
        impactColor: meta.impactColor,
        particles,
        fromX: fromCenter.x,
        fromY: fromCenter.y,
        toX: toCenter.x,
        toY: toCenter.y,
        peakY,
      }])

      window.setTimeout(() => {
        setThrows(prev => prev.filter(t => t.id !== id))
      }, FLIGHT_MS + IMPACT_MS + CLEANUP_BUFFER_MS)
    }

    if (!connection) return
    connection.on('THROW', renderThrow)
    return () => { connection.off('THROW', renderThrow) }
  }, [connection])

  return (
    <div className="throw-overlay" aria-hidden="true">
      {throws.map(t => (
        <div
          key={t.id}
          className="throw-flight"
          style={{
            ['--from-x' as string]: `${t.fromX}px`,
            ['--from-y' as string]: `${t.fromY}px`,
            ['--to-x' as string]: `${t.toX}px`,
            ['--to-y' as string]: `${t.toY}px`,
            ['--peak-y' as string]: `${t.peakY}px`,
            ['--peak-x' as string]: `${(t.fromX + t.toX) / 2}px`,
            ['--flight-ms' as string]: `${FLIGHT_MS}ms`,
            ['--impact-ms' as string]: `${IMPACT_MS}ms`,
          }}
        >
          <span className="throw-projectile">{t.display}</span>
          <span
            className="throw-impact"
            style={{
              left: `${t.toX}px`,
              top: `${t.toY}px`,
              ['--impact-color' as string]: t.impactColor,
            }}
          />
          {t.particles.map((p, i) => (
            <span
              key={i}
              className="throw-particle"
              style={{
                left: `${t.toX}px`,
                top: `${t.toY}px`,
                ['--dx' as string]: `${p.dx}px`,
                ['--dy' as string]: `${p.dy}px`,
                ['--rot' as string]: `${p.rot}deg`,
                ['--scale' as string]: `${p.scale}`,
                animationDelay: `${FLIGHT_MS + p.delay}ms`,
              }}
            >
              {p.display}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}
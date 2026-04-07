import { useEffect, useRef, useState } from 'react'
import narwhalFront from '../assets/narwhal-front.svg'
import narwhalBack from '../assets/narwhal-back.svg'
import adoFront from '../assets/ado-front.svg'
import adoBack from '../assets/ado-back.svg'

export default function FlipCard() {
  const cardRef = useRef<HTMLDivElement>(null)
  const [angle, setAngle] = useState(0)
  const [flipping, setFlipping] = useState(false)
  const [showingNarwhal, setShowingNarwhal] = useState(true)
  const intervalRef = useRef<number | null>(null)
  const flipCard = useRef(() => {})

  flipCard.current = () => {
    if (flipping) return
    setFlipping(true)
    setAngle((prev) => prev + 180)
  }

  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.style.transform = `rotateZ(-30deg) rotateY(${angle}deg)`
    }
    const timeout = setTimeout(() => {
      if ((angle % 360) === 180) {
        setShowingNarwhal((prev) => !prev)
      }
      setFlipping(false)
    }, 300)
    return () => clearTimeout(timeout)
  }, [angle])

  useEffect(() => {
    if (!intervalRef.current) {
      intervalRef.current = window.setInterval(() => flipCard.current(), 1200)
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (!intervalRef.current) {
          intervalRef.current = window.setInterval(() => flipCard.current(), 1200)
        }
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  const imgStyle: React.CSSProperties = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    backfaceVisibility: 'hidden',
    borderRadius: '8px',
    userSelect: 'none',
  }

  return (
    <div className="flip-card-scene">
      <div className="flip-card-container">
        <div ref={cardRef} className="flip-card-inner">
          <img src={narwhalFront} alt="" draggable={false}
            style={{ ...imgStyle, transform: 'rotateY(0deg)', display: showingNarwhal ? 'block' : 'none' }} />
          <img src={adoBack} alt="" draggable={false}
            style={{ ...imgStyle, transform: 'rotateY(180deg)', display: showingNarwhal ? 'block' : 'none' }} />
          <img src={adoFront} alt="" draggable={false}
            style={{ ...imgStyle, transform: 'rotateY(0deg)', display: showingNarwhal ? 'none' : 'block' }} />
          <img src={narwhalBack} alt="" draggable={false}
            style={{ ...imgStyle, transform: 'rotateY(180deg)', display: showingNarwhal ? 'none' : 'block' }} />
        </div>
      </div>
    </div>
  )
}
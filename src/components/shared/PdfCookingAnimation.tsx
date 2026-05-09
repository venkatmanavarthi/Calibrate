import { useEffect, useState } from 'react'

const MESSAGES = [
  'Mixing your experience…',
  'Adding a dash of keywords…',
  'Seasoning with achievements…',
  'Folding in your skills…',
  'Letting it simmer…',
  'Almost ready to plate…',
]

interface Props {
  label?: string
}

export default function PdfCookingAnimation({ label }: Props) {
  const [msgIndex, setMsgIndex] = useState(0)
  const [dots, setDots] = useState(0)

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length)
    }, 2200)
    const dotTimer = setInterval(() => {
      setDots((d) => (d + 1) % 4)
    }, 500)
    return () => {
      clearInterval(msgTimer)
      clearInterval(dotTimer)
    }
  }, [])

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm z-10 gap-6">
      <div className="relative flex items-end justify-center" style={{ height: 80, width: 80 }}>
        {/* Pot body */}
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Steam lines */}
          <g className="steam-animation">
            <line x1="28" y1="22" x2="28" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" className="steam-left" />
            <line x1="40" y1="18" x2="40" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" className="steam-center" />
            <line x1="52" y1="22" x2="52" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" className="steam-right" />
          </g>
          {/* Pot lid */}
          <rect x="20" y="30" width="40" height="5" rx="2.5" fill="currentColor" opacity="0.7" className="lid-animation" />
          <rect x="35" y="26" width="10" height="5" rx="2.5" fill="currentColor" opacity="0.7" />
          {/* Pot body */}
          <rect x="16" y="34" width="48" height="30" rx="6" fill="currentColor" opacity="0.15" />
          <rect x="16" y="34" width="48" height="30" rx="6" stroke="currentColor" strokeWidth="2" opacity="0.6" />
          {/* Handles */}
          <rect x="6" y="38" width="10" height="6" rx="3" fill="currentColor" opacity="0.5" />
          <rect x="64" y="38" width="10" height="6" rx="3" fill="currentColor" opacity="0.5" />
          {/* Bubbles */}
          <circle cx="32" cy="50" r="3" fill="currentColor" opacity="0.3" className="bubble-1" />
          <circle cx="44" cy="46" r="2" fill="currentColor" opacity="0.3" className="bubble-2" />
          <circle cx="50" cy="52" r="2.5" fill="currentColor" opacity="0.3" className="bubble-3" />
        </svg>
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <p className="text-sm font-medium text-foreground">
          {label ?? MESSAGES[msgIndex]}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums" style={{ minWidth: 24 }}>
          {'●'.repeat(dots + 1)}{'○'.repeat(3 - dots)}
        </p>
      </div>

      <style>{`
        @keyframes steamRise {
          0%   { transform: translateY(0) scaleX(1); opacity: 0.5; }
          50%  { transform: translateY(-6px) scaleX(1.3); opacity: 0.2; }
          100% { transform: translateY(-12px) scaleX(0.8); opacity: 0; }
        }
        @keyframes lidBounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-3px); }
        }
        @keyframes bubblePop {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50%       { transform: scale(1.4); opacity: 0.15; }
        }
        .steam-left   { animation: steamRise 1.6s ease-in-out infinite; }
        .steam-center { animation: steamRise 1.6s ease-in-out 0.4s infinite; }
        .steam-right  { animation: steamRise 1.6s ease-in-out 0.8s infinite; }
        .lid-animation { animation: lidBounce 1.2s ease-in-out infinite; }
        .bubble-1 { animation: bubblePop 1.4s ease-in-out infinite; }
        .bubble-2 { animation: bubblePop 1.4s ease-in-out 0.5s infinite; }
        .bubble-3 { animation: bubblePop 1.4s ease-in-out 1.0s infinite; }
      `}</style>
    </div>
  )
}

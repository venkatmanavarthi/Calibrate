import { useEffect, useRef, useState } from 'react'

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
  const [visible, setVisible] = useState(true)
  const prevLabel = useRef(label)

  useEffect(() => {
    if (label) return
    const msgTimer = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % MESSAGES.length)
        setVisible(true)
      }, 250)
    }, 2400)
    return () => clearInterval(msgTimer)
  }, [label])

  // Reset fade when label prop changes
  useEffect(() => {
    if (label !== prevLabel.current) {
      prevLabel.current = label
      setVisible(true)
    }
  }, [label])

  const displayMsg = label ?? MESSAGES[msgIndex]

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm z-10 gap-6">
      {/* Pot illustration */}
      <svg width="80" height="84" viewBox="0 0 80 84" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="pot-interior">
            <path d="M16 36 H64 Q70 36 70 42 L68 64 Q68 70 62 70 H18 Q12 70 12 64 L10 42 Q10 36 16 36 Z" />
          </clipPath>
        </defs>
        {/* Steam wisps */}
        <path
          d="M28 22 C26 18 30 14 28 10"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          className="steam-left"
        />
        <path
          d="M40 18 C38 13 42 8 40 4"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          className="steam-center"
        />
        <path
          d="M52 22 C50 18 54 14 52 10"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          className="steam-right"
        />

        {/* Lid + handle (grouped so they move together) */}
        <g className="lid-group">
          <rect x="35" y="27" width="10" height="5" rx="2.5" fill="currentColor" opacity="0.7" />
          <rect x="20" y="31" width="40" height="5" rx="2.5" fill="currentColor" opacity="0.7" />
        </g>

        {/* Pot body — slightly wider at top, narrower at bottom for pot shape */}
        <path
          d="M16 36 H64 Q70 36 70 42 L68 64 Q68 70 62 70 H18 Q12 70 12 64 L10 42 Q10 36 16 36 Z"
          fill="currentColor" opacity="0.12"
        />
        <path
          d="M16 36 H64 Q70 36 70 42 L68 64 Q68 70 62 70 H18 Q12 70 12 64 L10 42 Q10 36 16 36 Z"
          stroke="currentColor" strokeWidth="2" opacity="0.65"
        />

        {/* Handles */}
        <rect x="3" y="40" width="9" height="6" rx="3" fill="currentColor" opacity="0.5" />
        <rect x="68" y="40" width="9" height="6" rx="3" fill="currentColor" opacity="0.5" />

        {/* Bubbles clipped to pot interior so they never escape the walls */}
        <g clipPath="url(#pot-interior)">
          <circle cx="32" cy="54" r="3" fill="currentColor" opacity="0.3" className="bubble-1" />
          <circle cx="44" cy="50" r="2" fill="currentColor" opacity="0.3" className="bubble-2" />
          <circle cx="51" cy="57" r="2.5" fill="currentColor" opacity="0.3" className="bubble-3" />
        </g>
      </svg>

      <div className="flex flex-col items-center gap-2">
        {/* Message with crossfade */}
        <p
          className="text-sm font-medium text-foreground transition-opacity duration-[250ms]"
          style={{ opacity: visible ? 1 : 0 }}
        >
          {displayMsg}
        </p>

        {/* Fixed 4-dot progress indicator */}
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="block w-1.5 h-1.5 rounded-full bg-current dot-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes steamRise {
            0%   { transform: translateY(0)    opacity: 0.5; }
            50%  { transform: translateY(-5px); opacity: 0.25; }
            100% { transform: translateY(-11px); opacity: 0; }
          }
          @keyframes lidBounce {
            0%, 100% { transform: translateY(0); }
            50%       { transform: translateY(-3px); }
          }
          @keyframes bubblePop {
            0%, 100% { transform: scale(1);   opacity: 0.3; }
            50%       { transform: scale(1.5); opacity: 0.12; }
          }
          @keyframes dotPulse {
            0%, 80%, 100% { transform: scale(0.7); opacity: 0.3; }
            40%            { transform: scale(1);   opacity: 0.9; }
          }
          .steam-left   { animation: steamRise 1.8s ease-in-out infinite; opacity: 0.45; }
          .steam-center { animation: steamRise 1.8s ease-in-out 0.5s infinite; opacity: 0.55; }
          .steam-right  { animation: steamRise 1.8s ease-in-out 1.0s infinite; opacity: 0.45; }
          .lid-group    { animation: lidBounce 1.3s ease-in-out infinite; }
          .bubble-1     { animation: bubblePop 1.5s ease-in-out infinite; }
          .bubble-2     { animation: bubblePop 1.5s ease-in-out 0.5s infinite; }
          .bubble-3     { animation: bubblePop 1.5s ease-in-out 1.0s infinite; }
          .dot-pulse    { animation: dotPulse  1.4s ease-in-out infinite; }
        }
        @media (prefers-reduced-motion: reduce) {
          .steam-left, .steam-center, .steam-right { opacity: 0.4; }
          .dot-pulse { opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { X, BarChart2, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ResumeRating, AIProvider } from '@/types/models'

interface Props {
  resumeMarkdown: string
  jobDescription: string
  provider: AIProvider
  model: string
  onClose: () => void
  initialRating?: ResumeRating | null
  initialLoading?: boolean
}

function ScoreRing({ score }: { score: number }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const filled = (score / 100) * circumference
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444'

  return (
    <div className="flex flex-col items-center gap-1 py-3">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
        <circle
          cx="44" cy="44" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          strokeDashoffset={circumference * 0.25}
          transform="rotate(-90 44 44)"
        />
        <text x="44" y="48" textAnchor="middle" fontSize="18" fontWeight="700" fill={color}>{score}</text>
      </svg>
      <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Overall Score</span>
    </div>
  )
}

function CategoryBar({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold tabular-nums">{score}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

function Collapsible({ title, items, emptyMsg }: { title: string; items: string[]; emptyMsg: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 w-full text-left text-[10px] uppercase tracking-wider font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        {title}
      </button>
      {open && (
        <ul className="flex flex-col gap-1 pl-2 pb-1">
          {items.length === 0 ? (
            <li className="text-xs text-muted-foreground italic">{emptyMsg}</li>
          ) : (
            items.map((item, i) => (
              <li key={i} className="text-xs leading-snug">• {item}</li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

export default function ResumeRatingPanel({ resumeMarkdown, jobDescription, provider, model, onClose, initialRating, initialLoading }: Props) {
  const [rating, setRating] = useState<ResumeRating | null>(initialRating ?? null)
  const [loading, setLoading] = useState(initialLoading ?? false)
  const [error, setError] = useState<string | null>(null)

  // Sync when parent provides auto-computed rating
  useEffect(() => {
    if (initialRating !== undefined) setRating(initialRating)
  }, [initialRating])

  useEffect(() => {
    if (initialLoading !== undefined) setLoading(initialLoading)
  }, [initialLoading])

  const runRating = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.aiRateResume({ resumeMarkdown, jobDescription, provider, model })
      setRating(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rating failed')
    } finally {
      setLoading(false)
    }
  }, [resumeMarkdown, jobDescription, provider, model])

  // Only auto-fetch if no initialRating was provided by parent
  useEffect(() => {
    if (initialRating === undefined && !initialLoading) {
      runRating()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-1.5">
          <BarChart2 size={12} className="text-muted-foreground" />
          <span className="text-xs font-medium">Resume Score</span>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground rounded p-0.5 transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
            <RefreshCw size={18} className="animate-spin" />
            <span className="text-xs">Analyzing resume…</span>
          </div>
        )}

        {error && !loading && (
          <div className="p-3 flex flex-col gap-2">
            <p className="text-xs text-destructive">{error}</p>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={runRating}>
              Retry
            </Button>
          </div>
        )}

        {rating && !loading && (
          <div className="flex flex-col">
            {/* Score ring */}
            <ScoreRing score={rating.overallScore} />

            {/* Category bars */}
            <div className="px-3 pb-3 flex flex-col gap-3 border-b">
              <CategoryBar label="ATS Compatibility" score={rating.atsScore} />
              <CategoryBar label="Keyword Match" score={rating.keywordScore} />
              <CategoryBar label="Impact & Metrics" score={rating.impactScore} />
            </div>

            {/* Details */}
            <div className="px-3 py-2 flex flex-col gap-0.5 border-b">
              <Collapsible
                title="ATS Issues"
                items={rating.atsIssues}
                emptyMsg="No ATS issues found"
              />
              <Collapsible
                title={`Keywords (${rating.matchedKeywords.length} matched)`}
                items={rating.matchedKeywords}
                emptyMsg="No keywords matched"
              />
              <Collapsible
                title={`Missing Keywords (${rating.missingKeywords.length})`}
                items={rating.missingKeywords}
                emptyMsg="No missing keywords"
              />
              <Collapsible
                title="Impact Notes"
                items={rating.impactDetails}
                emptyMsg="No impact notes"
              />
            </div>

            {/* Summary */}
            <div className="px-3 py-2 border-b">
              <p className="text-[11px] leading-relaxed text-muted-foreground">{rating.summary}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs text-muted-foreground gap-1.5"
          onClick={runRating}
          disabled={loading}
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          Re-rate
        </Button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { RotateCcw, ChevronDown, ChevronUp, TrendingUp, MessageSquare, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useInterviewStore } from '@/stores/interview.store'
import { cn } from '@/lib/utils'
import type { InterviewScore } from '@/types/models'

const RECOMMENDATION_CONFIG = {
  strong_yes: { label: 'Strong Yes', color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950 dark:border-emerald-800' },
  yes: { label: 'Yes', color: 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800' },
  maybe: { label: 'Maybe', color: 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950 dark:border-yellow-800' },
  no: { label: 'No', color: 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800' }
}

function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const radius = (size / 2) - 8
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#3b82f6' : score >= 45 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={6} className="text-border" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="text-[10px] text-muted-foreground">/ 100</span>
      </div>
    </div>
  )
}

function ScoreBar({ label, score, icon: Icon }: { label: string; score: number; icon: typeof TrendingUp }) {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-blue-500' : score >= 45 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon size={13} />
          {label}
        </div>
        <span className="font-medium tabular-nums">{score}</span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

function QuestionFeedback({ item, index }: { item: InterviewScore['questionFeedback'][0]; index: number }) {
  const [open, setOpen] = useState(false)
  const scoreColor = item.score >= 80 ? 'text-emerald-600' : item.score >= 60 ? 'text-blue-600' : 'text-yellow-600'

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-medium text-muted-foreground flex-shrink-0">Q{index + 1}</span>
          <span className="text-sm truncate">{item.question}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          <span className={cn('text-sm font-semibold tabular-nums', scoreColor)}>{item.score}</span>
          {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 border-t bg-accent/20">
          <div className="pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Your Answer</p>
            <p className="text-sm text-muted-foreground">{item.answerSummary}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Feedback</p>
            <p className="text-sm">{item.feedback}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function InterviewScorecard() {
  const { score, config, reset } = useInterviewStore()

  if (!score) return null

  const rec = RECOMMENDATION_CONFIG[score.recommendation]

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Interview Complete</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {config.type === 'topic' && config.topics?.length
                ? config.topics.join(', ')
                : config.type === 'job-fit' ? 'Job Fit Interview'
                : config.type === 'leetcode' ? 'Coding Interview'
                : 'System Design Interview'
              }
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
            <RotateCcw size={13} /> New Interview
          </Button>
        </div>

        {/* Overall score + recommendation */}
        <div className="flex items-center gap-8 p-6 rounded-xl border bg-card">
          <ScoreRing score={score.overall} size={100} />
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Overall Score</p>
              <p className="text-sm">{score.summary}</p>
            </div>
            <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border', rec.color)}>
              Recommendation: {rec.label}
            </span>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Score Breakdown</h2>
          <div className="space-y-3">
            <ScoreBar label="Technical" score={score.technical} icon={Brain} />
            <ScoreBar label="Communication" score={score.communication} icon={MessageSquare} />
            <ScoreBar label="Problem Solving" score={score.problemSolving} icon={TrendingUp} />
          </div>
        </div>

        {/* Strengths & Improvements */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Strengths</h2>
            <ul className="space-y-1.5">
              {score.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">Areas to Improve</h2>
            <ul className="space-y-1.5">
              {score.improvements.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Question-by-question feedback */}
        {score.questionFeedback.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Question Feedback</h2>
            <div className="space-y-2">
              {score.questionFeedback.map((item, i) => (
                <QuestionFeedback key={i} item={item} index={i} />
              ))}
            </div>
          </div>
        )}

        <Button variant="outline" className="w-full gap-2" onClick={reset}>
          <RotateCcw size={14} /> Start Another Interview
        </Button>
      </div>
    </div>
  )
}

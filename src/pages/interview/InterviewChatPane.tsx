import { useEffect, useRef, useState, KeyboardEvent } from 'react'
import { Send, Square, Clock, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useInterviewStore } from '@/stores/interview.store'
import { cn } from '@/lib/utils'
import type { InterviewType } from '@/types/models'

const TYPE_LABELS: Record<InterviewType, string> = {
  'job-fit': 'Job Interview',
  'leetcode': 'LeetCode',
  'system-design': 'System Design',
  'topic': 'Topic Interview'
}

function useCountdown(startedAt: number | null, durationMinutes: number) {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (!startedAt) return
    const totalMs = durationMinutes * 60 * 1000

    const update = () => {
      const elapsed = Date.now() - startedAt
      const rem = Math.max(0, totalMs - elapsed)
      setRemaining(rem)
    }

    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [startedAt, durationMinutes])

  return remaining
}

function formatTime(ms: number): string {
  const totalSecs = Math.ceil(ms / 1000)
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export default function InterviewChatPane() {
  const {
    config, status, messages, streamingContent, isStreaming,
    startedAt, error, markTimeUp, scoreInterview, submitAnswer
  } = useInterviewStore()

  const [answer, setAnswer] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isScoring, setIsScoring] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const remaining = useCountdown(startedAt, config.durationMinutes)
  const timeUp = remaining !== null && remaining === 0

  // Auto-mark time up when timer hits zero
  useEffect(() => {
    if (timeUp && status === 'active') {
      markTimeUp()
    }
  }, [timeUp, status, markTimeUp])

  // Scroll to bottom on new messages or streaming content
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const handleSubmit = async () => {
    const trimmed = answer.trim()
    if (!trimmed || isSubmitting || isStreaming) return

    setIsSubmitting(true)
    setAnswer('')
    try {
      await submitAnswer(trimmed)
    } finally {
      setIsSubmitting(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleEndInterview = async () => {
    setIsScoring(true)
    try {
      await scoreInterview()
    } finally {
      setIsScoring(false)
    }
  }

  const timerColor = remaining !== null && remaining < 60_000
    ? 'text-destructive'
    : remaining !== null && remaining < 300_000
    ? 'text-yellow-500'
    : 'text-muted-foreground'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b bg-background/95">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {TYPE_LABELS[config.type]}
          </span>
          {config.type === 'topic' && (config.topics ?? []).length > 0 && (
            <span className="text-xs text-muted-foreground">
              {config.topics!.slice(0, 3).join(', ')}{config.topics!.length > 3 ? '…' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {remaining !== null && (
            <div className={cn('flex items-center gap-1.5 text-sm font-mono font-medium', timerColor)}>
              <Clock size={14} />
              {formatTime(remaining)}
            </div>
          )}

          {(status === 'active' || status === 'time-up') && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEndInterview}
              disabled={isScoring || messages.length < 2}
              className="gap-1.5 text-xs"
            >
              {isScoring ? (
                <><Loader2 size={12} className="animate-spin" /> Scoring…</>
              ) : (
                <><Square size={12} /> End Interview</>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Time-up banner */}
      {status === 'time-up' && (
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-600 dark:text-yellow-400">
          <span className="text-sm font-medium">Time's up! Finish your thought and click "End Interview" to see your score.</span>
        </div>
      )}

      {/* Scoring overlay */}
      {status === 'scoring' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Loader2 size={32} className="animate-spin text-primary" />
          <div className="text-center">
            <p className="font-medium">Evaluating your performance…</p>
            <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
          </div>
        </div>
      )}

      {status !== 'scoring' && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && isStreaming && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 bg-accent text-sm">
                  <StreamingDots />
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex', msg.role === 'interviewee' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                    msg.role === 'interviewee'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-accent text-accent-foreground rounded-tl-sm'
                  )}
                >
                  {msg.role === 'interviewer' && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide opacity-60 block mb-1">
                      Interviewer
                    </span>
                  )}
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                </div>
              </div>
            ))}

            {/* Streaming interviewer response */}
            {isStreaming && streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 bg-accent text-sm leading-relaxed">
                  <span className="text-[10px] font-semibold uppercase tracking-wide opacity-60 block mb-1">
                    Interviewer
                  </span>
                  <span className="whitespace-pre-wrap">{streamingContent}</span>
                  <span className="inline-block w-0.5 h-3.5 bg-current ml-0.5 animate-pulse" />
                </div>
              </div>
            )}

            {/* Thinking indicator when no content yet */}
            {isStreaming && !streamingContent && messages.length > 0 && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-accent text-sm">
                  <StreamingDots />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          {(status === 'active' || status === 'time-up') && (
            <div className="flex-shrink-0 border-t p-4">
              <div className="flex gap-2 items-end">
                <Textarea
                  ref={textareaRef}
                  className="flex-1 resize-none min-h-[72px] max-h-48 text-sm"
                  placeholder={isStreaming ? 'Waiting for interviewer…' : 'Type your answer… (⌘↵ to submit)'}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isStreaming || isSubmitting}
                />
                <Button
                  size="icon"
                  className="h-[72px] w-10 flex-shrink-0"
                  onClick={handleSubmit}
                  disabled={!answer.trim() || isStreaming || isSubmitting}
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Press ⌘↵ to submit · End interview to get your score
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StreamingDots() {
  return (
    <div className="flex gap-1 items-center h-4">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

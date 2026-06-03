import { useEffect, useState, KeyboardEvent } from 'react'
import { Play, Briefcase, Code2, Server, BookOpen, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useInterviewStore } from '@/stores/interview.store'
import { useProfilesStore } from '@/stores/profiles.store'
import { useSettingsStore } from '@/stores/settings.store'
import { PROVIDER_LABELS, PROVIDER_MODELS } from '@/lib/ai-providers'
import { cn } from '@/lib/utils'
import type { AIProvider, InterviewType } from '@/types/models'

const INTERVIEW_TYPES: { type: InterviewType; label: string; description: string; icon: typeof Briefcase }[] = [
  { type: 'job-fit', label: 'Job Fit', description: 'Behavioral + technical questions tailored to a role', icon: Briefcase },
  { type: 'leetcode', label: 'LeetCode', description: 'Algorithm & data structure coding problems', icon: Code2 },
  { type: 'system-design', label: 'System Design', description: 'Design large-scale distributed systems', icon: Server },
  { type: 'topic', label: 'Topic', description: 'Focus on specific skills or technology areas', icon: BookOpen }
]

const DURATIONS = [15, 30, 45, 60] as const

export default function InterviewSetupPane() {
  const { config, setType, setProvider, setModel, setConfigField, startInterview } = useInterviewStore()
  const profiles = useProfilesStore((s) => s.profiles)
  const settings = useSettingsStore((s) => s.settings)

  const [topicInput, setTopicInput] = useState('')
  const [isStarting, setIsStarting] = useState(false)

  useEffect(() => {
    if (settings) {
      setProvider(settings.preferredProvider)
      setModel(settings.preferredModels[settings.preferredProvider] ?? PROVIDER_MODELS[settings.preferredProvider][0])
    }
  }, [settings, setProvider, setModel])

  useEffect(() => {
    if (profiles.length > 0 && !config.profileId) {
      setConfigField('profileId', profiles[0].id)
    }
  }, [profiles, config.profileId, setConfigField])

  const addTopic = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const current = config.topics ?? []
    if (!current.includes(trimmed)) {
      setConfigField('topics', [...current, trimmed])
    }
    setTopicInput('')
  }

  const removeTopic = (topic: string) => {
    setConfigField('topics', (config.topics ?? []).filter(t => t !== topic))
  }

  const handleTopicKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTopic(topicInput)
    }
  }

  const canStart = () => {
    if (config.type === 'job-fit') return !!config.profileId
    if (config.type === 'topic') return (config.topics ?? []).length > 0
    return true
  }

  const handleStart = async () => {
    setIsStarting(true)
    try {
      await startInterview()
    } finally {
      setIsStarting(false)
    }
  }

  const availableProviders = (settings?.configuredProviders ?? [])
    .concat('lmstudio' as const)
    .filter((p, i, a) => a.indexOf(p) === i)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">Auto Interview</h1>
          <p className="text-muted-foreground text-sm mt-1">Practice with an AI interviewer and get scored at the end</p>
        </div>

        {/* Interview Type */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Interview Type</Label>
          <div className="grid grid-cols-2 gap-2">
            {INTERVIEW_TYPES.map(({ type, label, description, icon: Icon }) => (
              <button
                key={type}
                onClick={() => setType(type)}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border text-left transition-colors',
                  config.type === type
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border hover:border-primary/50 hover:bg-accent/50 text-muted-foreground'
                )}
              >
                <Icon size={18} className={cn('mt-0.5 flex-shrink-0', config.type === type ? 'text-primary' : '')} />
                <div>
                  <div className={cn('text-sm font-medium', config.type === type ? 'text-foreground' : '')}>{label}</div>
                  <div className="text-xs mt-0.5">{description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Context fields based on type */}
        {config.type === 'job-fit' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profile</Label>
              {profiles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No profiles found. Create one first.</p>
              ) : (
                <Select value={config.profileId ?? ''} onValueChange={(v) => setConfigField('profileId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a profile…" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Job Description <span className="normal-case font-normal">(optional)</span>
              </Label>
              <Textarea
                className="resize-none text-sm h-28"
                placeholder="Paste the job description to tailor questions to this role…"
                value={config.jobDescription ?? ''}
                onChange={(e) => setConfigField('jobDescription', e.target.value)}
              />
            </div>
          </div>
        )}

        {config.type === 'topic' && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Topics</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Python, React, SQL… press Enter to add"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={handleTopicKeyDown}
                className="flex-1 text-sm"
              />
              <Button variant="outline" size="sm" onClick={() => addTopic(topicInput)} disabled={!topicInput.trim()}>
                Add
              </Button>
            </div>
            {(config.topics ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(config.topics ?? []).map(topic => (
                  <span
                    key={topic}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                  >
                    {topic}
                    <button onClick={() => removeTopic(topic)} className="hover:text-destructive">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {(config.topics ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">Add at least one topic to continue</p>
            )}
          </div>
        )}

        {/* Duration */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Duration</Label>
          <div className="flex gap-2">
            {DURATIONS.map(d => (
              <button
                key={d}
                onClick={() => setConfigField('durationMinutes', d)}
                className={cn(
                  'flex-1 py-2 rounded-md border text-sm font-medium transition-colors',
                  config.durationMinutes === d
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/50 text-muted-foreground'
                )}
              >
                {d} min
              </button>
            ))}
          </div>
        </div>

        {/* AI Provider & Model */}
        {availableProviders.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI Model</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select value={config.provider} onValueChange={(v) => {
                const provider = v as AIProvider
                setProvider(provider)
                const models = PROVIDER_MODELS[provider] ?? []
                if (models.length > 0) setModel(models[0])
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableProviders.map(p => (
                    <SelectItem key={p} value={p}>{PROVIDER_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={config.model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(PROVIDER_MODELS[config.provider] ?? [config.model]).map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Start Button */}
        <Button
          size="lg"
          className="w-full gap-2"
          disabled={!canStart() || isStarting}
          onClick={handleStart}
        >
          <Play size={16} />
          {isStarting ? 'Starting interview…' : 'Start Interview'}
        </Button>
      </div>
    </div>
  )
}

import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GitBranch, Plus, Play, Trash2, ExternalLink, Wand2,
  CheckSquare, Square, Clock, ChevronDown, ChevronRight, AlertCircle, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { usePipelineStore } from '@/stores/pipeline.store'
import { useJobsStore } from '@/stores/jobs.store'
import { useProfilesStore } from '@/stores/profiles.store'
import { useTemplatesStore } from '@/stores/templates.store'
import { useSettingsStore } from '@/stores/settings.store'
import { useGeneratorStore } from '@/stores/generator.store'
import { generateId, now } from '@/lib/utils'
import { PROVIDER_LABELS, PROVIDER_MODELS } from '@/lib/ai-providers'
import type { Pipeline, ScoredJob } from '@/types/models'

const SCHEDULE_OPTIONS = [
  { label: 'Every 30 min', value: 30 },
  { label: 'Every hour', value: 60 },
  { label: 'Every 2 hours', value: 120 },
  { label: 'Every 4 hours', value: 240 },
  { label: 'Every 8 hours', value: 480 },
  { label: 'Every 12 hours', value: 720 },
  { label: 'Every 24 hours', value: 1440 }
]

function scheduleLabel(minutes: number): string {
  return SCHEDULE_OPTIONS.find((o) => o.value === minutes)?.label ?? `Every ${minutes} min`
}

function scoreColor(score: number): string {
  if (score >= 8) return 'bg-green-600'
  if (score >= 6) return 'bg-yellow-500'
  if (score >= 4) return 'bg-orange-500'
  return 'bg-red-500'
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─── Pipeline Form Dialog ────────────────────────────────────────────────────

function PipelineFormDialog({
  open,
  initial,
  onClose
}: {
  open: boolean
  initial: Pipeline | null
  onClose: () => void
}) {
  const savePipeline = usePipelineStore((s) => s.savePipeline)
  const { companies } = useJobsStore()
  const { profiles } = useProfilesStore()
  const { templates } = useTemplatesStore()
  const { settings } = useSettingsStore()

  const [name, setName] = useState('')
  const [profileId, setProfileId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [provider, setProvider] = useState('')
  const [model, setModel] = useState('')
  const [companyIds, setCompanyIds] = useState<string[] | 'all'>('all')
  const [scheduleMinutes, setScheduleMinutes] = useState(60)
  const [minScore, setMinScore] = useState<string>('')
  const [enabled, setEnabled] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    if (initial) {
      setName(initial.name)
      setProfileId(initial.profileId)
      setTemplateId(initial.templateId)
      setProvider(initial.provider)
      setModel(initial.model)
      setCompanyIds(initial.companyIds)
      setScheduleMinutes(initial.scheduleMinutes)
      setMinScore(initial.minScore != null ? String(initial.minScore) : '')
      setEnabled(initial.enabled)
    } else {
      setName('')
      setProfileId(profiles[0]?.id ?? '')
      setTemplateId(templates[0]?.id ?? '')
      const defaultProvider = settings?.preferredProvider ?? 'anthropic'
      setProvider(defaultProvider)
      setModel(PROVIDER_MODELS[defaultProvider]?.[0] ?? '')
      setCompanyIds('all')
      setScheduleMinutes(60)
      setMinScore('')
      setEnabled(true)
    }
  }, [open, initial, profiles, templates, settings])

  const handleSave = async () => {
    if (!name.trim() || !profileId || !templateId || !provider || !model) return
    setBusy(true)
    const parsed = parseInt(minScore, 10)
    const pipeline: Pipeline = {
      id: initial?.id ?? generateId(),
      name: name.trim(),
      profileId,
      templateId,
      provider: provider as Pipeline['provider'],
      model,
      companyIds,
      scheduleMinutes,
      minScore: !isNaN(parsed) && parsed >= 1 && parsed <= 10 ? parsed : undefined,
      enabled,
      createdAt: initial?.createdAt ?? now(),
      updatedAt: now(),
      lastRunAt: initial?.lastRunAt
    }
    await savePipeline(pipeline)
    setBusy(false)
    onClose()
  }

  const companyToggle = (id: string) => {
    if (companyIds === 'all') {
      setCompanyIds(companies.filter((c) => c.id !== id).map((c) => c.id))
    } else {
      const next = companyIds.includes(id)
        ? companyIds.filter((x) => x !== id)
        : [...companyIds, id]
      setCompanyIds(next.length === companies.length ? 'all' : next)
    }
  }

  const isCompanySelected = (id: string) =>
    companyIds === 'all' || companyIds.includes(id)

  const canSave = name.trim() && profileId && templateId && provider && model

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit pipeline' : 'New pipeline'}</DialogTitle>
          <DialogDescription>
            Pipelines scan your tracked companies on a schedule, score jobs against your profile, and let you generate resumes for top matches.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 mt-1">
          <div className="grid gap-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My pipeline" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5 min-w-0 overflow-hidden">
              <Label>Profile</Label>
              <Select value={profileId} onValueChange={setProfileId}>
                <SelectTrigger className="w-full truncate"><SelectValue placeholder="Select profile" /></SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5 min-w-0 overflow-hidden">
              <Label>Template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger className="w-full truncate"><SelectValue placeholder="Select template" /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5 min-w-0">
              <Label>AI Provider</Label>
              <Select value={provider} onValueChange={(v) => {
                setProvider(v)
                const models = PROVIDER_MODELS[v] ?? []
                setModel(models[0] ?? '')
              }}>
                <SelectTrigger><SelectValue placeholder="Provider" /></SelectTrigger>
                <SelectContent>
                  {[...(settings?.configuredProviders ?? []), 'lmstudio' as const]
                    .filter((p, i, a) => a.indexOf(p) === i)
                    .map((p) => (
                      <SelectItem key={p} value={p}>{PROVIDER_LABELS[p] ?? p}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5 min-w-0">
              <Label>Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                <SelectContent>
                  {(PROVIDER_MODELS[provider] ?? (model ? [model] : [])).map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Schedule</Label>
              <Select value={String(scheduleMinutes)} onValueChange={(v) => setScheduleMinutes(parseInt(v, 10))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCHEDULE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Min score (optional)</Label>
              <Input
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                placeholder="e.g. 7"
                type="number"
                min={1}
                max={10}
              />
              <p className="text-xs text-muted-foreground">Jobs below this score are skipped</p>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Companies to scan</Label>
            <div className="border border-border rounded-md divide-y divide-border max-h-40 overflow-y-auto">
              <label className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent/30 text-sm">
                <input
                  type="checkbox"
                  checked={companyIds === 'all'}
                  onChange={() => setCompanyIds(companyIds === 'all' ? [] : 'all')}
                />
                <span className="font-medium">All companies</span>
              </label>
              {companies.map((c) => (
                <label key={c.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent/30 text-sm">
                  <input
                    type="checkbox"
                    checked={isCompanySelected(c.id)}
                    onChange={() => companyToggle(c.id)}
                    disabled={companyIds === 'all'}
                  />
                  {c.name}
                  <span className="text-xs text-muted-foreground ml-auto">{c.source}</span>
                </label>
              ))}
              {companies.length === 0 && (
                <p className="text-xs text-muted-foreground px-3 py-2">No companies tracked yet</p>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Enabled (runs on schedule)
          </label>

          <div className="flex justify-end gap-2 mt-1">
            <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button onClick={handleSave} disabled={busy || !canSave}>
              {busy ? 'Saving…' : 'Save pipeline'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Resume Viewer Dialog ─────────────────────────────────────────────────────

function ResumeViewerDialog({
  job,
  onClose,
  onUseInGenerator
}: {
  job: ScoredJob
  onClose: () => void
  onUseInGenerator: (job: ScoredJob) => void
}) {
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{job.jobTitle} @ {job.jobCompany}</DialogTitle>
          <DialogDescription>Generated resume — score {job.score}/10</DialogDescription>
        </DialogHeader>
        <pre className="flex-1 overflow-y-auto text-xs font-mono whitespace-pre-wrap bg-muted/40 rounded-md p-3 border border-border">
          {job.resumeMarkdown}
        </pre>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => { onUseInGenerator(job); onClose() }}>
            <Wand2 size={14} className="mr-1.5" />
            Open in Generator
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Scored Job Row ───────────────────────────────────────────────────────────

function ScoredJobRow({
  job,
  selected,
  onToggle,
  generating,
  onViewResume
}: {
  job: ScoredJob
  selected: boolean
  onToggle: () => void
  generating: boolean
  onViewResume: (job: ScoredJob) => void
}) {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 border-b border-border last:border-0 hover:bg-accent/20">
      <button onClick={onToggle} className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-foreground">
        {selected ? <CheckSquare size={15} /> : <Square size={15} />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded ${scoreColor(job.score)}`}
          >
            {job.score}/10
          </span>
          <span className="text-sm font-medium truncate">{job.jobTitle}</span>
          {job.jobRemote && <Badge variant="secondary" className="text-[10px] py-0">Remote</Badge>}
          {job.resumeMarkdown && (
            <Badge variant="outline" className="text-[10px] py-0 text-green-700 border-green-300">
              Resume ready
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-foreground/80">{job.jobCompany}</span>
          {job.jobLocation && <span>· {job.jobLocation}</span>}
          <span>· {timeAgo(job.scoredAt)}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 italic line-clamp-1">{job.scoreReason}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {job.resumeMarkdown && (
          <Button variant="ghost" size="sm" onClick={() => onViewResume(job)} title="View resume">
            <Wand2 size={13} />
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => window.api.shellOpenExternal(job.jobApplyUrl)}>
          <ExternalLink size={13} />
        </Button>
        {generating && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
      </div>
    </div>
  )
}

// ─── Pipeline Card ────────────────────────────────────────────────────────────

function PipelineCard({
  pipeline,
  onEdit,
  onDelete
}: {
  pipeline: Pipeline
  onEdit: (p: Pipeline) => void
  onDelete: (id: string) => void
}) {
  const { runs, scoredJobs, activeRuns, generatingIds, runNow, generateResumes } = usePipelineStore()
  const navigate = useNavigate()
  const setJobDescription = useGeneratorStore((s) => s.setJobDescription)

  const [expanded, setExpanded] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [viewingJob, setViewingJob] = useState<ScoredJob | null>(null)
  const [minScoreFilter, setMinScoreFilter] = useState<string>('all')

  const pipelineRuns = useMemo(
    () => runs.filter((r) => r.pipelineId === pipeline.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [runs, pipeline.id]
  )

  const pipelineScoredJobs = useMemo(
    () => scoredJobs
      .filter((j) => j.pipelineId === pipeline.id)
      .sort((a, b) => b.score - a.score),
    [scoredJobs, pipeline.id]
  )

  const filteredJobs = useMemo(() => {
    if (minScoreFilter === 'all') return pipelineScoredJobs
    const min = parseInt(minScoreFilter, 10)
    return pipelineScoredJobs.filter((j) => j.score >= min)
  }, [pipelineScoredJobs, minScoreFilter])

  const activeRun = activeRuns[pipeline.id]
  const isRunning = !!activeRun

  const toggleJob = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleAll = () => {
    if (selectedIds.size === filteredJobs.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredJobs.map((j) => j.id)))
    }
  }

  const handleGenerate = async () => {
    const ids = [...selectedIds]
    if (!ids.length) return
    await generateResumes(pipeline.id, ids)
    setSelectedIds(new Set())
  }

  const handleUseInGenerator = (job: ScoredJob) => {
    const text = `${job.jobTitle} @ ${job.jobCompany}\n${job.jobLocation}\n${job.jobApplyUrl}\n\n${job.resumeMarkdown ?? ''}`
    setJobDescription(text)
    navigate('/generate')
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card">
        <button onClick={() => setExpanded((e) => !e)} className="text-muted-foreground hover:text-foreground">
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{pipeline.name}</span>
            <Badge variant={pipeline.enabled ? 'default' : 'secondary'} className="text-[10px] py-0">
              {pipeline.enabled ? 'Active' : 'Paused'}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock size={10} /> {scheduleLabel(pipeline.scheduleMinutes)}
            </span>
            {pipeline.minScore != null && (
              <span className="text-xs text-muted-foreground">min score {pipeline.minScore}</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 flex gap-3">
            <span>{pipelineScoredJobs.length} scored jobs</span>
            <span>{pipelineRuns.length} runs</span>
            {pipeline.lastRunAt && <span>last run {timeAgo(pipeline.lastRunAt)}</span>}
          </div>
        </div>

        {isRunning && (
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" />
            {activeRun.phase === 'scanning'
              ? `Scanning ${activeRun.current}/${activeRun.total}`
              : `Scoring ${activeRun.current}/${activeRun.total}`}
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => runNow(pipeline.id)} disabled={isRunning} title="Run now">
            <Play size={13} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(pipeline)} title="Edit">
            <GitBranch size={13} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(pipeline.id)} title="Delete"
            className="text-muted-foreground hover:text-red-500">
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border">
          {/* Run history */}
          {pipelineRuns.length > 0 && (
            <div className="px-4 py-2 border-b border-border">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Run history</p>
              <div className="space-y-1">
                {pipelineRuns.slice(0, 5).map((run) => (
                  <div key={run.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    {run.status === 'completed' && <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />}
                    {run.status === 'error' && <AlertCircle size={10} className="text-red-500 flex-shrink-0" />}
                    {run.status === 'running' && <Loader2 size={10} className="animate-spin flex-shrink-0" />}
                    <span>{timeAgo(run.startedAt)}</span>
                    <span>·</span>
                    <span>{run.jobsScanned} scanned</span>
                    <span>·</span>
                    <span>{run.jobsScored} scored</span>
                    {run.error && <span className="text-red-500 truncate">· {run.error}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scored jobs */}
          <div>
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex-1">
                Scored jobs ({filteredJobs.length})
              </p>
              <Select value={minScoreFilter} onValueChange={setMinScoreFilter}>
                <SelectTrigger className="h-6 text-xs w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All scores</SelectItem>
                  {[8, 7, 6, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>Score ≥ {n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filteredJobs.length > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={toggleAll}>
                  {selectedIds.size === filteredJobs.length ? 'Deselect all' : 'Select all'}
                </Button>
              )}
              {selectedIds.size > 0 && (
                <Button
                  size="sm"
                  className="h-6 text-xs"
                  onClick={handleGenerate}
                  disabled={[...selectedIds].some((id) => generatingIds.has(id))}
                >
                  <Wand2 size={11} className="mr-1" />
                  Generate {selectedIds.size} resume{selectedIds.size !== 1 ? 's' : ''}
                </Button>
              )}
            </div>

            {filteredJobs.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-6">
                {pipelineScoredJobs.length === 0
                  ? 'No scored jobs yet — run the pipeline to start.'
                  : 'No jobs match the score filter.'}
              </div>
            ) : (
              <div>
                {filteredJobs.map((job) => (
                  <ScoredJobRow
                    key={job.id}
                    job={job}
                    selected={selectedIds.has(job.id)}
                    onToggle={() => toggleJob(job.id)}
                    generating={generatingIds.has(job.id)}
                    onViewResume={setViewingJob}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {viewingJob && (
        <ResumeViewerDialog
          job={viewingJob}
          onClose={() => setViewingJob(null)}
          onUseInGenerator={handleUseInGenerator}
        />
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const { pipelines, load, deletePipeline, _onRunStarted, _onRunProgress, _onRunCompleted, _onRunError } = usePipelineStore()
  const { load: loadJobs } = useJobsStore()
  const { load: loadProfiles } = useProfilesStore()
  const { load: loadTemplates } = useTemplatesStore()
  const { load: loadSettings } = useSettingsStore()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Pipeline | null>(null)

  useEffect(() => {
    load()
    loadJobs()
    loadProfiles()
    loadTemplates()
    loadSettings()
  }, [load, loadJobs, loadProfiles, loadTemplates, loadSettings])

  // Subscribe to pipeline run events from main process
  useEffect(() => {
    const u1 = window.api.onPipelineRunStarted(({ pipelineId, runId }) => _onRunStarted(pipelineId, runId))
    const u2 = window.api.onPipelineRunProgress((p) => _onRunProgress(p))
    const u3 = window.api.onPipelineRunCompleted(({ pipelineId, runId, scoredJobs }) => _onRunCompleted(pipelineId, runId, scoredJobs))
    const u4 = window.api.onPipelineRunError(({ pipelineId, runId, error }) => _onRunError(pipelineId, runId, error))
    return () => { u1(); u2(); u3(); u4() }
  }, [_onRunStarted, _onRunProgress, _onRunCompleted, _onRunError])

  const openNew = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (p: Pipeline) => { setEditing(p); setFormOpen(true) }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold">Pipeline</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Automatically scan companies, score jobs against your profile, and generate resumes for top matches.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus size={14} className="mr-1.5" />
          New pipeline
        </Button>
      </div>

      {pipelines.length === 0 ? (
        <div className="border border-dashed border-border rounded-md p-10 text-center">
          <GitBranch size={28} className="mx-auto text-muted-foreground/60" />
          <p className="text-sm mt-3 font-medium">No pipelines yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Create a pipeline to automatically scan your tracked companies, score jobs against your profile, and prepare resumes for the best matches.
          </p>
          <Button className="mt-4" onClick={openNew}>
            <Plus size={14} className="mr-1.5" />
            Create your first pipeline
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {pipelines.map((p) => (
            <PipelineCard
              key={p.id}
              pipeline={p}
              onEdit={openEdit}
              onDelete={deletePipeline}
            />
          ))}
        </div>
      )}

      <PipelineFormDialog
        open={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
      />
    </div>
  )
}

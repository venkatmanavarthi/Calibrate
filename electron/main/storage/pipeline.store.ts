import { getDb } from './db'
import type { Pipeline, PipelineRun, ScoredJob } from '../../../src/types/models'
import type { ResumeDocument } from '../../../src/types/resume-document'

type PipelineRow = {
  id: string
  name: string
  profileId: string
  templateId: string
  provider: string
  model: string
  companyIds: string
  scheduleMinutes: number
  minScore: number | null
  enabled: number
  autoApply: number
  autoApplyMinScore: number | null
  createdAt: string
  updatedAt: string
  lastRunAt: string | null
}

type RunRow = {
  id: string
  pipelineId: string
  startedAt: string
  completedAt: string | null
  status: string
  jobsScanned: number
  jobsScored: number
  error: string | null
}

type ScoredJobRow = {
  id: string
  pipelineId: string
  runId: string
  jobId: string
  jobTitle: string
  jobCompany: string
  jobLocation: string
  jobRemote: number
  jobApplyUrl: string
  jobSource: string
  jobDescriptionHtml: string
  score: number
  scoreReason: string
  scoredAt: string
  resumeDocument: string | null
  resumeGeneratedAt: string | null
}

function rowToPipeline(row: PipelineRow): Pipeline {
  return {
    id: row.id,
    name: row.name,
    profileId: row.profileId,
    provider: row.provider as Pipeline['provider'],
    model: row.model,
    companyIds: JSON.parse(row.companyIds) as string[] | 'all',
    scheduleMinutes: row.scheduleMinutes,
    minScore: row.minScore ?? undefined,
    enabled: row.enabled === 1,
    autoApply: row.autoApply === 1,
    autoApplyMinScore: row.autoApplyMinScore ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastRunAt: row.lastRunAt ?? undefined
  }
}

function rowToRun(row: RunRow): PipelineRun {
  return {
    ...row,
    status: row.status as PipelineRun['status'],
    completedAt: row.completedAt ?? undefined,
    error: row.error ?? undefined
  }
}

function rowToScoredJob(row: ScoredJobRow): ScoredJob {
  return {
    ...row,
    jobSource: row.jobSource as ScoredJob['jobSource'],
    jobRemote: row.jobRemote === 1,
    resumeDocument: row.resumeDocument ? JSON.parse(row.resumeDocument) as ResumeDocument : undefined,
    resumeGeneratedAt: row.resumeGeneratedAt ?? undefined
  }
}

// ─── Pipelines ───────────────────────────────────────────────────────────────

export async function listPipelines(): Promise<Pipeline[]> {
  const rows = getDb()
    .prepare('SELECT * FROM pipelines ORDER BY createdAt ASC')
    .all() as PipelineRow[]
  return rows.map(rowToPipeline)
}

export async function savePipeline(pipeline: Pipeline): Promise<void> {
  getDb()
    .prepare(`
      INSERT INTO pipelines
        (id, name, profileId, templateId, provider, model, companyIds, scheduleMinutes,
         minScore, enabled, autoApply, autoApplyMinScore, createdAt, updatedAt, lastRunAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name              = excluded.name,
        profileId         = excluded.profileId,
        templateId        = excluded.templateId,
        provider          = excluded.provider,
        model             = excluded.model,
        companyIds        = excluded.companyIds,
        scheduleMinutes   = excluded.scheduleMinutes,
        minScore          = excluded.minScore,
        enabled           = excluded.enabled,
        autoApply         = excluded.autoApply,
        autoApplyMinScore = excluded.autoApplyMinScore,
        updatedAt         = excluded.updatedAt,
        lastRunAt         = excluded.lastRunAt
    `)
    .run(
      pipeline.id, pipeline.name, pipeline.profileId, '',
      pipeline.provider, pipeline.model, JSON.stringify(pipeline.companyIds),
      pipeline.scheduleMinutes, pipeline.minScore ?? null,
      pipeline.enabled ? 1 : 0,
      pipeline.autoApply ? 1 : 0,
      pipeline.autoApplyMinScore ?? null,
      pipeline.createdAt, pipeline.updatedAt, pipeline.lastRunAt ?? null
    )
}

export async function deletePipeline(id: string): Promise<void> {
  const db = getDb()
  db.transaction(() => {
    db.prepare('DELETE FROM scored_jobs WHERE pipelineId = ?').run(id)
    db.prepare('DELETE FROM pipeline_runs WHERE pipelineId = ?').run(id)
    db.prepare('DELETE FROM pipelines WHERE id = ?').run(id)
  })()
}

export async function updatePipelineLastRun(id: string, lastRunAt: string): Promise<void> {
  getDb()
    .prepare('UPDATE pipelines SET lastRunAt = ? WHERE id = ?')
    .run(lastRunAt, id)
}

// ─── Runs ─────────────────────────────────────────────────────────────────────

export async function listRuns(): Promise<PipelineRun[]> {
  const rows = getDb()
    .prepare('SELECT * FROM pipeline_runs ORDER BY startedAt DESC')
    .all() as RunRow[]
  return rows.map(rowToRun)
}

export async function saveRun(run: PipelineRun): Promise<void> {
  getDb()
    .prepare(`
      INSERT INTO pipeline_runs
        (id, pipelineId, startedAt, completedAt, status, jobsScanned, jobsScored, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        completedAt = excluded.completedAt,
        status      = excluded.status,
        jobsScanned = excluded.jobsScanned,
        jobsScored  = excluded.jobsScored,
        error       = excluded.error
    `)
    .run(
      run.id, run.pipelineId, run.startedAt,
      run.completedAt ?? null, run.status,
      run.jobsScanned, run.jobsScored, run.error ?? null
    )
}

// ─── Scored jobs ──────────────────────────────────────────────────────────────

export async function listScoredJobs(): Promise<ScoredJob[]> {
  const rows = getDb()
    .prepare('SELECT * FROM scored_jobs ORDER BY scoredAt DESC')
    .all() as ScoredJobRow[]
  return rows.map(rowToScoredJob)
}

export async function saveScoredJob(job: ScoredJob): Promise<void> {
  getDb()
    .prepare(`
      INSERT INTO scored_jobs
        (id, pipelineId, runId, jobId, jobTitle, jobCompany, jobLocation, jobRemote,
         jobApplyUrl, jobSource, jobDescriptionHtml, score, scoreReason, scoredAt,
         resumeDocument, resumeGeneratedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        score             = excluded.score,
        scoreReason       = excluded.scoreReason,
        resumeDocument    = excluded.resumeDocument,
        resumeGeneratedAt = excluded.resumeGeneratedAt
    `)
    .run(
      job.id, job.pipelineId, job.runId, job.jobId,
      job.jobTitle, job.jobCompany, job.jobLocation, job.jobRemote ? 1 : 0,
      job.jobApplyUrl, job.jobSource, job.jobDescriptionHtml,
      job.score, job.scoreReason, job.scoredAt,
      job.resumeDocument ? JSON.stringify(job.resumeDocument) : null, job.resumeGeneratedAt ?? null
    )
}

export async function saveScoredJobs(jobs: ScoredJob[]): Promise<void> {
  if (jobs.length === 0) return
  const db = getDb()
  const upsert = db.prepare(`
    INSERT INTO scored_jobs
      (id, pipelineId, runId, jobId, jobTitle, jobCompany, jobLocation, jobRemote,
       jobApplyUrl, jobSource, jobDescriptionHtml, score, scoreReason, scoredAt,
       resumeDocument, resumeGeneratedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      score             = excluded.score,
      scoreReason       = excluded.scoreReason,
      resumeDocument    = excluded.resumeDocument,
      resumeGeneratedAt = excluded.resumeGeneratedAt
  `)
  db.transaction(() => {
    for (const job of jobs) {
      upsert.run(
        job.id, job.pipelineId, job.runId, job.jobId,
        job.jobTitle, job.jobCompany, job.jobLocation, job.jobRemote ? 1 : 0,
        job.jobApplyUrl, job.jobSource, job.jobDescriptionHtml,
        job.score, job.scoreReason, job.scoredAt,
        job.resumeDocument ? JSON.stringify(job.resumeDocument) : null, job.resumeGeneratedAt ?? null
      )
    }
  })()
}

export async function isJobAlreadyScored(jobId: string): Promise<boolean> {
  const row = getDb()
    .prepare('SELECT 1 FROM scored_jobs WHERE jobId = ? LIMIT 1')
    .get(jobId)
  return row !== undefined
}

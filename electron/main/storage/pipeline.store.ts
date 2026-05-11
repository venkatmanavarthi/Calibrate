import fs from 'fs/promises'
import { PIPELINES_FILE, PIPELINE_RUNS_FILE, PIPELINE_SCORED_JOBS_FILE } from './index'
import type { Pipeline, PipelineRun, ScoredJob } from '../../../src/types/models'

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf-8')
}

// ─── Pipelines ───────────────────────────────────────────────────────────────

export async function listPipelines(): Promise<Pipeline[]> {
  return readJson<Pipeline[]>(PIPELINES_FILE, [])
}

export async function savePipeline(pipeline: Pipeline): Promise<void> {
  const all = await listPipelines()
  const next = all.filter((p) => p.id !== pipeline.id).concat(pipeline)
  await writeJson(PIPELINES_FILE, next)
}

export async function deletePipeline(id: string): Promise<void> {
  const all = await listPipelines()
  await writeJson(PIPELINES_FILE, all.filter((p) => p.id !== id))
  // Cascade delete runs and scored jobs
  const runs = await listRuns()
  const runIds = new Set(runs.filter((r) => r.pipelineId === id).map((r) => r.id))
  await writeJson(PIPELINE_RUNS_FILE, runs.filter((r) => r.pipelineId !== id))
  const jobs = await listScoredJobs()
  await writeJson(PIPELINE_SCORED_JOBS_FILE, jobs.filter((j) => !runIds.has(j.runId) && j.pipelineId !== id))
}

export async function updatePipelineLastRun(id: string, lastRunAt: string): Promise<void> {
  const all = await listPipelines()
  await writeJson(PIPELINES_FILE, all.map((p) => p.id === id ? { ...p, lastRunAt } : p))
}

// ─── Runs ─────────────────────────────────────────────────────────────────────

export async function listRuns(): Promise<PipelineRun[]> {
  return readJson<PipelineRun[]>(PIPELINE_RUNS_FILE, [])
}

export async function saveRun(run: PipelineRun): Promise<void> {
  const all = await listRuns()
  const next = all.filter((r) => r.id !== run.id).concat(run)
  await writeJson(PIPELINE_RUNS_FILE, next)
}

// ─── Scored jobs ──────────────────────────────────────────────────────────────

export async function listScoredJobs(): Promise<ScoredJob[]> {
  return readJson<ScoredJob[]>(PIPELINE_SCORED_JOBS_FILE, [])
}

export async function saveScoredJob(job: ScoredJob): Promise<void> {
  const all = await listScoredJobs()
  const next = all.filter((j) => j.id !== job.id).concat(job)
  await writeJson(PIPELINE_SCORED_JOBS_FILE, next)
}

export async function saveScoredJobs(jobs: ScoredJob[]): Promise<void> {
  const all = await listScoredJobs()
  const incoming = new Map(jobs.map((j) => [j.id, j]))
  const merged = all.map((j) => incoming.get(j.id) ?? j)
  const newIds = new Set(all.map((j) => j.id))
  for (const job of jobs) {
    if (!newIds.has(job.id)) merged.push(job)
  }
  await writeJson(PIPELINE_SCORED_JOBS_FILE, merged)
}

/** Returns true if this job has already been scored by any pipeline */
export async function isJobAlreadyScored(jobId: string): Promise<boolean> {
  const all = await listScoredJobs()
  return all.some((j) => j.jobId === jobId)
}

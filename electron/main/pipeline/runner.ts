import { Notification } from 'electron'
import type { BrowserWindow } from 'electron'
import { buildProvider } from '../ai/index'
import { loadSettings } from '../storage/settings.store'
import { getProfile } from '../storage/profiles.store'
import { getTemplate } from '../storage/templates.store'
import { listCompanies, listJobs } from '../storage/jobs.store'
import {
  saveRun,
  saveScoredJobs,
  isJobAlreadyScored,
  updatePipelineLastRun
} from '../storage/pipeline.store'
import { scoreJob } from './scorer'
import { buildGenerationMessages } from '../ai/prompts/generate'
import type { Pipeline, PipelineRun, ScoredJob } from '../../../src/types/models'
import { generateId } from './utils'

function nowIso(): string {
  return new Date().toISOString()
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function runPipeline(pipeline: Pipeline, win: BrowserWindow): Promise<void> {
  const runId = generateId()
  const run: PipelineRun = {
    id: runId,
    pipelineId: pipeline.id,
    startedAt: nowIso(),
    status: 'running',
    jobsScanned: 0,
    jobsScored: 0
  }
  await saveRun(run)
  win.webContents.send('pipeline:runStarted', { pipelineId: pipeline.id, runId })

  try {
    const settings = await loadSettings()
    const profile = await getProfile(pipeline.profileId)
    if (!profile) throw new Error(`Profile ${pipeline.profileId} not found`)

    const provider = await buildProvider(pipeline.provider, settings)

    // Determine which companies to scan
    const allCompanies = await listCompanies()
    const companies =
      pipeline.companyIds === 'all'
        ? allCompanies
        : allCompanies.filter((c) => (pipeline.companyIds as string[]).includes(c.id))

    // Get all cached jobs for those companies
    const allJobs = await listJobs()
    const companyIds = new Set(companies.map((c) => c.id))
    const jobs = allJobs.filter((j) => companyIds.has(j.companyId))

    run.jobsScanned = jobs.length
    win.webContents.send('pipeline:runProgress', {
      pipelineId: pipeline.id,
      runId,
      phase: 'scanning',
      current: jobs.length,
      total: jobs.length
    })

    // Score jobs that haven't been scored yet for this pipeline
    const newScoredJobs: ScoredJob[] = []

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i]
      win.webContents.send('pipeline:runProgress', {
        pipelineId: pipeline.id,
        runId,
        phase: 'scoring',
        current: i + 1,
        total: jobs.length
      })

      const alreadyScored = await isJobAlreadyScored(pipeline.id, job.id)
      if (alreadyScored) continue

      try {
        const result = await scoreJob(provider, pipeline.model, profile, job)

        // Skip below threshold if one is set
        if (pipeline.minScore != null && result.score < pipeline.minScore) continue

        const scored: ScoredJob = {
          id: generateId(),
          pipelineId: pipeline.id,
          runId,
          jobId: job.id,
          jobTitle: job.title,
          jobCompany: job.company,
          jobLocation: job.location,
          jobRemote: job.remote,
          jobApplyUrl: job.applyUrl,
          jobSource: job.source,
          jobDescriptionHtml: job.descriptionHtml,
          score: result.score,
          scoreReason: result.reason,
          scoredAt: nowIso()
        }
        newScoredJobs.push(scored)

        // Fire macOS notification for high-scoring jobs (≥ threshold or ≥ 8 if no threshold)
        const notifyThreshold = pipeline.minScore ?? 8
        if (result.score >= notifyThreshold && Notification.isSupported()) {
          new Notification({
            title: `Pipeline: ${pipeline.name}`,
            body: `${job.title} @ ${job.company} scored ${result.score}/10`
          }).show()
        }
      } catch {
        // Skip jobs that fail to score — don't abort the whole run
      }
    }

    await saveScoredJobs(newScoredJobs)

    run.status = 'completed'
    run.completedAt = nowIso()
    run.jobsScored = newScoredJobs.length
    await saveRun(run)
    await updatePipelineLastRun(pipeline.id, run.completedAt)

    win.webContents.send('pipeline:runCompleted', {
      pipelineId: pipeline.id,
      runId,
      scoredJobs: newScoredJobs
    })
  } catch (err) {
    run.status = 'error'
    run.completedAt = nowIso()
    run.error = (err as Error).message
    await saveRun(run)

    win.webContents.send('pipeline:runError', {
      pipelineId: pipeline.id,
      runId,
      error: run.error
    })
  }
}

export async function generateResumeForScoredJob(
  scoredJob: ScoredJob,
  pipeline: Pipeline
): Promise<string> {
  const settings = await loadSettings()
  const profile = await getProfile(pipeline.profileId)
  const template = await getTemplate(pipeline.templateId)
  if (!profile) throw new Error(`Profile ${pipeline.profileId} not found`)
  if (!template) throw new Error(`Template ${pipeline.templateId} not found`)

  const provider = await buildProvider(pipeline.provider, settings)
  const jobDescription = `${scoredJob.jobTitle} @ ${scoredJob.jobCompany}\n${scoredJob.jobLocation}\n${scoredJob.jobApplyUrl}\n\n${stripHtml(scoredJob.jobDescriptionHtml)}`

  const messages = buildGenerationMessages(
    profile,
    template.markdownContent,
    jobDescription,
    settings.customPrompts?.generation
  )

  const raw = await provider.generate(
    messages,
    { model: pipeline.model, temperature: 0.2 },
    () => {}
  )

  // Strip code fences if present
  return raw.replace(/^```\w*\r?\n?/, '').replace(/\r?\n?```\s*$/, '').trim()
}

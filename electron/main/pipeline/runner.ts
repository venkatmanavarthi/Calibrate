import { Notification } from 'electron'
import type { BrowserWindow } from 'electron'
import { buildProvider } from '../ai/index'
import { loadSettings } from '../storage/settings.store'
import { getProfile } from '../storage/profiles.store'
import { listCompanies, listJobs } from '../storage/jobs.store'
import {
  saveRun,
  saveScoredJob,
  saveScoredJobs,
  isJobAlreadyScored,
  updatePipelineLastRun
} from '../storage/pipeline.store'
import { startChromeApply } from '../chrome-apply/index'
import { scoreJob } from './scorer'
import { buildGenerationMessages } from '../ai/prompts/generate'
import { buildProfileResumeDocument, normalizeResumeDocument, parseResumeDocument, stripCodeFences } from '../ai/resume-document'
import type { Pipeline, PipelineRun, ScoredJob } from '../../../src/types/models'
import type { ResumeDocument } from '../../../src/types/resume-document'
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

      const alreadyScored = await isJobAlreadyScored(job.id)
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

    // Auto-apply: if enabled, generate resume then submit for each qualifying scored job
    if (pipeline.autoApply && newScoredJobs.length > 0) {
      const applyThreshold = pipeline.autoApplyMinScore ?? pipeline.minScore ?? 7
      const toApply = newScoredJobs.filter((j) => j.score >= applyThreshold)
      for (const job of toApply) {
        try {
          // Generate resume first
          const resumeDocument = await generateResumeForScoredJob(job, pipeline)
          const withResume: ScoredJob = {
            ...job,
            resumeDocument,
            resumeGeneratedAt: nowIso()
          }
          await saveScoredJob(withResume)
          // Submit application
          await startChromeApply({ scoredJobId: job.id }, win)
        } catch {
          // Non-fatal — log and continue to next job
        }
      }
    }

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
    await updatePipelineLastRun(pipeline.id, run.completedAt)

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
): Promise<ResumeDocument> {
  const settings = await loadSettings()
  const profile = await getProfile(pipeline.profileId)
  if (!profile) throw new Error(`Profile ${pipeline.profileId} not found`)

  const provider = await buildProvider(pipeline.provider, settings)
  const jobDescription = `${scoredJob.jobTitle} @ ${scoredJob.jobCompany}\n${scoredJob.jobLocation}\n${scoredJob.jobApplyUrl}\n\n${stripHtml(scoredJob.jobDescriptionHtml)}`

  const messages = buildGenerationMessages(
    profile,
    jobDescription,
    settings.customPrompts?.generation
  )

  const raw = await provider.generate(
    messages,
    { model: pipeline.model, temperature: 0.2 },
    () => {}
  )

  const cleaned = stripCodeFences(raw)
  try {
    return normalizeResumeDocument(parseResumeDocument(cleaned), profile)
  } catch {
    return buildProfileResumeDocument(profile)
  }
}

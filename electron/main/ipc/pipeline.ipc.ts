import { ipcMain, BrowserWindow } from 'electron'
import {
  listPipelines,
  savePipeline,
  deletePipeline,
  listRuns,
  listScoredJobs,
  saveScoredJob
} from '../storage/pipeline.store'
import { triggerPipelineRun, startScheduler } from '../pipeline/scheduler'
import { generateResumeForScoredJob } from '../pipeline/runner'
import type { Pipeline, ScoredJob } from '../../../src/types/models'

export function registerPipelineIpc(win: BrowserWindow): void {
  startScheduler(win)

  ipcMain.handle('pipeline:list', () => listPipelines())

  ipcMain.handle('pipeline:save', async (_, pipeline: Pipeline) => {
    await savePipeline(pipeline)
    return { ok: true as const }
  })

  ipcMain.handle('pipeline:delete', async (_, id: string) => {
    await deletePipeline(id)
    return { ok: true as const }
  })

  ipcMain.handle('pipeline:listRuns', () => listRuns())

  ipcMain.handle('pipeline:listScoredJobs', () => listScoredJobs())

  ipcMain.handle('pipeline:runNow', async (_, id: string) => {
    await triggerPipelineRun(id, win)
    return { ok: true as const }
  })

  ipcMain.handle(
    'pipeline:generateResumes',
    async (_, pipelineId: string, scoredJobIds: string[]): Promise<ScoredJob[]> => {
      const pipelines = await listPipelines()
      const pipeline = pipelines.find((p) => p.id === pipelineId)
      if (!pipeline) throw new Error(`Pipeline ${pipelineId} not found`)

      const allScored = await listScoredJobs()
      const targets = allScored.filter((j) => scoredJobIds.includes(j.id))
      const updated: ScoredJob[] = []

      for (const job of targets) {
        const markdown = await generateResumeForScoredJob(job, pipeline)
        const updatedJob: ScoredJob = {
          ...job,
          resumeMarkdown: markdown,
          resumeGeneratedAt: new Date().toISOString()
        }
        await saveScoredJob(updatedJob)
        updated.push(updatedJob)
      }

      return updated
    }
  )
}

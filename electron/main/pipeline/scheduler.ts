import type { BrowserWindow } from 'electron'
import { listPipelines } from '../storage/pipeline.store'
import { runPipeline } from './runner'
import type { Pipeline } from '../../../src/types/models'

const TICK_INTERVAL_MS = 60_000 // check every minute
const runningPipelines = new Set<string>()

function isDue(pipeline: Pipeline): boolean {
  if (!pipeline.enabled) return false
  if (!pipeline.lastRunAt) return true
  const elapsed = Date.now() - new Date(pipeline.lastRunAt).getTime()
  return elapsed >= pipeline.scheduleMinutes * 60_000
}

async function tick(win: BrowserWindow): Promise<void> {
  let pipelines: Pipeline[]
  try {
    pipelines = await listPipelines()
  } catch {
    return
  }

  for (const pipeline of pipelines) {
    if (!isDue(pipeline)) continue
    if (runningPipelines.has(pipeline.id)) continue

    runningPipelines.add(pipeline.id)
    runPipeline(pipeline, win).finally(() => runningPipelines.delete(pipeline.id))
  }
}

let tickTimer: ReturnType<typeof setInterval> | null = null

export function startScheduler(win: BrowserWindow): void {
  // Check for missed runs immediately on startup
  tick(win)
  // Then check every minute
  tickTimer = setInterval(() => tick(win), TICK_INTERVAL_MS)
}

export function stopScheduler(): void {
  if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
}

/** Trigger a pipeline run outside the normal schedule (e.g. "Run now" button) */
export async function triggerPipelineRun(pipelineId: string, win: BrowserWindow): Promise<void> {
  if (runningPipelines.has(pipelineId)) return
  const pipelines = await listPipelines()
  const pipeline = pipelines.find((p) => p.id === pipelineId)
  if (!pipeline) throw new Error(`Pipeline ${pipelineId} not found`)
  runningPipelines.add(pipelineId)
  runPipeline(pipeline, win).finally(() => runningPipelines.delete(pipelineId))
}

import { create } from 'zustand'
import type { Pipeline, PipelineRun, ScoredJob } from '@/types/models'
import type { PipelineRunProgressPayload } from '@/types/ipc'

export interface RunProgress {
  pipelineId: string
  runId: string
  phase: 'scanning' | 'scoring'
  current: number
  total: number
}

interface PipelineState {
  pipelines: Pipeline[]
  runs: PipelineRun[]
  scoredJobs: ScoredJob[]
  /** jobs currently being generated (scoredJob id → true) */
  generatingIds: Set<string>
  /** active run progress keyed by pipelineId */
  activeRuns: Record<string, RunProgress>

  load: () => Promise<void>
  savePipeline: (p: Pipeline) => Promise<void>
  deletePipeline: (id: string) => Promise<void>
  runNow: (pipelineId: string) => Promise<void>
  generateResumes: (pipelineId: string, scoredJobIds: string[]) => Promise<void>

  // Called by event listeners (setup outside the store)
  _onRunStarted: (pipelineId: string, runId: string) => void
  _onRunProgress: (payload: PipelineRunProgressPayload) => void
  _onRunCompleted: (pipelineId: string, runId: string, newJobs: ScoredJob[]) => void
  _onRunError: (pipelineId: string, runId: string, error: string) => void
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  pipelines: [],
  runs: [],
  scoredJobs: [],
  generatingIds: new Set(),
  activeRuns: {},

  load: async () => {
    const [pipelines, runs, scoredJobs] = await Promise.all([
      window.api.pipelineList(),
      window.api.pipelineListRuns(),
      window.api.pipelineListScoredJobs()
    ])
    set({ pipelines, runs, scoredJobs })
  },

  savePipeline: async (p) => {
    await window.api.pipelineSave(p)
    const pipelines = await window.api.pipelineList()
    set({ pipelines })
  },

  deletePipeline: async (id) => {
    await window.api.pipelineDelete(id)
    set((s) => ({
      pipelines: s.pipelines.filter((p) => p.id !== id),
      runs: s.runs.filter((r) => r.pipelineId !== id),
      scoredJobs: s.scoredJobs.filter((j) => j.pipelineId !== id)
    }))
  },

  runNow: async (pipelineId) => {
    await window.api.pipelineRunNow(pipelineId)
  },

  generateResumes: async (pipelineId, scoredJobIds) => {
    set((s) => ({ generatingIds: new Set([...s.generatingIds, ...scoredJobIds]) }))
    try {
      const updated = await window.api.pipelineGenerateResumes(pipelineId, scoredJobIds)
      set((s) => {
        const map = new Map(updated.map((j) => [j.id, j]))
        return { scoredJobs: s.scoredJobs.map((j) => map.get(j.id) ?? j) }
      })
    } finally {
      set((s) => {
        const next = new Set(s.generatingIds)
        scoredJobIds.forEach((id) => next.delete(id))
        return { generatingIds: next }
      })
    }
  },

  _onRunStarted: (pipelineId, runId) => {
    set((s) => ({
      activeRuns: {
        ...s.activeRuns,
        [pipelineId]: { pipelineId, runId, phase: 'scanning', current: 0, total: 0 }
      }
    }))
  },

  _onRunProgress: (payload) => {
    set((s) => ({
      activeRuns: { ...s.activeRuns, [payload.pipelineId]: payload }
    }))
  },

  _onRunCompleted: (pipelineId, runId, newJobs) => {
    set((s) => {
      const { [pipelineId]: _removed, ...rest } = s.activeRuns
      return {
        activeRuns: rest,
        scoredJobs: [...s.scoredJobs, ...newJobs],
        runs: s.runs.map((r) =>
          r.id === runId ? { ...r, status: 'completed' as const, completedAt: new Date().toISOString() } : r
        )
      }
    })
    // Refresh runs list from main to get accurate counts
    window.api.pipelineListRuns().then((runs) => set({ runs }))
    window.api.pipelineList().then((pipelines) => set({ pipelines }))
  },

  _onRunError: (pipelineId, runId, error) => {
    set((s) => {
      const { [pipelineId]: _removed, ...rest } = s.activeRuns
      return {
        activeRuns: rest,
        runs: s.runs.map((r) =>
          r.id === runId ? { ...r, status: 'error' as const, error, completedAt: new Date().toISOString() } : r
        )
      }
    })
  }
}))

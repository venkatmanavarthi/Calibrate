import { create } from 'zustand'
import type { TrackedCompany, NormalizedJob, JobRefreshResult } from '@/types/models'

interface JobsState {
  companies: TrackedCompany[]
  jobs: NormalizedJob[]
  loaded: boolean
  loading: boolean
  refreshing: boolean
  lastRefresh: JobRefreshResult[] | null
  load: () => Promise<void>
  addCompany: (company: TrackedCompany) => Promise<void>
  removeCompany: (id: string) => Promise<void>
  refreshCompany: (id: string) => Promise<JobRefreshResult>
  refreshAll: () => Promise<void>
}

export const useJobsStore = create<JobsState>((set, get) => ({
  companies: [],
  jobs: [],
  loaded: false,
  loading: false,
  refreshing: false,
  lastRefresh: null,

  load: async () => {
    if (get().loaded) return
    set({ loading: true })
    const [companies, jobs] = await Promise.all([
      window.api.jobsListCompanies(),
      window.api.jobsListJobs()
    ])
    set({ companies, jobs, loaded: true, loading: false })
  },

  addCompany: async (company) => {
    await window.api.jobsSaveCompany(company)
    set({ loaded: false })
    await get().load()
  },

  removeCompany: async (id) => {
    await window.api.jobsDeleteCompany(id)
    set({ loaded: false })
    await get().load()
  },

  refreshCompany: async (id) => {
    set({ refreshing: true })
    const result = await window.api.jobsRefreshCompany(id)
    const jobs = await window.api.jobsListJobs()
    set({ jobs, loaded: true, refreshing: false, lastRefresh: [result] })
    return result
  },

  refreshAll: async () => {
    set({ refreshing: true })
    const lastRefresh = await window.api.jobsRefreshAll()
    const jobs = await window.api.jobsListJobs()
    set({ jobs, loaded: true, refreshing: false, lastRefresh })
  }
}))

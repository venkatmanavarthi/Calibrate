import { create } from 'zustand'
import type {
  ApplicationRecord,
  ApplicationDefaults,
  GmailConnection,
  ChromeApplyConnection,
  ApplyRun,
  ChromeApplyStartRequest
} from '@/types/models'

interface ApplicationsState {
  records: ApplicationRecord[]
  defaults: ApplicationDefaults | null
  gmail: GmailConnection | null
  chromeConnection: ChromeApplyConnection | null
  applyRuns: ApplyRun[]
  submittingIds: Set<string>

  load: () => Promise<void>
  loadDefaults: () => Promise<void>
  loadApplyRuns: () => Promise<void>
  checkChromeConnection: () => Promise<void>
  connectGmail: () => Promise<void>
  disconnectGmail: () => Promise<void>
  saveDefaults: (d: ApplicationDefaults) => Promise<void>
  submit: (scoredJobId: string) => Promise<ApplicationRecord>
  startChromeApply: (req: ChromeApplyStartRequest) => Promise<ApplyRun>
  submitBatch: (scoredJobIds: string[]) => Promise<void>
  remove: (id: string) => Promise<void>
  authenticateSession: (domain: string) => Promise<void>
  clearSession: (domain: string) => Promise<void>
}

export const useApplicationsStore = create<ApplicationsState>((set, get) => ({
  records: [],
  defaults: null,
  gmail: null,
  chromeConnection: null,
  applyRuns: [],
  submittingIds: new Set(),

  load: async () => {
    const records = await window.api.applicationsList()
    set({ records })
  },

  loadDefaults: async () => {
    const defaults = await window.api.applicationDefaultsGet()
    set({ defaults })
  },

  loadApplyRuns: async () => {
    const applyRuns = await window.api.chromeApplyListRuns()
    set({ applyRuns })
  },

  checkChromeConnection: async () => {
    const [chromeConnection, gmail] = await Promise.all([
      window.api.chromeApplyCheckConnection(),
      window.api.gmailStatus()
    ])
    set({ chromeConnection, gmail })
  },

  connectGmail: async () => {
    const gmail = await window.api.gmailConnect()
    set({ gmail })
  },

  disconnectGmail: async () => {
    await window.api.gmailDisconnect()
    const gmail = await window.api.gmailStatus()
    set({ gmail })
  },

  saveDefaults: async (d) => {
    await window.api.applicationDefaultsSave(d)
    set({ defaults: d })
  },

  submit: async (scoredJobId) => {
    set((s) => ({ submittingIds: new Set([...s.submittingIds, scoredJobId]) }))
    try {
      const record = await window.api.applicationSubmit(scoredJobId)
      set((s) => ({ records: [record, ...s.records.filter((r) => r.scoredJobId !== scoredJobId)] }))
      return record
    } finally {
      set((s) => {
        const next = new Set(s.submittingIds)
        next.delete(scoredJobId)
        return { submittingIds: next }
      })
    }
  },

  startChromeApply: async (req) => {
    const run = await window.api.chromeApplyStart(req)
    set((s) => ({ applyRuns: [run, ...s.applyRuns.filter((r) => r.id !== run.id)] }))
    return run
  },

  submitBatch: async (scoredJobIds) => {
    set((s) => ({ submittingIds: new Set([...s.submittingIds, ...scoredJobIds]) }))
    try {
      const results = await window.api.applicationSubmitBatch(scoredJobIds)
      set((s) => {
        const updated = [...s.records]
        for (const record of results) {
          const idx = updated.findIndex((r) => r.scoredJobId === record.scoredJobId)
          if (idx >= 0) updated[idx] = record
          else updated.unshift(record)
        }
        return { records: updated }
      })
    } finally {
      set((s) => {
        const next = new Set(s.submittingIds)
        for (const id of scoredJobIds) next.delete(id)
        return { submittingIds: next }
      })
    }
  },

  remove: async (id) => {
    await window.api.applicationsDelete(id)
    set((s) => ({ records: s.records.filter((r) => r.id !== id) }))
  },

  authenticateSession: (domain) => window.api.sessionAuthenticate(domain),

  clearSession: async (domain) => {
    await window.api.sessionClear(domain)
  }
}))

import { create } from 'zustand'
import type { AIProvider, HallucinationWarning } from '@/types/models'
import type { ResumeDocument } from '@/types/resume-document'

interface GeneratorState {
  selectedProfileId: string | null
  selectedTemplateId: string | null
  jobDescription: string
  activeProvider: AIProvider
  activeModel: string

  resumeDocument: ResumeDocument | null
  warnings: HallucinationWarning[]
  isGenerating: boolean
  currentRequestId: string | null

  viewMode: 'pdf' | 'structured'

  setProfile: (id: string) => void
  setTemplate: (id: string) => void
  setJobDescription: (jd: string) => void
  setProvider: (p: AIProvider) => void
  setModel: (m: string) => void
  setResumeDocument: (doc: ResumeDocument | null) => void
  setWarnings: (w: HallucinationWarning[]) => void
  setGenerating: (v: boolean, requestId?: string | null) => void
  setViewMode: (m: 'pdf' | 'structured') => void
  clearWarnings: () => void
}

export const useGeneratorStore = create<GeneratorState>((set) => ({
  selectedProfileId: null,
  selectedTemplateId: null,
  jobDescription: '',
  activeProvider: 'anthropic',
  activeModel: 'claude-sonnet-4-5',

  resumeDocument: null,
  warnings: [],
  isGenerating: false,
  currentRequestId: null,

  viewMode: 'pdf',

  setProfile: (id) => set({ selectedProfileId: id }),
  setTemplate: (id) => set({ selectedTemplateId: id }),
  setJobDescription: (jd) => set({ jobDescription: jd }),
  setProvider: (p) => set({ activeProvider: p }),
  setModel: (m) => set({ activeModel: m }),
  setResumeDocument: (doc) => set({ resumeDocument: doc }),
  setWarnings: (w) => set({ warnings: w }),
  setGenerating: (v, requestId = null) => set({ isGenerating: v, currentRequestId: requestId }),
  setViewMode: (m) => set({ viewMode: m }),
  clearWarnings: () => set({ warnings: [] }),
}))

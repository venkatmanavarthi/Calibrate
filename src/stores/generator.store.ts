import { create } from 'zustand'
import type { AIProvider, HallucinationWarning, ExperienceProfile } from '@/types/models'

interface GeneratorState {
  selectedProfileId: string | null
  selectedTemplateId: string | null
  jobDescription: string
  activeProvider: AIProvider
  activeModel: string

  generatedMarkdown: string
  warnings: HallucinationWarning[]
  isGenerating: boolean
  isRevising: boolean
  currentRequestId: string | null

  selectionFrom: number
  selectionTo: number
  revisionInstruction: string

  viewMode: 'edit' | 'preview'

  setProfile: (id: string) => void
  setTemplate: (id: string) => void
  setJobDescription: (jd: string) => void
  setProvider: (p: AIProvider) => void
  setModel: (m: string) => void
  setGeneratedMarkdown: (md: string) => void
  appendChunk: (delta: string) => void
  setWarnings: (w: HallucinationWarning[]) => void
  setGenerating: (v: boolean, requestId?: string | null) => void
  setRevising: (v: boolean) => void
  setSelection: (from: number, to: number) => void
  setRevisionInstruction: (s: string) => void
  setViewMode: (m: 'edit' | 'preview') => void
  clearWarnings: () => void

  // Section revision: replace [from, to) in generatedMarkdown
  applyRevision: (from: number, to: number, newText: string) => void

  // Build profileSubset from selection context
  getProfileSubset: (profile: ExperienceProfile) => Partial<ExperienceProfile>
}

export const useGeneratorStore = create<GeneratorState>((set, get) => ({
  selectedProfileId: null,
  selectedTemplateId: null,
  jobDescription: '',
  activeProvider: 'anthropic',
  activeModel: 'claude-sonnet-4-5',

  generatedMarkdown: '',
  warnings: [],
  isGenerating: false,
  isRevising: false,
  currentRequestId: null,

  selectionFrom: 0,
  selectionTo: 0,
  revisionInstruction: '',

  viewMode: 'edit',

  setProfile: (id) => set({ selectedProfileId: id }),
  setTemplate: (id) => set({ selectedTemplateId: id }),
  setJobDescription: (jd) => set({ jobDescription: jd }),
  setProvider: (p) => set({ activeProvider: p }),
  setModel: (m) => set({ activeModel: m }),
  setGeneratedMarkdown: (md) => set({ generatedMarkdown: md }),
  appendChunk: (delta) => set((s) => ({ generatedMarkdown: s.generatedMarkdown + delta })),
  setWarnings: (w) => set({ warnings: w }),
  setGenerating: (v, requestId = null) => set({ isGenerating: v, currentRequestId: requestId }),
  setRevising: (v) => set({ isRevising: v }),
  setSelection: (from, to) => set({ selectionFrom: from, selectionTo: to }),
  setRevisionInstruction: (s) => set({ revisionInstruction: s }),
  setViewMode: (m) => set({ viewMode: m }),
  clearWarnings: () => set({ warnings: [] }),

  applyRevision: (from, to, newText) => {
    const md = get().generatedMarkdown
    set({ generatedMarkdown: md.slice(0, from) + newText + md.slice(to) })
  },

  getProfileSubset: (profile) => {
    const selectedText = get().generatedMarkdown.slice(get().selectionFrom, get().selectionTo)
    const companyMatches = profile.workHistory.filter((w) =>
      selectedText.toLowerCase().includes(w.company.toLowerCase())
    )
    const projectMatches = profile.projects.filter((p) =>
      selectedText.toLowerCase().includes(p.name.toLowerCase())
    )
    return {
      personalInfo: profile.personalInfo,
      skills: profile.skills,
      workHistory: companyMatches.length ? companyMatches : profile.workHistory.slice(0, 2),
      projects: projectMatches.length ? projectMatches : profile.projects.slice(0, 2)
    }
  }
}))

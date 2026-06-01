import { create } from 'zustand'
import type { AIProvider, HallucinationWarning, ResumeRating } from '@/types/models'
import type { ResumeDocument } from '@/types/resume-document'

interface GeneratorState {
  selectedProfileId: string | null
  jobDescription: string
  activeProvider: AIProvider
  activeModel: string

  resumeDocument: ResumeDocument | null
  warnings: HallucinationWarning[]
  isGenerating: boolean
  currentRequestId: string | null

  rating: ResumeRating | null
  isRating: boolean

  setProfile: (id: string) => void
  setJobDescription: (jd: string) => void
  setProvider: (p: AIProvider) => void
  setModel: (m: string) => void
  setResumeDocument: (doc: ResumeDocument | null) => void
  setWarnings: (w: HallucinationWarning[]) => void
  setGenerating: (v: boolean, requestId?: string | null) => void
  clearWarnings: () => void
  reorderSections: (fromIndex: number, toIndex: number) => void
  setRating: (r: ResumeRating | null) => void
  setIsRating: (v: boolean) => void
}

export const useGeneratorStore = create<GeneratorState>((set) => ({
  selectedProfileId: null,
  jobDescription: '',
  activeProvider: 'anthropic',
  activeModel: 'claude-sonnet-4-5',

  resumeDocument: null,
  warnings: [],
  isGenerating: false,
  currentRequestId: null,

  rating: null,
  isRating: false,

  setProfile: (id) => set({ selectedProfileId: id }),
  setJobDescription: (jd) => set({ jobDescription: jd }),
  setProvider: (p) => set({ activeProvider: p }),
  setModel: (m) => set({ activeModel: m }),
  setResumeDocument: (doc) => set({ resumeDocument: doc }),
  setWarnings: (w) => set({ warnings: w }),
  setGenerating: (v, requestId = null) => set({ isGenerating: v, currentRequestId: requestId }),
  clearWarnings: () => set({ warnings: [] }),
  reorderSections: (fromIndex, toIndex) => set((state) => {
    if (!state.resumeDocument) return state
    const sections = [...state.resumeDocument.sections]
    const [moved] = sections.splice(fromIndex, 1)
    sections.splice(toIndex, 0, moved)
    return { resumeDocument: { ...state.resumeDocument, sections } }
  }),
  setRating: (r) => set({ rating: r }),
  setIsRating: (v) => set({ isRating: v }),
}))

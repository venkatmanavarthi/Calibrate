import { create } from 'zustand'
import type { ResumeTemplate } from '@/types/models'

interface TemplatesState {
  templates: ResumeTemplate[]
  loading: boolean
  load: () => Promise<void>
  save: (template: ResumeTemplate) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useTemplatesStore = create<TemplatesState>((set, get) => ({
  templates: [],
  loading: false,

  load: async () => {
    set({ loading: true })
    const templates = await window.api.templatesList()
    set({ templates, loading: false })
  },

  save: async (template) => {
    await window.api.templatesSave(template)
    await get().load()
  },

  remove: async (id) => {
    await window.api.templatesDelete(id)
    set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }))
  }
}))

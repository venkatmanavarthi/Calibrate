import { create } from 'zustand'
import type { AppSettings, AIProvider } from '@/types/models'

interface SettingsState {
  settings: AppSettings | null
  load: () => Promise<void>
  save: (partial: Partial<AppSettings>) => Promise<void>
  setKey: (provider: AIProvider, key: string) => Promise<void>
  deleteKey: (provider: AIProvider) => Promise<void>
  hasKey: (provider: AIProvider) => Promise<boolean>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,

  load: async () => {
    const settings = await window.api.settingsGet()
    set({ settings })
  },

  save: async (partial) => {
    await window.api.settingsSave(partial)
    const settings = await window.api.settingsGet()
    set({ settings })
  },

  setKey: async (provider, key) => {
    await window.api.settingsSetKey(provider, key)
    const settings = await window.api.settingsGet()
    set({ settings })
  },

  deleteKey: async (provider) => {
    await window.api.settingsDeleteKey(provider)
    const settings = await window.api.settingsGet()
    set({ settings })
  },

  hasKey: async (provider) => {
    const { hasKey } = await window.api.settingsHasKey(provider)
    return hasKey
  }
}))

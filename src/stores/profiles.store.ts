import { create } from 'zustand'
import type { ExperienceProfile } from '@/types/models'

interface ProfilesState {
  profiles: ExperienceProfile[]
  loading: boolean
  load: () => Promise<void>
  save: (profile: ExperienceProfile) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useProfilesStore = create<ProfilesState>((set, get) => ({
  profiles: [],
  loading: false,

  load: async () => {
    set({ loading: true })
    const profiles = await window.api.profilesList()
    set({ profiles, loading: false })
  },

  save: async (profile) => {
    await window.api.profilesSave(profile)
    await get().load()
  },

  remove: async (id) => {
    await window.api.profilesDelete(id)
    set((s) => ({ profiles: s.profiles.filter((p) => p.id !== id) }))
  }
}))

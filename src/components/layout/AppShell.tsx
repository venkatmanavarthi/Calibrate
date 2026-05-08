import { type ReactNode, useEffect } from 'react'
import Sidebar from './Sidebar'
import UpdateBanner from './UpdateBanner'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'
import { useProfilesStore } from '@/stores/profiles.store'
import { useTemplatesStore } from '@/stores/templates.store'
import { useSettingsStore } from '@/stores/settings.store'

export default function AppShell({ children }: { children: ReactNode }) {
  const loadProfiles = useProfilesStore((s) => s.load)
  const loadTemplates = useTemplatesStore((s) => s.load)
  const loadSettings = useSettingsStore((s) => s.load)
  const theme = useSettingsStore((s) => s.settings?.theme)

  useEffect(() => {
    loadProfiles()
    loadTemplates()
    loadSettings()
  }, [loadProfiles, loadTemplates, loadSettings])

  useEffect(() => {
    const root = document.documentElement
    const applyDark = (dark: boolean) => root.classList.toggle('dark', dark)

    if (theme === 'dark') {
      applyDark(true)
    } else if (theme === 'light') {
      applyDark(false)
    } else {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      applyDark(mq.matches)
      const handler = (e: MediaQueryListEvent) => applyDark(e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <UpdateBanner />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      <OnboardingWizard />
    </div>
  )
}

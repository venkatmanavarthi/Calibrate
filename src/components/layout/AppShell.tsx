import { type ReactNode, useEffect } from 'react'
import Sidebar from './Sidebar'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'
import { useProfilesStore } from '@/stores/profiles.store'
import { useTemplatesStore } from '@/stores/templates.store'
import { useSettingsStore } from '@/stores/settings.store'

export default function AppShell({ children }: { children: ReactNode }) {
  const loadProfiles = useProfilesStore((s) => s.load)
  const loadTemplates = useTemplatesStore((s) => s.load)
  const loadSettings = useSettingsStore((s) => s.load)

  useEffect(() => {
    loadProfiles()
    loadTemplates()
    loadSettings()
  }, [loadProfiles, loadTemplates, loadSettings])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <OnboardingWizard />
    </div>
  )
}

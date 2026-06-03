import React, { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import Dashboard from '@/pages/Dashboard'
import ProfileList from '@/pages/profiles/ProfileList'
import ProfileEditor from '@/pages/profiles/ProfileEditor'
import GeneratorPage from '@/pages/generator/GeneratorPage'
import JobsPage from '@/pages/jobs/JobsPage'
import CompaniesPage from '@/pages/companies/CompaniesPage'
import PipelinePage from '@/pages/pipeline/PipelinePage'
import ApplicationsPage from '@/pages/applications/ApplicationsPage'
import PromptsPage from '@/pages/prompts/PromptsPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import InterviewPage from '@/pages/interview/InterviewPage'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useSettingsStore } from '@/stores/settings.store'

// Keeps a page mounted after first visit — avoids remount cost on tab switch.
function PersistentRoutePanel({ path, children }: { path: string; children: React.ReactNode }) {
  const { pathname } = useLocation()
  const isActive = pathname === path
  const [everActive, setEverActive] = useState(isActive)
  useEffect(() => { if (isActive) setEverActive(true) }, [isActive])
  if (!everActive) return null
  return <div style={{ display: isActive ? undefined : 'none' }}>{children}</div>
}

type PendingPrompts = { generation: string; revision: string }

function PromptsImportDialog({
  prompts,
  onClose
}: {
  prompts: PendingPrompts | null
  onClose: () => void
}) {
  const { save } = useSettingsStore()

  const handleImport = async () => {
    if (!prompts) return
    await save({ customPrompts: { generation: prompts.generation, revision: prompts.revision } })
    onClose()
  }

  return (
    <Dialog open={!!prompts} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Import Prompts</DialogTitle>
          <DialogDescription>
            Replace your current generation and revision prompts with the shared ones?
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleImport}>Import</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function App() {
  const [pendingPrompts, setPendingPrompts] = useState<PendingPrompts | null>(null)

  const handleOpenPromptsCalibrate = useCallback((prompts: PendingPrompts) => {
    setPendingPrompts(prompts)
  }, [])

  useEffect(() => {
    const unlisten = window.api.onPromptsOpenCalibrate(handleOpenPromptsCalibrate)
    return () => { unlisten() }
  }, [handleOpenPromptsCalibrate])

  return (
    <AppShell>
      <PersistentRoutePanel path="/jobs"><JobsPage /></PersistentRoutePanel>
      <PersistentRoutePanel path="/companies"><CompaniesPage /></PersistentRoutePanel>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/profiles" element={<ProfileList />} />
        <Route path="/profiles/new" element={<ProfileEditor />} />
        <Route path="/profiles/:id" element={<ProfileEditor />} />
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="/applications" element={<ApplicationsPage />} />
        <Route path="/generate" element={<GeneratorPage />} />
        <Route path="/interview" element={<InterviewPage />} />
        <Route path="/prompts" element={<PromptsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <PromptsImportDialog
        prompts={pendingPrompts}
        onClose={() => setPendingPrompts(null)}
      />
    </AppShell>
  )
}

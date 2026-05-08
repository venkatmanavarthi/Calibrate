import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import Dashboard from '@/pages/Dashboard'
import ProfileList from '@/pages/profiles/ProfileList'
import ProfileEditor from '@/pages/profiles/ProfileEditor'
import TemplateList from '@/pages/templates/TemplateList'
import TemplateEditor from '@/pages/templates/TemplateEditor'
import GeneratorPage from '@/pages/generator/GeneratorPage'
import PromptsPage from '@/pages/prompts/PromptsPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useTemplatesStore } from '@/stores/templates.store'
import { useSettingsStore } from '@/stores/settings.store'
import { generateId, now } from '@/lib/utils'
import type { ResumeTemplate } from '@/types/models'

function CalibrateImportDialog({
  template,
  onClose
}: {
  template: ResumeTemplate | null
  onClose: () => void
}) {
  const navigate = useNavigate()
  const { save } = useTemplatesStore()

  const handleImport = async () => {
    if (!template) return
    const imported: ResumeTemplate = {
      ...template,
      id: generateId(),
      createdAt: now(),
      updatedAt: now()
    }
    await save(imported)
    onClose()
    navigate(`/templates/${imported.id}`)
  }

  return (
    <Dialog open={!!template} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Import Template</DialogTitle>
          <DialogDescription>
            Import <span className="font-medium text-foreground">"{template?.name}"</span> into your templates?
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
  const [pendingTemplate, setPendingTemplate] = useState<ResumeTemplate | null>(null)
  const [pendingPrompts, setPendingPrompts] = useState<PendingPrompts | null>(null)

  const handleOpenCalibrate = useCallback((template: ResumeTemplate) => {
    setPendingTemplate(template)
  }, [])

  const handleOpenPromptsCalibrate = useCallback((prompts: PendingPrompts) => {
    setPendingPrompts(prompts)
  }, [])

  useEffect(() => {
    const unlisten1 = window.api.onTemplateOpenCalibrate(handleOpenCalibrate)
    const unlisten2 = window.api.onPromptsOpenCalibrate(handleOpenPromptsCalibrate)
    return () => { unlisten1(); unlisten2() }
  }, [handleOpenCalibrate, handleOpenPromptsCalibrate])

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/profiles" element={<ProfileList />} />
        <Route path="/profiles/new" element={<ProfileEditor />} />
        <Route path="/profiles/:id" element={<ProfileEditor />} />
        <Route path="/templates" element={<TemplateList />} />
        <Route path="/templates/new" element={<TemplateEditor />} />
        <Route path="/templates/:id" element={<TemplateEditor />} />
        <Route path="/generate" element={<GeneratorPage />} />
        <Route path="/prompts" element={<PromptsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <CalibrateImportDialog
        template={pendingTemplate}
        onClose={() => setPendingTemplate(null)}
      />
      <PromptsImportDialog
        prompts={pendingPrompts}
        onClose={() => setPendingPrompts(null)}
      />
    </AppShell>
  )
}

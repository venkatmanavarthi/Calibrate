import { useCallback, useEffect, useRef, useState } from 'react'
import { FileDown, BarChart2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ResumeDocumentEditor, { type SelectionTarget } from '@/components/editor/ResumeDocumentEditor'
import SelectionToolbar from '@/components/editor/SelectionToolbar'
import HallucinationWarningBanner from '@/components/shared/HallucinationWarning'
import ResumeRatingPanel from '@/components/shared/ResumeRatingPanel'
import PdfCookingAnimation from '@/components/shared/PdfCookingAnimation'
import { useGeneratorStore } from '@/stores/generator.store'
import { useSettingsStore } from '@/stores/settings.store'

export default function ResumeOutputPane() {
  const {
    resumeDocument, setResumeDocument,
    warnings, clearWarnings,
    isGenerating,
    jobDescription,
    activeProvider, activeModel,
    rating, isRating,
  } = useGeneratorStore()
  const { settings, save } = useSettingsStore()
  const [exporting, setExporting] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [selectedTarget, setSelectedTarget] = useState<SelectionTarget | null>(null)
  const [selectedRect, setSelectedRect] = useState<DOMRect | null>(null)
  const [editingTarget, setEditingTarget] = useState<SelectionTarget | null>(null)

  const [showRatingPanel, setShowRatingPanel] = useState(false)

  useEffect(() => {
    if (!resumeDocument) {
      setShowRatingPanel(false)
    }
  }, [resumeDocument])

  const [rightPanelWidth, setRightPanelWidth] = useState(220)
  const rightPanelRef = useRef<HTMLDivElement>(null)

  const handleRightPanelDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (ev: MouseEvent) => {
      if (!rightPanelRef.current) return
      const rect = rightPanelRef.current.parentElement!.getBoundingClientRect()
      const newWidth = Math.min(Math.max(rect.right - ev.clientX, 160), 480)
      setRightPanelWidth(newWidth)
    }

    const onMouseUp = () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [])

  const handleExportPdf = async () => {
    if (!settings || !resumeDocument) return
    setExporting(true)
    try {
      const dest = await window.api.pdfChooseDestination()
      if (!dest.filePath) return
      await window.api.pdfExport({
        resumeDocument,
        destFilePath: dest.filePath,
        templateId: settings.pdfTemplateId,
      })
    } finally {
      setExporting(false)
    }
  }

  const handleEmailPdf = async () => {
    if (!settings || !resumeDocument) return
    setEmailing(true)
    try {
      await window.api.pdfEmailExport({
        resumeDocument,
        destFilePath: '',
        templateId: settings.pdfTemplateId,
      })
    } finally {
      setEmailing(false)
    }
  }

  const handleRemoveElement = useCallback((target: SelectionTarget) => {
    if (!resumeDocument) return
    const doc = JSON.parse(JSON.stringify(resumeDocument)) as typeof resumeDocument

    switch (target.type) {
      case 'contact':
        (doc.contact as unknown as Record<string, unknown>)[target.field] = undefined
        break
      case 'summary':
        doc.sections[target.sectionIndex].text = undefined
        break
      case 'section':
        doc.sections.splice(target.sectionIndex, 1)
        break
      case 'skills':
        doc.sections[target.sectionIndex].skills = []
        break
      case 'entry':
        doc.sections[target.sectionIndex].entries?.splice(target.entryIndex, 1)
        break
      case 'bullet':
        doc.sections[target.sectionIndex].entries?.[target.entryIndex]?.bullets?.splice(target.bulletIndex, 1)
        break
      case 'skill':
        doc.sections[target.sectionIndex].skills?.splice(target.skillIndex, 1)
        break
    }

    setResumeDocument(doc)
    setSelectedTarget(null)
    setSelectedRect(null)
  }, [resumeDocument, setResumeDocument])

  const handleAddSection = useCallback((title: string, layout: import('@/types/resume-document').ResumeSectionLayout) => {
    if (!resumeDocument) return
    const section: import('@/types/resume-document').ResumeDocumentSection = {
      title,
      layout,
      ...(layout === 'entries' ? { entries: [] } : layout === 'skills' ? { skills: [] } : { text: '' }),
    }
    setResumeDocument({ ...resumeDocument, sections: [...resumeDocument.sections, section] })
  }, [resumeDocument, setResumeDocument])

  const handleAddEntry = useCallback((sectionIndex: number) => {
    if (!resumeDocument) return
    const doc = JSON.parse(JSON.stringify(resumeDocument)) as typeof resumeDocument
    const section = doc.sections[sectionIndex]
    if (!section.entries) section.entries = []
    section.entries.push({ left: 'New Entry', bullets: [] })
    setResumeDocument(doc)
  }, [resumeDocument, setResumeDocument])

  const handleAddBullet = useCallback((sectionIndex: number, entryIndex: number) => {
    if (!resumeDocument) return
    const doc = JSON.parse(JSON.stringify(resumeDocument)) as typeof resumeDocument
    const entry = doc.sections[sectionIndex].entries?.[entryIndex]
    if (!entry) return
    if (!entry.bullets) entry.bullets = []
    entry.bullets.push('New bullet point')
    setResumeDocument(doc)
  }, [resumeDocument, setResumeDocument])

  const handleToggleSection = useCallback((sectionIndex: number) => {
    if (!resumeDocument) return
    const doc = JSON.parse(JSON.stringify(resumeDocument)) as typeof resumeDocument
    doc.sections[sectionIndex].hidden = !doc.sections[sectionIndex].hidden
    setResumeDocument(doc)
  }, [resumeDocument, setResumeDocument])

  const handleEditElement = useCallback(async (target: SelectionTarget, instruction?: string) => {
    if (!resumeDocument || !settings) return
    const requestId = crypto.randomUUID()
    setSelectedTarget(null)
    setSelectedRect(null)
    setEditingTarget(target)
    try {
      const { resumeDocument: updated } = await window.api.aiEditElement({
        requestId,
        resumeDocument,
        target,
        instruction,
        provider: activeProvider,
        model: activeModel,
      })
      setResumeDocument(updated)
    } catch (err) {
      console.error('Edit element failed:', err)
    } finally {
      setEditingTarget(null)
    }
  }, [resumeDocument, settings, activeProvider, activeModel, setResumeDocument])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30 flex-shrink-0">
        {settings && (
          <div className="ml-auto flex items-center gap-2">
            <Select
              value={settings.pdfTemplateId}
              onValueChange={(v) => save({ pdfTemplateId: v })}
            >
              <SelectTrigger className="h-7 text-xs w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">Classic</SelectItem>
                <SelectItem value="modern">Modern</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-7"
              disabled={!resumeDocument || exporting}
              onClick={handleExportPdf}
            >
              <FileDown size={13} /> {exporting ? 'Exporting…' : 'Export PDF'}
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-7"
              disabled={!resumeDocument || emailing}
              onClick={handleEmailPdf}
              title="Open in Mail with PDF attached"
            >
              <Mail size={13} /> {emailing ? 'Opening…' : 'Email'}
            </Button>

            <Button
              size="sm"
              variant={showRatingPanel ? 'secondary' : 'ghost'}
              className="h-7 w-7 p-0 relative"
              onClick={() => setShowRatingPanel((v) => !v)}
              title={isRating ? 'Scoring resume…' : rating ? `Score: ${rating.overallScore}/100` : 'Rate Resume'}
              disabled={!resumeDocument || !jobDescription}
            >
              <BarChart2 size={13} className={isRating ? 'animate-pulse' : ''} />
              {rating && !isRating && (
                <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-primary text-primary-foreground rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                  {rating.overallScore}
                </span>
              )}
            </Button>
          </div>
        )}
      </div>

      <HallucinationWarningBanner warnings={warnings} onDismiss={clearWarnings} />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-hidden relative">
          {(isGenerating || exporting) && (
            <PdfCookingAnimation
              label={isGenerating ? 'Crafting your resume…' : undefined}
            />
          )}

          {resumeDocument ? (
            <>
              <ResumeDocumentEditor
                doc={resumeDocument}
                selectedTarget={selectedTarget}
                editingTarget={editingTarget}
                onSelect={(target, rect) => {
                  setSelectedTarget(target)
                  setSelectedRect(target ? rect : null)
                }}
                onToggleSection={handleToggleSection}
                onReorderSections={(from, to) => useGeneratorStore.getState().reorderSections(from, to)}
                onAddSection={handleAddSection}
                onAddEntry={handleAddEntry}
                onAddBullet={handleAddBullet}
                missingKeywords={rating?.missingKeywords}
              />
              {selectedTarget && selectedRect && (
                <SelectionToolbar
                  target={selectedTarget}
                  anchorRect={selectedRect}
                  onRewrite={(t) => handleEditElement(t)}
                  onPromptAi={(t, p) => handleEditElement(t, p)}
                  onRemove={handleRemoveElement}
                  onDismiss={() => { setSelectedTarget(null); setSelectedRect(null) }}
                />
              )}
            </>
          ) : null}
        </div>

        {/* Right rating sidebar */}
        {showRatingPanel && (
          <div ref={rightPanelRef} style={{ width: rightPanelWidth }} className="flex-shrink-0 flex">
            <div
              className="w-1 flex-shrink-0 cursor-col-resize bg-border hover:bg-primary/40 active:bg-primary/60 transition-colors relative"
              onMouseDown={handleRightPanelDividerMouseDown}
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
            </div>
            <div className="flex-1 min-w-0">
              <ResumeRatingPanel
                resumeDocument={resumeDocument}
                jobDescription={jobDescription}
                provider={activeProvider}
                model={activeModel}
                onClose={() => setShowRatingPanel(false)}
                initialRating={rating}
                initialLoading={isRating}
              />
            </div>
          </div>
        )}


      </div>
    </div>
  )
}

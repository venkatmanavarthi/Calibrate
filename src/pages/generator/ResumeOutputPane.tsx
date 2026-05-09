import { useCallback, useEffect, useRef, useState } from 'react'
import { FileDown, FileText, SlidersHorizontal, X, Type, BarChart2, ZoomIn, ZoomOut, Mail, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import PdfPreview from '@/components/editor/PdfPreview'
import ResumeDocumentPdfPreview from '@/components/editor/ResumeDocumentPdfPreview'
import ResumeDocumentEditor, { type SelectionTarget } from '@/components/editor/ResumeDocumentEditor'
import SelectionToolbar from '@/components/editor/SelectionToolbar'
import HallucinationWarningBanner from '@/components/shared/HallucinationWarning'
import ResumeRatingPanel from '@/components/shared/ResumeRatingPanel'
import PdfCookingAnimation from '@/components/shared/PdfCookingAnimation'
import { resumeDocumentToMarkdown } from '@/lib/resume-doc-to-markdown'
import { useGeneratorStore } from '@/stores/generator.store'
import { useSettingsStore } from '@/stores/settings.store'
import type { AppSettings } from '@/types/models'

export default function ResumeOutputPane() {
  const {
    resumeDocument, setResumeDocument,
    warnings, clearWarnings,
    isGenerating,
    viewMode, setViewMode,
    jobDescription,
    activeProvider, activeModel,
  } = useGeneratorStore()
  const { settings, save } = useSettingsStore()
  const [exporting, setExporting] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [selectedTarget, setSelectedTarget] = useState<SelectionTarget | null>(null)
  const [selectedRect, setSelectedRect] = useState<DOMRect | null>(null)
  const [editingTarget, setEditingTarget] = useState<SelectionTarget | null>(null)
  const [showStylePanel, setShowStylePanel] = useState(false)
  const [showRatingPanel, setShowRatingPanel] = useState(false)

  useEffect(() => {
    if (!resumeDocument) {
      setShowRatingPanel(false)
    }
  }, [resumeDocument])

  const [fontSize, setFontSize] = useState(14)
  const [lineHeight, setLineHeight] = useState(1.6)
  const [padTop, setPadTop] = useState(15)
  const [padRight, setPadRight] = useState(15)
  const [padBottom, setPadBottom] = useState(15)
  const [padLeft, setPadLeft] = useState(15)
  const [pdfZoom, setPdfZoom] = useState(1.0)
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
        markdownContent: '',
        resumeDocument,
        destFilePath: dest.filePath,
        pageSize: settings.pdfPageSize,
        marginMm: settings.pdfMarginMm,
        font: settings.pdfFont,
        fontSize: Math.round(fontSize / 1.333),
        lineHeight,
        paddingTopMm: padTop,
        paddingRightMm: padRight,
        paddingBottomMm: padBottom,
        paddingLeftMm: padLeft,
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
        markdownContent: '',
        resumeDocument,
        destFilePath: '',
        pageSize: settings.pdfPageSize,
        marginMm: settings.pdfMarginMm,
        font: settings.pdfFont,
        fontSize: Math.round(fontSize / 1.333),
        lineHeight,
        paddingTopMm: padTop,
        paddingRightMm: padRight,
        paddingBottomMm: padBottom,
        paddingLeftMm: padLeft,
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

  useEffect(() => {
    if (viewMode !== 'structured') {
      setSelectedTarget(null)
      setSelectedRect(null)
    }
  }, [viewMode])

  const resumeMarkdownForRating = resumeDocument ? resumeDocumentToMarkdown(resumeDocument) : ''

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30 flex-shrink-0">
        <div className="flex gap-1 bg-background border rounded-md p-0.5">
          <Button
            variant={viewMode === 'pdf' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-2 gap-1 text-xs"
            onClick={() => setViewMode('pdf')}
          >
            <FileText size={12} /> PDF
          </Button>
          {resumeDocument && (
            <Button
              variant={viewMode === 'structured' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-6 px-2 gap-1 text-xs"
              onClick={() => setViewMode('structured')}
            >
              <Layers size={12} /> Structured
            </Button>
          )}
        </div>

        {viewMode === 'pdf' && (
          <div className="flex items-center gap-1 border rounded-md px-1 py-0.5 bg-background">
            <Button
              size="sm" variant="ghost" className="h-6 w-6 p-0"
              onClick={() => setPdfZoom(z => Math.max(0.5, parseFloat((z - 0.25).toFixed(2))))}
              disabled={pdfZoom <= 0.5}
            >
              <ZoomOut size={12} />
            </Button>
            <span className="text-xs tabular-nums w-9 text-center select-none">
              {Math.round(pdfZoom * 100)}%
            </span>
            <Button
              size="sm" variant="ghost" className="h-6 w-6 p-0"
              onClick={() => setPdfZoom(z => Math.min(2.0, parseFloat((z + 0.25).toFixed(2))))}
              disabled={pdfZoom >= 2.0}
            >
              <ZoomIn size={12} />
            </Button>
          </div>
        )}

        {settings && (
          <div className="ml-auto flex items-center gap-2">
            <Select
              value={settings.pdfFont}
              onValueChange={(v) => save({ pdfFont: v as AppSettings['pdfFont'] })}
            >
              <SelectTrigger className="h-7 text-xs w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Georgia">Georgia</SelectItem>
                <SelectItem value="Garamond">Garamond</SelectItem>
                <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                <SelectItem value="Calibri">Calibri</SelectItem>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Helvetica">Helvetica</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={settings.pdfPageSize}
              onValueChange={(v) => save({ pdfPageSize: v as 'Letter' | 'A4' })}
            >
              <SelectTrigger className="h-7 text-xs w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Letter">Letter</SelectItem>
                <SelectItem value="A4">A4</SelectItem>
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
              variant={showStylePanel ? 'secondary' : 'ghost'}
              className="h-7 w-7 p-0"
              onClick={() => { setShowStylePanel((v) => !v); setShowRatingPanel(false) }}
              title="Typography"
            >
              <SlidersHorizontal size={13} />
            </Button>

            <Button
              size="sm"
              variant={showRatingPanel ? 'secondary' : 'ghost'}
              className="h-7 w-7 p-0"
              onClick={() => { setShowRatingPanel((v) => !v); setShowStylePanel(false) }}
              title="Rate Resume"
              disabled={!resumeDocument || !jobDescription}
            >
              <BarChart2 size={13} />
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

          {viewMode === 'structured' && resumeDocument ? (
            <>
              <ResumeDocumentEditor
                doc={resumeDocument}
                selectedTarget={selectedTarget}
                editingTarget={editingTarget}
                onSelect={(target, rect) => {
                  setSelectedTarget(target)
                  setSelectedRect(target ? rect : null)
                }}
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
          ) : resumeDocument ? (
            <ResumeDocumentPdfPreview
              doc={resumeDocument}
              font={settings?.pdfFont ?? 'Georgia'}
              pageSize={settings?.pdfPageSize ?? 'Letter'}
              marginMm={settings?.pdfMarginMm ?? 15}
              fontSize={Math.round(fontSize / 1.333)}
              lineHeight={lineHeight}
              paddingTopMm={padTop}
              paddingRightMm={padRight}
              paddingBottomMm={padBottom}
              paddingLeftMm={padLeft}
              zoom={pdfZoom}
            />
          ) : (
            <PdfPreview
              markdown=""
              font={settings?.pdfFont ?? 'Georgia'}
              pageSize={settings?.pdfPageSize ?? 'Letter'}
              marginMm={settings?.pdfMarginMm ?? 15}
              fontSize={Math.round(fontSize / 1.333)}
              lineHeight={lineHeight}
              paddingTopMm={padTop}
              paddingRightMm={padRight}
              paddingBottomMm={padBottom}
              paddingLeftMm={padLeft}
              zoom={pdfZoom}
            />
          )}
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
                resumeMarkdown={resumeMarkdownForRating}
                jobDescription={jobDescription}
                provider={activeProvider}
                model={activeModel}
                onClose={() => setShowRatingPanel(false)}
              />
            </div>
          </div>
        )}

        {/* Right style sidebar */}
        {showStylePanel && (
          <div ref={rightPanelRef} style={{ width: rightPanelWidth }} className="flex-shrink-0 flex">
            <div
              className="w-1 flex-shrink-0 cursor-col-resize bg-border hover:bg-primary/40 active:bg-primary/60 transition-colors relative"
              onMouseDown={handleRightPanelDividerMouseDown}
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col bg-background">
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                <div className="flex items-center gap-1.5">
                  <Type size={12} className="text-muted-foreground" />
                  <span className="text-xs font-medium">Typography</span>
                </div>
                <button
                  onClick={() => setShowStylePanel(false)}
                  className="text-muted-foreground hover:text-foreground rounded p-0.5 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Font Size</span>
                    <span className="text-xs tabular-nums bg-muted rounded px-1.5 py-0.5 font-medium">{fontSize}px</span>
                  </div>
                  <input
                    type="range" min={10} max={22} step={1} value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>10px</span><span>22px</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Line Height</span>
                    <span className="text-xs tabular-nums bg-muted rounded px-1.5 py-0.5 font-medium">{lineHeight.toFixed(1)}</span>
                  </div>
                  <input
                    type="range" min={1.2} max={2.4} step={0.1} value={lineHeight}
                    onChange={(e) => setLineHeight(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>1.2</span><span>2.4</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Padding (mm)</span>
                  <div className="flex flex-col gap-1.5">
                    {([
                      { label: 'Top', value: padTop, set: setPadTop },
                      { label: 'Right', value: padRight, set: setPadRight },
                      { label: 'Bottom', value: padBottom, set: setPadBottom },
                      { label: 'Left', value: padLeft, set: setPadLeft },
                    ] as const).map(({ label, value, set: setFn }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground w-12">{label}</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number" min={0} max={50} value={value}
                            onChange={(e) => setFn(Math.max(0, Math.min(50, Number(e.target.value))))}
                            className="w-14 text-center text-xs h-7 rounded border border-border bg-background tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <span className="text-[10px] text-muted-foreground">mm</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t p-2">
                <Button
                  variant="ghost" size="sm" className="w-full h-7 text-xs text-muted-foreground"
                  onClick={() => { setFontSize(14); setLineHeight(1.6); setPadTop(15); setPadRight(15); setPadBottom(15); setPadLeft(15) }}
                >
                  Reset to defaults
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

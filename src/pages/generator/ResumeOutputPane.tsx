import { useRef, useState } from 'react'
import { FileDown, Eye, Code2, FileText, SlidersHorizontal, AlignLeft, AlignCenter, AlignRight, AlignJustify, X, Type } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import MarkdownEditor, { type MarkdownEditorHandle } from '@/components/editor/MarkdownEditor'
import ResumePreview from '@/components/editor/ResumePreview'
import PdfPreview from '@/components/editor/PdfPreview'
import HallucinationWarningBanner from '@/components/shared/HallucinationWarning'
import RevisionBar from './RevisionBar'
import { useGeneratorStore } from '@/stores/generator.store'
import { useSettingsStore } from '@/stores/settings.store'
import type { AppSettings } from '@/types/models'

interface Props {
  onRevise: (instruction: string, editorHandle: MarkdownEditorHandle | null) => void
}

export default function ResumeOutputPane({ onRevise }: Props) {
  const editorRef = useRef<MarkdownEditorHandle>(null)
  const {
    generatedMarkdown, setGeneratedMarkdown,
    warnings, clearWarnings,
    viewMode, setViewMode,
    setSelection,
  } = useGeneratorStore()
  const { settings, save } = useSettingsStore()
  const [exporting, setExporting] = useState(false)
  const [showStylePanel, setShowStylePanel] = useState(false)
  const [fontSize, setFontSize] = useState(14)
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left')
  const [lineHeight, setLineHeight] = useState(1.6)
  const [padTop, setPadTop] = useState(15)
  const [padRight, setPadRight] = useState(15)
  const [padBottom, setPadBottom] = useState(15)
  const [padLeft, setPadLeft] = useState(15)

  const handleExportPdf = async () => {
    if (!settings) return
    setExporting(true)
    try {
      const dest = await window.api.pdfChooseDestination()
      if (!dest.filePath) return
      await window.api.pdfExport({
        markdownContent: generatedMarkdown,
        destFilePath: dest.filePath,
        pageSize: settings.pdfPageSize,
        marginMm: settings.pdfMarginMm,
        font: settings.pdfFont,
        fontSize: Math.round(fontSize / 1.333),
        textAlign,
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

  const handleRevise = (instruction: string) => {
    onRevise(instruction, editorRef.current)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30 flex-shrink-0">
        <div className="flex gap-1 bg-background border rounded-md p-0.5">
          <Button
            variant={viewMode === 'edit' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-2 gap-1 text-xs"
            onClick={() => setViewMode('edit')}
          >
            <Code2 size={12} /> Edit
          </Button>
          <Button
            variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-2 gap-1 text-xs"
            onClick={() => setViewMode('preview')}
          >
            <Eye size={12} /> Preview
          </Button>
          <Button
            variant={viewMode === 'pdf' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-2 gap-1 text-xs"
            onClick={() => setViewMode('pdf')}
          >
            <FileText size={12} /> PDF
          </Button>
        </div>

        {settings && (
          <div className="ml-auto flex items-center gap-2">
            {/* Font */}
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

            {/* Page size */}
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
              disabled={!generatedMarkdown || exporting}
              onClick={handleExportPdf}
            >
              <FileDown size={13} /> {exporting ? 'Exporting…' : 'Export PDF'}
            </Button>

            <Button
              size="sm"
              variant={showStylePanel ? 'secondary' : 'ghost'}
              className="h-7 w-7 p-0"
              onClick={() => setShowStylePanel((v) => !v)}
              title="Typography"
            >
              <SlidersHorizontal size={13} />
            </Button>
          </div>
        )}
      </div>

      {/* Hallucination warnings */}
      <HallucinationWarningBanner warnings={warnings} onDismiss={clearWarnings} />

      {/* Editor / Preview / PDF Preview + Style Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {viewMode === 'edit' ? (
            <MarkdownEditor
              ref={editorRef}
              value={generatedMarkdown}
              onChange={setGeneratedMarkdown}
              onSelectionChange={setSelection}
              className="h-full"
            />
          ) : viewMode === 'preview' ? (
            <ResumePreview
              markdown={generatedMarkdown}
              className="h-full"
              fontSize={fontSize}
              textAlign={textAlign}
              lineHeight={lineHeight}
              paddingTopMm={padTop}
              paddingRightMm={padRight}
              paddingBottomMm={padBottom}
              paddingLeftMm={padLeft}
            />
          ) : (
            <PdfPreview
              markdown={generatedMarkdown}
              font={settings?.pdfFont ?? 'Georgia'}
              pageSize={settings?.pdfPageSize ?? 'Letter'}
              marginMm={settings?.pdfMarginMm ?? 15}
              fontSize={Math.round(fontSize / 1.333)}
              textAlign={textAlign}
              lineHeight={lineHeight}
              paddingTopMm={padTop}
              paddingRightMm={padRight}
              paddingBottomMm={padBottom}
              paddingLeftMm={padLeft}
            />
          )}
        </div>

        {/* Right style sidebar */}
        {showStylePanel && (
          <div className="w-[200px] flex-shrink-0 border-l flex flex-col bg-background">
            {/* Header */}
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

            {/* Controls */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-5">
              {/* Font Size */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Font Size</span>
                  <span className="text-xs tabular-nums bg-muted rounded px-1.5 py-0.5 font-medium">{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={22}
                  step={1}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>10px</span><span>22px</span>
                </div>
              </div>

              {/* Alignment */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Alignment</span>
                <div className="grid grid-cols-4 gap-1">
                  {([
                    { value: 'left', Icon: AlignLeft, label: 'Left' },
                    { value: 'center', Icon: AlignCenter, label: 'Center' },
                    { value: 'right', Icon: AlignRight, label: 'Right' },
                    { value: 'justify', Icon: AlignJustify, label: 'Justify' },
                  ] as const).map(({ value, Icon, label }) => (
                    <Button
                      key={value}
                      variant={textAlign === value ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-8 p-0"
                      onClick={() => setTextAlign(value)}
                      title={label}
                    >
                      <Icon size={13} />
                    </Button>
                  ))}
                </div>
              </div>

              {/* Line Height */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Line Height</span>
                  <span className="text-xs tabular-nums bg-muted rounded px-1.5 py-0.5 font-medium">{lineHeight.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={1.2}
                  max={2.4}
                  step={0.1}
                  value={lineHeight}
                  onChange={(e) => setLineHeight(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>1.2</span><span>2.4</span>
                </div>
              </div>

              {/* Padding */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Padding (mm)</span>
                <div className="flex flex-col gap-1.5">
                  {([
                    { label: 'Top', value: padTop, set: setPadTop },
                    { label: 'Right', value: padRight, set: setPadRight },
                    { label: 'Bottom', value: padBottom, set: setPadBottom },
                    { label: 'Left', value: padLeft, set: setPadLeft },
                  ] as const).map(({ label, value, set }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground w-12">{label}</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={value}
                          onChange={(e) => set(Math.max(0, Math.min(50, Number(e.target.value))))}
                          className="w-14 text-center text-xs h-7 rounded border border-border bg-background tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <span className="text-[10px] text-muted-foreground">mm</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs text-muted-foreground"
                onClick={() => { setFontSize(14); setTextAlign('left'); setLineHeight(1.6); setPadTop(15); setPadRight(15); setPadBottom(15); setPadLeft(15) }}
              >
                Reset to defaults
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Revision bar */}
      <RevisionBar onRevise={handleRevise} />
    </div>
  )
}

import { useRef, useState } from 'react'
import { FileDown, Eye, Code2, FileText } from 'lucide-react'
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
        font: settings.pdfFont
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
          </div>
        )}
      </div>

      {/* Hallucination warnings */}
      <HallucinationWarningBanner warnings={warnings} onDismiss={clearWarnings} />

      {/* Editor / Preview / PDF Preview */}
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
          <ResumePreview markdown={generatedMarkdown} className="h-full" />
        ) : (
          <PdfPreview
            markdown={generatedMarkdown}
            font={settings?.pdfFont ?? 'Georgia'}
            pageSize={settings?.pdfPageSize ?? 'Letter'}
            marginMm={settings?.pdfMarginMm ?? 15}
          />
        )}
      </div>

      {/* Revision bar */}
      <RevisionBar onRevise={handleRevise} />
    </div>
  )
}

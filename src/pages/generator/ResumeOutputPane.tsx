import { useRef, useState } from 'react'
import { FileDown, Eye, Code2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import MarkdownEditor, { type MarkdownEditorHandle } from '@/components/editor/MarkdownEditor'
import ResumePreview from '@/components/editor/ResumePreview'
import HallucinationWarningBanner from '@/components/shared/HallucinationWarning'
import RevisionBar from './RevisionBar'
import { useGeneratorStore } from '@/stores/generator.store'
import { useSettingsStore } from '@/stores/settings.store'
import { useProfilesStore } from '@/stores/profiles.store'
import { generateId } from '@/lib/utils'

interface Props {
  onRevise: (instruction: string, editorHandle: MarkdownEditorHandle | null) => void
}

export default function ResumeOutputPane({ onRevise }: Props) {
  const editorRef = useRef<MarkdownEditorHandle>(null)
  const {
    generatedMarkdown, setGeneratedMarkdown,
    warnings, clearWarnings,
    viewMode, setViewMode,
    setSelection, selectionFrom, selectionTo
  } = useGeneratorStore()
  const settings = useSettingsStore((s) => s.settings)
  const profiles = useProfilesStore((s) => s.profiles)
  const { selectedProfileId } = useGeneratorStore()

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
        marginMm: settings.pdfMarginMm
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
        </div>
        <div className="ml-auto">
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
      </div>

      {/* Hallucination warnings */}
      <HallucinationWarningBanner warnings={warnings} onDismiss={clearWarnings} />

      {/* Editor or Preview */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'edit' ? (
          <MarkdownEditor
            ref={editorRef}
            value={generatedMarkdown}
            onChange={setGeneratedMarkdown}
            onSelectionChange={setSelection}
            className="h-full"
          />
        ) : (
          <ResumePreview markdown={generatedMarkdown} className="h-full" />
        )}
      </div>

      {/* Revision bar */}
      <RevisionBar onRevise={handleRevise} />
    </div>
  )
}

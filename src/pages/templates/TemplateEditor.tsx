import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import MarkdownEditor from '@/components/editor/MarkdownEditor'
import ResumePreview from '@/components/editor/ResumePreview'
import { useTemplatesStore } from '@/stores/templates.store'
import { now } from '@/lib/utils'

export default function TemplateEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { templates, save } = useTemplatesStore()

  const template = templates.find((t) => t.id === id)
  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [content, setContent] = useState(template?.markdownContent ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (template) {
      setName(template.name)
      setDescription(template.description ?? '')
      setContent(template.markdownContent)
    }
  }, [template])

  const handleSave = async () => {
    if (!template) return
    setSaving(true)
    await save({ ...template, name, description, markdownContent: content, updatedAt: now() })
    setSaving(false)
    navigate('/templates')
  }

  if (!template) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Template not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/templates')}>
          Back to Templates
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate('/templates')}>
          <ArrowLeft size={18} />
        </Button>
        <div className="flex gap-3 flex-1 items-center">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs font-semibold border-0 shadow-none focus-visible:ring-0 px-0"
            placeholder="Template name"
          />
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="max-w-sm text-sm border-0 shadow-none focus-visible:ring-0 px-0 text-muted-foreground"
            placeholder="Short description (optional)"
          />
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
          <Save size={14} /> {saving ? 'Saving…' : 'Save Template'}
        </Button>
      </div>

      {/* Hint */}
      <div className="px-6 py-2 bg-muted/40 border-b flex-shrink-0">
        <p className="text-xs text-muted-foreground">
          Write your template in Markdown. The AI will fill in the content based on your selected experience profile and job description.
          Use descriptive section headers and bullet placeholders as structural hints.
        </p>
      </div>

      {/* Two-pane editor */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 border-r overflow-hidden">
          <div className="px-4 py-2 border-b bg-muted/30">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Editor</Label>
          </div>
          <MarkdownEditor value={content} onChange={setContent} className="h-[calc(100%-37px)]" />
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="px-4 py-2 border-b bg-muted/30">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</Label>
          </div>
          <ResumePreview markdown={content} className="h-[calc(100%-37px)]" />
        </div>
      </div>
    </div>
  )
}

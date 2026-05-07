import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { useSettingsStore } from '@/stores/settings.store'
import { DEFAULT_GENERATION_PROMPT, DEFAULT_REVISION_PROMPT } from '@/lib/default-prompts'

export default function PromptsPage() {
  const { settings, save } = useSettingsStore()

  const [generationDraft, setGenerationDraft] = useState(DEFAULT_GENERATION_PROMPT)
  const [revisionDraft, setRevisionDraft] = useState(DEFAULT_REVISION_PROMPT)

  useEffect(() => {
    if (settings) {
      setGenerationDraft(settings.customPrompts?.generation ?? DEFAULT_GENERATION_PROMPT)
      setRevisionDraft(settings.customPrompts?.revision ?? DEFAULT_REVISION_PROMPT)
    }
  }, [settings])

  if (!settings) return null

  const savedGeneration = settings.customPrompts?.generation ?? DEFAULT_GENERATION_PROMPT
  const savedRevision = settings.customPrompts?.revision ?? DEFAULT_REVISION_PROMPT
  const isDirty = generationDraft !== savedGeneration || revisionDraft !== savedRevision

  const handleSave = () => {
    save({ customPrompts: { generation: generationDraft, revision: revisionDraft } })
  }

  return (
    <div className="p-8 max-w-2xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Prompts</h2>
        <p className="text-muted-foreground text-sm mt-1">Customize the AI instructions used when generating and revising resumes.</p>
      </div>

      <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground">
        Profile data, template structure, and job description are automatically appended at runtime — only the persona and rules shown below are customizable.
      </div>

      {/* Generation Prompt */}
      <div className="space-y-2">
        <div>
          <Label className="text-base font-semibold">Generation Prompt</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Persona and rules used when generating a full resume from a profile.</p>
        </div>
        <Textarea
          className="min-h-[240px] font-mono text-xs"
          value={generationDraft}
          onChange={(e) => setGenerationDraft(e.target.value)}
        />
        {generationDraft.trim() === '' && (
          <p className="text-xs text-amber-600">Empty prompt falls back to the built-in default.</p>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setGenerationDraft(DEFAULT_GENERATION_PROMPT)}
        >
          Reset to Default
        </Button>
      </div>

      <Separator />

      {/* Revision Prompt */}
      <div className="space-y-2">
        <div>
          <Label className="text-base font-semibold">Revision Prompt</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Persona and rules used when revising a selected segment of the resume.</p>
        </div>
        <Textarea
          className="min-h-[200px] font-mono text-xs"
          value={revisionDraft}
          onChange={(e) => setRevisionDraft(e.target.value)}
        />
        {revisionDraft.trim() === '' && (
          <p className="text-xs text-amber-600">Empty prompt falls back to the built-in default.</p>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRevisionDraft(DEFAULT_REVISION_PROMPT)}
        >
          Reset to Default
        </Button>
      </div>

      <div className="pt-2">
        <Button disabled={!isDirty} onClick={handleSave}>
          Save Prompts
        </Button>
      </div>
    </div>
  )
}

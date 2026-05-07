import { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { useSettingsStore } from '@/stores/settings.store'
import { DEFAULT_GENERATION_PROMPT, DEFAULT_REVISION_PROMPT } from '@/lib/default-prompts'
import type { PromptSnapshot } from '@/types/models'

const HISTORY_CAP = 20

export default function PromptsPage() {
  const { settings, save } = useSettingsStore()

  const [generationDraft, setGenerationDraft] = useState(DEFAULT_GENERATION_PROMPT)
  const [revisionDraft, setRevisionDraft] = useState(DEFAULT_REVISION_PROMPT)
  const [restoredId, setRestoredId] = useState<string | null>(null)

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
    const snapshot: PromptSnapshot = {
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      generation: savedGeneration,
      revision: savedRevision,
    }
    const newHistory = [snapshot, ...(settings.promptHistory ?? [])].slice(0, HISTORY_CAP)
    save({
      customPrompts: { generation: generationDraft, revision: revisionDraft },
      promptHistory: newHistory,
    })
    setRestoredId(null)
  }

  const handleRestore = (snapshot: PromptSnapshot) => {
    setGenerationDraft(snapshot.generation)
    setRevisionDraft(snapshot.revision)
    setRestoredId(snapshot.id)
  }

  const handleDeleteSnapshot = (id: string) => {
    const filtered = (settings.promptHistory ?? []).filter((s) => s.id !== id)
    save({ promptHistory: filtered })
    if (restoredId === id) setRestoredId(null)
  }

  const history = settings.promptHistory ?? []

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

      {/* History */}
      {history.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">History</h3>
            <div className="space-y-2">
              {history.map((snapshot) => (
                <div
                  key={snapshot.id}
                  className={`rounded-lg border p-3 space-y-1.5 transition-colors ${
                    restoredId === snapshot.id ? 'border-primary/40 bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(snapshot.savedAt).toLocaleString()}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => handleRestore(snapshot)}
                      >
                        Restore
                      </Button>
                      <button
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => handleDeleteSnapshot(snapshot.id)}
                        aria-label="Delete snapshot"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {snapshot.generation.slice(0, 100)}{snapshot.generation.length > 100 ? '…' : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

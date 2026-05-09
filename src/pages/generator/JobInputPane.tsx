import { useEffect } from 'react'
import { Loader2, Play, Square, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useProfilesStore } from '@/stores/profiles.store'
import { useTemplatesStore } from '@/stores/templates.store'
import { useSettingsStore } from '@/stores/settings.store'
import { useGeneratorStore } from '@/stores/generator.store'
import { PROVIDER_LABELS, PROVIDER_MODELS } from '@/lib/ai-providers'

interface Props {
  onGenerate: () => void
  onCancel: () => void
}

export default function JobInputPane({ onGenerate, onCancel }: Props) {
  const profiles = useProfilesStore((s) => s.profiles)
  const templates = useTemplatesStore((s) => s.templates)
  const settings = useSettingsStore((s) => s.settings)

  const {
    selectedProfileId, setProfile,
    selectedTemplateId, setTemplate,
    jobDescription, setJobDescription,
    activeProvider, setProvider,
    activeModel, setModel,
    isGenerating,
    setResumeDocument, clearWarnings
  } = useGeneratorStore()

  useEffect(() => {
    if (settings && !selectedProfileId && profiles.length > 0) {
      setProfile(profiles[0].id)
    }
  }, [settings, profiles, selectedProfileId, setProfile])

  useEffect(() => {
    if (settings && !selectedTemplateId && templates.length > 0) {
      setTemplate(templates[0].id)
    }
  }, [settings, templates, selectedTemplateId, setTemplate])

  useEffect(() => {
    if (settings) {
      setProvider(settings.preferredProvider)
      setModel(settings.preferredModels[settings.preferredProvider])
    }
  }, [settings, setProvider, setModel])

  const canGenerate = selectedProfileId && selectedTemplateId && jobDescription.trim().length > 20 && !isGenerating

  const handleClear = () => {
    setJobDescription('')
    setResumeDocument(null)
    clearWarnings()
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profile</Label>
          <Select value={selectedProfileId ?? ''} onValueChange={setProfile}>
            <SelectTrigger>
              <SelectValue placeholder="Select a profile…" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Template</Label>
          <Select value={selectedTemplateId ?? ''} onValueChange={setTemplate}>
            <SelectTrigger>
              <SelectValue placeholder="Select a template…" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Provider</Label>
            <Select value={activeProvider} onValueChange={(v) => {
              setProvider(v as typeof activeProvider)
              const models = PROVIDER_MODELS[v] ?? []
              if (models.length > 0) setModel(models[0])
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Model</Label>
            <Select value={activeModel} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(PROVIDER_MODELS[activeProvider] ?? [activeModel]).map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col space-y-1.5 min-h-0">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex-shrink-0">
          Job Description
        </Label>
        <Textarea
          className="flex-1 resize-none font-mono text-xs"
          placeholder="Paste the full job description here…"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />
      </div>

      <div className="flex-shrink-0">
        {isGenerating ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              Generating resume…
            </div>
            <Button variant="outline" onClick={onCancel} className="w-full gap-1.5">
              <Square size={13} /> Cancel
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button onClick={onGenerate} disabled={!canGenerate} className="flex-1 gap-1.5">
              <Play size={14} /> Generate Resume
            </Button>
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={!jobDescription && !isGenerating}
              title="Clear job description and output"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        )}
        {!selectedProfileId && (
          <p className="text-xs text-muted-foreground mt-1.5">Create a profile first.</p>
        )}
        {!selectedTemplateId && (
          <p className="text-xs text-muted-foreground mt-1.5">Create a template first.</p>
        )}
      </div>
    </div>
  )
}

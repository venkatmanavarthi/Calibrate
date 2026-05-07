import { useState, useEffect } from 'react'
import { Eye, EyeOff, Check, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useSettingsStore } from '@/stores/settings.store'
import { PROVIDER_LABELS, PROVIDER_MODELS, ALL_PROVIDERS } from '@/lib/ai-providers'
import type { AIProvider } from '@/types/models'

const PROVIDERS: { id: AIProvider; label: string; needsKey: boolean }[] = [
  { id: 'anthropic', label: 'Anthropic (Claude)', needsKey: true },
  { id: 'openai', label: 'OpenAI (GPT)', needsKey: true },
  { id: 'gemini', label: 'Google (Gemini)', needsKey: true },
  { id: 'groq', label: 'Groq', needsKey: true },
  { id: 'lmstudio', label: 'LM Studio (local)', needsKey: false }
]

const KEY_REQUIRED: Record<AIProvider, boolean> = {
  anthropic: true, openai: true, gemini: true, groq: true, lmstudio: false
}

interface KeyFieldProps {
  provider: AIProvider
  label: string
}

function KeyField({ provider, label }: KeyFieldProps) {
  const { setKey, deleteKey } = useSettingsStore()
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const [hasKey, setHasKey] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.api.settingsHasKey(provider).then(({ hasKey: hk }) => setHasKey(hk))
  }, [provider])

  const handleSave = async () => {
    if (!value.trim()) return
    setSaving(true)
    await setKey(provider, value.trim())
    setValue('')
    setHasKey(true)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm(`Remove API key for ${label}?`)) return
    await deleteKey(provider)
    setHasKey(false)
  }

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-2">
        {label}
        {hasKey && <span className="inline-flex items-center gap-1 text-xs text-green-600"><Check size={12} /> Configured</span>}
      </Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={show ? 'text' : 'password'}
            placeholder={hasKey ? '••••••••••••••••••' : 'Paste API key…'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="pr-9"
          />
          <button
            type="button"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShow(!show)}
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <Button size="sm" disabled={!value.trim() || saving} onClick={handleSave}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        {hasKey && (
          <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={handleDelete}>
            <Trash2 size={14} />
          </Button>
        )}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { settings, save } = useSettingsStore()
  const [lmBaseUrl, setLmBaseUrl] = useState(settings?.lmStudioConfig.baseUrl ?? 'http://localhost:1234/v1')
  const [lmModel, setLmModel] = useState(settings?.lmStudioConfig.modelName ?? 'local-model')

  useEffect(() => {
    if (settings) {
      setLmBaseUrl(settings.lmStudioConfig.baseUrl)
      setLmModel(settings.lmStudioConfig.modelName)
    }
  }, [settings])

  if (!settings) return null

  return (
    <div className="p-8 max-w-2xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground text-sm mt-1">Configure your AI providers and app preferences.</p>
      </div>

      {!settings.encryptionAvailable && (
        <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold">Encryption unavailable</p>
            <p className="text-xs mt-0.5 text-amber-700">
              Your system does not support secure key storage — keys are stored in plaintext.
              Consider using LM Studio to avoid storing cloud API keys.
            </p>
          </div>
        </div>
      )}

      {/* API Keys */}
      <div className="space-y-5">
        <h3 className="font-semibold">API Keys</h3>
        {PROVIDERS.filter((p) => p.needsKey).map((p) => (
          <KeyField key={p.id} provider={p.id} label={p.label} />
        ))}
      </div>

      <Separator />

      {/* Default AI Model */}
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold">Default AI Model</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Used for resume generation and PDF profile import.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <Select
              value={settings.preferredProvider}
              onValueChange={(v) => {
                const provider = v as AIProvider
                save({ preferredProvider: provider })
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_PROVIDERS.map((p) => (
                  <SelectItem key={p} value={p}>{PROVIDER_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Model</Label>
            <Select
              value={settings.preferredModels[settings.preferredProvider]}
              onValueChange={(v) => {
                save({
                  preferredModels: {
                    ...settings.preferredModels,
                    [settings.preferredProvider]: v
                  }
                })
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(PROVIDER_MODELS[settings.preferredProvider] ?? [settings.preferredModels[settings.preferredProvider]]).map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {KEY_REQUIRED[settings.preferredProvider] && (
          <p className="text-xs text-muted-foreground">
            Make sure an API key for <strong>{PROVIDER_LABELS[settings.preferredProvider]}</strong> is configured above.
          </p>
        )}
      </div>

      <Separator />

      {/* LM Studio */}
      <div className="space-y-4">
        <h3 className="font-semibold">LM Studio (Local Models)</h3>
        <div className="space-y-1.5">
          <Label>Base URL</Label>
          <Input
            value={lmBaseUrl}
            onChange={(e) => setLmBaseUrl(e.target.value)}
            placeholder="http://localhost:1234/v1"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Model Name</Label>
          <Input
            value={lmModel}
            onChange={(e) => setLmModel(e.target.value)}
            placeholder="local-model"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => save({ lmStudioConfig: { baseUrl: lmBaseUrl, modelName: lmModel } })}
        >
          Save LM Studio Config
        </Button>
      </div>

      <Separator />

      {/* Appearance */}
      <div className="space-y-4">
        <h3 className="font-semibold">Appearance</h3>
        <div className="space-y-1.5">
          <Label>Theme</Label>
          <Select value={settings.theme} onValueChange={(v) => save({ theme: v as typeof settings.theme })}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

    </div>
  )
}

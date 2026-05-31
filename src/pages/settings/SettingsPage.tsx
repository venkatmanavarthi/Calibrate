import { useState, useEffect } from 'react'
import { Eye, EyeOff, Check, Trash2, AlertTriangle, LogIn, X, RefreshCw, Chrome } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useSettingsStore } from '@/stores/settings.store'
import { useApplicationsStore } from '@/stores/applications.store'
import { PROVIDER_LABELS, PROVIDER_MODELS, ALL_PROVIDERS } from '@/lib/ai-providers'
import type { AIProvider, ApplicationDefaults } from '@/types/models'

const EEO_GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Decline to state']
const EEO_RACE_OPTIONS = [
  'Asian', 'Black or African American', 'Hispanic or Latino',
  'Native American or Alaska Native', 'Native Hawaiian or Pacific Islander',
  'White', 'Two or more races', 'Decline to state'
]
const EEO_VETERAN_OPTIONS = ['Yes', 'No', 'Decline to state']
const EEO_DISABILITY_OPTIONS = ['Yes', 'No', 'Decline to state']

const ATS_DOMAINS = [
  { label: 'Greenhouse', domain: 'boards.greenhouse.io' },
  { label: 'Lever', domain: 'jobs.lever.co' },
  { label: 'Ashby', domain: 'jobs.ashbyhq.com' }
]

const PROVIDERS: { id: AIProvider; label: string; needsKey: boolean }[] = [
  { id: 'anthropic', label: 'Anthropic (Claude)', needsKey: true },
  { id: 'openai', label: 'OpenAI (GPT)', needsKey: true },
  { id: 'gemini', label: 'Google (Gemini)', needsKey: true },
  { id: 'groq', label: 'Groq', needsKey: true },
  { id: 'deepseek', label: 'DeepSeek', needsKey: true },
  { id: 'lmstudio', label: 'LM Studio (local)', needsKey: false }
]

const KEY_REQUIRED: Record<AIProvider, boolean> = {
  anthropic: true, openai: true, gemini: true, groq: true, deepseek: true, lmstudio: false
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
  const { defaults, loadDefaults, saveDefaults, authenticateSession, clearSession } = useApplicationsStore()
  const [lmBaseUrl, setLmBaseUrl] = useState(settings?.lmStudioConfig.baseUrl ?? 'http://localhost:1234/v1')
  const [lmModel, setLmModel] = useState(settings?.lmStudioConfig.modelName ?? 'local-model')
  const [gmailClientId, setGmailClientId] = useState(settings?.gmailOAuthClientId ?? '')
  const [gmailClientSecret, setGmailClientSecret] = useState(settings?.gmailOAuthClientSecret ?? '')
  const [appDefaults, setAppDefaults] = useState<ApplicationDefaults>({
    workAuthorized: true,
    requiresSponsorship: false
  })
  const [defaultsSaved, setDefaultsSaved] = useState(false)
  const {
    gmail,
    chromeConnection,
    checkChromeConnection,
    connectGmail,
    disconnectGmail
  } = useApplicationsStore()

  useEffect(() => {
    if (settings) {
      setLmBaseUrl(settings.lmStudioConfig.baseUrl)
      setLmModel(settings.lmStudioConfig.modelName)
      setGmailClientId(settings.gmailOAuthClientId ?? '')
      setGmailClientSecret(settings.gmailOAuthClientSecret ?? '')
    }
  }, [settings])

  useEffect(() => {
    loadDefaults()
    checkChromeConnection()
  }, [loadDefaults])

  useEffect(() => {
    if (defaults) setAppDefaults(defaults)
  }, [defaults])

  useEffect(() => {
    if (!settings) return
    const available = ALL_PROVIDERS.filter(
      (p) => !KEY_REQUIRED[p] || settings.configuredProviders.includes(p)
    )
    if (available.length > 0 && !available.includes(settings.preferredProvider)) {
      save({ preferredProvider: available[0] })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.configuredProviders.join(','), settings?.preferredProvider])

  const handleSaveDefaults = async () => {
    await saveDefaults(appDefaults)
    setDefaultsSaved(true)
    setTimeout(() => setDefaultsSaved(false), 2000)
  }

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

        <div className="pt-4 border-t space-y-5">
          <div>
            <h4 className="text-sm font-semibold">Required integrations</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Needed for Chrome-based auto-apply and Gmail verification.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium">Chrome Apply Extension</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Load <span className="font-mono">extensions/calibrate-chrome</span> in Chrome so Calibrate can operate real tabs.
              </p>
            </div>
            <div className="flex items-center justify-between py-2 px-3 border rounded-md">
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Chrome size={14} />
                  {chromeConnection?.connected ? 'Connected' : 'Not connected'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {chromeConnection?.message ?? 'Checking extension bridge…'}
                </p>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={checkChromeConnection}>
                <RefreshCw size={13} /> Check
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium">Gmail Verification</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Used only to find job-site verification codes or magic links during automatic account creation.
              </p>
            </div>
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>OAuth Client ID</Label>
                <Input
                  value={gmailClientId}
                  onChange={(e) => setGmailClientId(e.target.value)}
                  placeholder="Google OAuth desktop client ID"
                />
              </div>
              <div className="space-y-1.5">
                <Label>OAuth Client Secret</Label>
                <Input
                  value={gmailClientSecret}
                  onChange={(e) => setGmailClientSecret(e.target.value)}
                  type="password"
                  placeholder="Google OAuth desktop client secret"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => save({
                    gmailOAuthClientId: gmailClientId.trim() || undefined,
                    gmailOAuthClientSecret: gmailClientSecret.trim() || undefined
                  })}
                >
                  Save Gmail OAuth Config
                </Button>
                <Button size="sm" onClick={connectGmail}>Connect Gmail</Button>
                {gmail?.status !== 'disconnected' && (
                  <Button size="sm" variant="ghost" onClick={disconnectGmail}>Disconnect</Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Status: {gmail?.status ?? 'unknown'}{gmail?.email ? ` (${gmail.email})` : ''}{gmail?.message ? ` — ${gmail.message}` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Default AI Model — only shown when at least one provider is ready */}
      {(() => {
        const availableProviders = ALL_PROVIDERS.filter(
          (p) => !KEY_REQUIRED[p] || settings.configuredProviders.includes(p)
        )
        if (availableProviders.length === 0) return null
        const currentProvider = availableProviders.includes(settings.preferredProvider)
          ? settings.preferredProvider
          : availableProviders[0]
        return (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Default AI Model</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Used for resume generation and PDF profile import.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Provider</Label>
                <Select
                  value={currentProvider}
                  onValueChange={(v) => save({ preferredProvider: v as AIProvider })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProviders.map((p) => (
                      <SelectItem key={p} value={p}>{PROVIDER_LABELS[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Model</Label>
                <Select
                  value={settings.preferredModels[currentProvider]}
                  onValueChange={(v) =>
                    save({
                      preferredModels: { ...settings.preferredModels, [currentProvider]: v }
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(PROVIDER_MODELS[currentProvider] ?? [settings.preferredModels[currentProvider]]).map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )
      })()}

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

      <Separator />

      {/* Application Defaults */}
      <div className="space-y-5">
        <div>
          <h3 className="font-semibold">Application Defaults</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Required for autonomous job submission. Set once; applied to every application.
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Work Authorization</Label>
              <Select
                value={appDefaults.workAuthorized ? 'yes' : 'no'}
                onValueChange={(v) => setAppDefaults((d) => ({ ...d, workAuthorized: v === 'yes' }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Authorized to work</SelectItem>
                  <SelectItem value="no">Not authorized</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Visa Sponsorship</Label>
              <Select
                value={appDefaults.requiresSponsorship ? 'yes' : 'no'}
                onValueChange={(v) => setAppDefaults((d) => ({ ...d, requiresSponsorship: v === 'yes' }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">Does not require sponsorship</SelectItem>
                  <SelectItem value="yes">Requires sponsorship</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-1">
            EEO Voluntary Disclosures
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select
                value={appDefaults.eeoGender ?? ''}
                onValueChange={(v) => setAppDefaults((d) => ({ ...d, eeoGender: v || undefined }))}
              >
                <SelectTrigger><SelectValue placeholder="Not set" /></SelectTrigger>
                <SelectContent>
                  {EEO_GENDER_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Race / Ethnicity</Label>
              <Select
                value={appDefaults.eeoRace ?? ''}
                onValueChange={(v) => setAppDefaults((d) => ({ ...d, eeoRace: v || undefined }))}
              >
                <SelectTrigger><SelectValue placeholder="Not set" /></SelectTrigger>
                <SelectContent>
                  {EEO_RACE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Veteran Status</Label>
              <Select
                value={appDefaults.eeoVeteran ?? ''}
                onValueChange={(v) => setAppDefaults((d) => ({ ...d, eeoVeteran: v || undefined }))}
              >
                <SelectTrigger><SelectValue placeholder="Not set" /></SelectTrigger>
                <SelectContent>
                  {EEO_VETERAN_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Disability Status</Label>
              <Select
                value={appDefaults.eeoDisability ?? ''}
                onValueChange={(v) => setAppDefaults((d) => ({ ...d, eeoDisability: v || undefined }))}
              >
                <SelectTrigger><SelectValue placeholder="Not set" /></SelectTrigger>
                <SelectContent>
                  {EEO_DISABILITY_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Button size="sm" onClick={handleSaveDefaults} className="flex items-center gap-2">
          {defaultsSaved ? <><Check size={14} /> Saved</> : 'Save Application Defaults'}
        </Button>
      </div>

      <Separator />

      {/* ATS Sessions */}
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold">ATS Sessions</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Log in to each platform once. Sessions persist automatically across app restarts.
          </p>
        </div>
        <div className="space-y-2">
          {ATS_DOMAINS.map(({ label, domain }) => (
            <div key={domain} className="flex items-center justify-between py-2 px-3 border rounded-md">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{domain}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => authenticateSession(domain)}
                >
                  <LogIn size={13} /> Log in
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-muted-foreground"
                  title="Clear saved session"
                  onClick={() => clearSession(domain)}
                >
                  <X size={13} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

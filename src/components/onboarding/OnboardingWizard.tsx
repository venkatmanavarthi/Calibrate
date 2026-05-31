import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Check, Wand2, User, FileText, ArrowRight } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSettingsStore } from '@/stores/settings.store'
import type { AIProvider } from '@/types/models'

const PROVIDERS: { id: AIProvider; label: string; needsKey: boolean }[] = [
  { id: 'anthropic', label: 'Anthropic (Claude)', needsKey: true },
  { id: 'openai', label: 'OpenAI (GPT)', needsKey: true },
  { id: 'gemini', label: 'Google (Gemini)', needsKey: true },
  { id: 'groq', label: 'Groq', needsKey: true },
  { id: 'deepseek', label: 'DeepSeek', needsKey: true },
  { id: 'lmstudio', label: 'LM Studio (local, no key needed)', needsKey: false }
]

interface StepDotProps {
  step: number
  current: number
  total: number
}

function StepDots({ step, current, total }: StepDotProps) {
  return (
    <div className="flex gap-2 justify-center mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i < current ? 'w-6 bg-primary' : i === current ? 'w-6 bg-primary/60' : 'w-4 bg-muted'
          }`}
        />
      ))}
    </div>
  )
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Wand2 size={28} className="text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Welcome to Calibrate</h2>
        <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto">
          Tailor your resume to any job in seconds — using your own AI key, so your data never leaves your machine.
        </p>
      </div>

      <div className="text-left bg-muted/40 rounded-lg p-4 space-y-2.5 max-w-xs mx-auto">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">You'll need</p>
        <div className="flex items-start gap-2.5">
          <div className="w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          </div>
          <p className="text-sm">An API key from Anthropic, OpenAI, Gemini, Groq, or DeepSeek — or a local LM Studio server</p>
        </div>
        <div className="flex items-start gap-2.5">
          <div className="w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          </div>
          <p className="text-sm">Your work history and skills (your experience profile)</p>
        </div>
      </div>

      <Button size="lg" onClick={onNext} className="gap-2">
        Get Started <ArrowRight size={16} />
      </Button>
    </div>
  )
}

function AISetupStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const { settings, setKey } = useSettingsStore()
  const [provider, setProvider] = useState<AIProvider>('anthropic')
  const [keyValue, setKeyValue] = useState('')
  const [show, setShow] = useState(false)
  const [hasKey, setHasKey] = useState(false)
  const [saving, setSaving] = useState(false)

  const selectedProvider = PROVIDERS.find((p) => p.id === provider)!
  const canProceed = !selectedProvider.needsKey || hasKey

  useEffect(() => {
    if (settings?.preferredProvider) {
      setProvider(settings.preferredProvider)
    }
  }, [settings])

  useEffect(() => {
    window.api.settingsHasKey(provider).then(({ hasKey: hk }) => setHasKey(hk))
    setKeyValue('')
  }, [provider])

  const handleSave = async () => {
    if (!keyValue.trim()) return
    setSaving(true)
    await setKey(provider, keyValue.trim())
    setKeyValue('')
    setHasKey(true)
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold">Connect an AI provider</h2>
        <p className="text-muted-foreground text-sm">Your key is stored encrypted on your device.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Provider</Label>
          <Select value={provider} onValueChange={(v) => setProvider(v as AIProvider)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedProvider.needsKey && (
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2">
              API Key
              {hasKey && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 font-normal">
                  <Check size={12} /> Saved
                </span>
              )}
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={show ? 'text' : 'password'}
                  placeholder={hasKey ? '••••••••••••••••••' : 'Paste your API key…'}
                  value={keyValue}
                  onChange={(e) => setKeyValue(e.target.value)}
                  className="pr-9"
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <Button size="sm" disabled={!keyValue.trim() || saving} onClick={handleSave}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        )}

        {!selectedProvider.needsKey && (
          <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">
            LM Studio runs locally — no API key required. Make sure LM Studio is running with a model loaded before generating.
          </p>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
          Skip for now
        </Button>
        <Button onClick={onNext} disabled={!canProceed} className="flex-1 gap-2">
          Next <ArrowRight size={15} />
        </Button>
      </div>
    </div>
  )
}

function DoneStep({ onGoToDashboard, onCreateProfile }: { onGoToDashboard: () => void; onCreateProfile: () => void }) {
  const nextSteps = [
    { icon: User, label: 'Create an experience profile', sub: 'Your work history, skills, and projects' },
    { icon: FileText, label: 'Pick or create a template', sub: 'The structure and style of your resume' },
    { icon: Wand2, label: 'Generate your first resume', sub: 'Paste a job description and let AI do the work' }
  ]

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold">You're almost ready</h2>
        <p className="text-muted-foreground text-sm">Three quick steps and you'll have your first tailored resume.</p>
      </div>

      <div className="space-y-2.5">
        {nextSteps.map(({ icon: Icon, label, sub }, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
            <div className="w-7 h-7 rounded-full bg-background border flex items-center justify-center flex-shrink-0">
              <Icon size={13} className="text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-1">
        <Button variant="outline" onClick={onGoToDashboard} className="flex-1">
          Go to Dashboard
        </Button>
        <Button onClick={onCreateProfile} className="flex-1 gap-2">
          Create Profile <ArrowRight size={15} />
        </Button>
      </div>
    </div>
  )
}

export default function OnboardingWizard() {
  const { settings, save } = useSettingsStore()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  const isOpen = settings !== null && !settings.onboardingCompleted

  const complete = async () => {
    await save({ onboardingCompleted: true })
  }

  const handleSkip = async () => {
    await complete()
  }

  const handleGoToDashboard = async () => {
    await complete()
    navigate('/')
  }

  const handleCreateProfile = async () => {
    await complete()
    navigate('/profiles/new')
  }

  if (!isOpen) return null

  return (
    <Dialog open modal onOpenChange={(open) => { if (!open) handleSkip() }}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <StepDots step={step} current={step} total={3} />

        {step === 0 && <WelcomeStep onNext={() => setStep(1)} />}
        {step === 1 && <AISetupStep onNext={() => setStep(2)} onSkip={() => setStep(2)} />}
        {step === 2 && <DoneStep onGoToDashboard={handleGoToDashboard} onCreateProfile={handleCreateProfile} />}
      </DialogContent>
    </Dialog>
  )
}

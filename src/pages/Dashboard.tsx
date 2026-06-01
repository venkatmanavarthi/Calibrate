import { useNavigate } from 'react-router-dom'
import { User, Wand2, ArrowRight, Check, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProfilesStore } from '@/stores/profiles.store'
import { useSettingsStore } from '@/stores/settings.store'
import { formatDate } from '@/lib/utils'

interface ChecklistItemProps {
  done: boolean
  label: string
  actionLabel: string
  onAction: () => void
}

function ChecklistItem({ done, label, actionLabel, onAction }: ChecklistItemProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      {done
        ? <Check size={15} className="text-green-600 flex-shrink-0" />
        : <Circle size={15} className="text-muted-foreground/50 flex-shrink-0" />
      }
      <span className={`text-sm flex-1 ${done ? 'line-through text-muted-foreground' : ''}`}>{label}</span>
      {!done && (
        <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const profiles = useProfilesStore((s) => s.profiles)
  const settings = useSettingsStore((s) => s.settings)

  const recentProfiles = profiles.slice(0, 3)

  const hasProvider = (settings?.configuredProviders.length ?? 0) > 0 || settings?.preferredProvider === 'lmstudio'
  const hasProfile = profiles.length > 0
  const allSetUp = hasProvider && hasProfile

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Welcome back</h2>
        <p className="text-muted-foreground mt-1">
          Tailor your resume to any job in seconds — using your own AI key.
        </p>
      </div>

      {!allSetUp && (
        <div className="mb-6 border rounded-lg p-4 bg-muted/30">
          <p className="text-sm font-semibold mb-2">Getting started</p>
          <div className="divide-y">
            <ChecklistItem
              done={hasProvider}
              label="Configure an AI provider"
              actionLabel="Set up →"
              onAction={() => navigate('/settings')}
            />
            <ChecklistItem
              done={hasProfile}
              label="Create an experience profile"
              actionLabel="Create →"
              onAction={() => navigate('/profiles/new')}
            />
          </div>
        </div>
      )}

      <div className="mb-8">
        <Button size="lg" onClick={() => navigate('/generate')} className="gap-2">
          <Wand2 size={18} />
          Generate a Resume
          <ArrowRight size={16} />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Recent Profiles */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <User size={16} /> Experience Profiles
            </h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/profiles')}>
              View all
            </Button>
          </div>
          {recentProfiles.length === 0 ? (
            <div className="border border-dashed rounded-lg p-6 text-center">
              <p className="text-muted-foreground text-sm">No profiles yet.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/profiles/new')}>
                Create profile
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentProfiles.map((p) => (
                <div
                  key={p.id}
                  className="border rounded-lg p-3 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => navigate(`/profiles/${p.id}`)}
                >
                  <p className="font-medium text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Updated {formatDate(p.updatedAt.slice(0, 7))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

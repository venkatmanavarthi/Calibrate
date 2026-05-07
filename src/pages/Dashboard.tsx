import { useNavigate } from 'react-router-dom'
import { User, FileText, Wand2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProfilesStore } from '@/stores/profiles.store'
import { useTemplatesStore } from '@/stores/templates.store'
import { formatDate } from '@/lib/utils'

export default function Dashboard() {
  const navigate = useNavigate()
  const profiles = useProfilesStore((s) => s.profiles)
  const templates = useTemplatesStore((s) => s.templates)

  const recentProfiles = profiles.slice(0, 3)
  const recentTemplates = templates.slice(0, 3)

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Welcome back</h2>
        <p className="text-muted-foreground mt-1">
          Tailor your resume to any job in seconds — using your own AI key.
        </p>
      </div>

      <div className="mb-8">
        <Button size="lg" onClick={() => navigate('/generate')} className="gap-2">
          <Wand2 size={18} />
          Generate a Resume
          <ArrowRight size={16} />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
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

        {/* Recent Templates */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText size={16} /> Resume Templates
            </h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/templates')}>
              View all
            </Button>
          </div>
          {recentTemplates.length === 0 ? (
            <div className="border border-dashed rounded-lg p-6 text-center">
              <p className="text-muted-foreground text-sm">No templates yet.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/templates/new')}>
                Create template
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTemplates.map((t) => (
                <div
                  key={t.id}
                  className="border rounded-lg p-3 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => navigate(`/templates/${t.id}`)}
                >
                  <p className="font-medium text-sm">{t.name}</p>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

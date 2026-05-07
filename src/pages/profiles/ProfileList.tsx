import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Upload, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProfilesStore } from '@/stores/profiles.store'
import { generateId, now } from '@/lib/utils'
import type { ExperienceProfile } from '@/types/models'

export default function ProfileList() {
  const navigate = useNavigate()
  const { profiles, save, remove } = useProfilesStore()

  const handleDuplicate = async (profile: ExperienceProfile) => {
    const copy: ExperienceProfile = {
      ...profile,
      id: generateId(),
      name: `${profile.name} (copy)`,
      createdAt: now(),
      updatedAt: now()
    }
    await save(copy)
  }

  const handleExport = async () => {
    await window.api.exportData()
  }

  const handleImport = async () => {
    const result = await window.api.importData()
    if (result.imported) {
      await useProfilesStore.getState().load()
      alert(`Imported ${result.profileCount} profile(s) and ${result.templateCount} template(s).`)
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Experience Profiles</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Each profile stores your real experience for a particular focus area.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleImport} className="gap-1.5">
            <Upload size={14} /> Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download size={14} /> Export
          </Button>
          <Button size="sm" onClick={() => navigate('/profiles/new')} className="gap-1.5">
            <Plus size={14} /> New Profile
          </Button>
        </div>
      </div>

      {profiles.length === 0 ? (
        <div className="border border-dashed rounded-xl p-12 text-center">
          <p className="text-muted-foreground">No profiles yet. Create your first one.</p>
          <Button className="mt-4" onClick={() => navigate('/profiles/new')}>
            Create Profile
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {profiles.map((profile) => (
            <div key={profile.id} className="border rounded-lg p-4 flex items-center justify-between hover:bg-accent/30 transition-colors">
              <div className="min-w-0">
                <p className="font-semibold truncate">{profile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {profile.workHistory.length} jobs · {profile.skills.length} skills · {profile.projects.length} projects
                </p>
              </div>
              <div className="flex gap-1.5 ml-4 flex-shrink-0">
                <Button variant="ghost" size="sm" onClick={() => handleDuplicate(profile)}>
                  Duplicate
                </Button>
                <Button variant="ghost" size="icon" onClick={() => navigate(`/profiles/${profile.id}`)}>
                  <Pencil size={15} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Delete "${profile.name}"?`)) remove(profile.id)
                  }}
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

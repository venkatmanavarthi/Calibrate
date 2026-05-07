import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useProfilesStore } from '@/stores/profiles.store'
import { generateId, now } from '@/lib/utils'
import type { ExperienceProfile, WorkEntry, ProjectEntry, EducationEntry, CertificationEntry, StarStory, AccomplishmentEntry } from '@/types/models'

const emptyProfile = (): ExperienceProfile => ({
  id: generateId(),
  name: 'New Profile',
  createdAt: now(),
  updatedAt: now(),
  personalInfo: { fullName: '', email: '' },
  skills: [],
  workHistory: [],
  projects: [],
  education: [],
  certifications: [],
  starStories: [],
  accomplishments: []
})

export default function ProfileEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profiles, save } = useProfilesStore()
  const [profile, setProfile] = useState<ExperienceProfile>(emptyProfile)
  const [skillInput, setSkillInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (id) {
      const found = profiles.find((p) => p.id === id)
      if (found) setProfile(found)
    }
  }, [id, profiles])

  const handleSave = async () => {
    setSaving(true)
    await save({ ...profile, updatedAt: now() })
    setSaving(false)
    navigate('/profiles')
  }

  const update = (partial: Partial<ExperienceProfile>) =>
    setProfile((p) => ({ ...p, ...partial }))

  const updatePersonal = (partial: Partial<typeof profile.personalInfo>) =>
    setProfile((p) => ({ ...p, personalInfo: { ...p.personalInfo, ...partial } }))

  // Work History helpers
  const addWork = () => {
    const entry: WorkEntry = { id: generateId(), company: '', title: '', startDate: '', endDate: 'present', location: '', bullets: [''], technologiesUsed: [] }
    update({ workHistory: [...profile.workHistory, entry] })
  }
  const updateWork = (idx: number, partial: Partial<WorkEntry>) =>
    update({ workHistory: profile.workHistory.map((w, i) => i === idx ? { ...w, ...partial } : w) })
  const removeWork = (idx: number) =>
    update({ workHistory: profile.workHistory.filter((_, i) => i !== idx) })

  // Project helpers
  const addProject = () => {
    const entry: ProjectEntry = { id: generateId(), name: '', description: '', technologiesUsed: [], bullets: [''] }
    update({ projects: [...profile.projects, entry] })
  }
  const updateProject = (idx: number, partial: Partial<ProjectEntry>) =>
    update({ projects: profile.projects.map((p, i) => i === idx ? { ...p, ...partial } : p) })
  const removeProject = (idx: number) =>
    update({ projects: profile.projects.filter((_, i) => i !== idx) })

  // Education helpers
  const addEducation = () => {
    const entry: EducationEntry = { id: generateId(), institution: '', degree: '', field: '', graduationDate: '' }
    update({ education: [...profile.education, entry] })
  }
  const updateEducation = (idx: number, partial: Partial<EducationEntry>) =>
    update({ education: profile.education.map((e, i) => i === idx ? { ...e, ...partial } : e) })
  const removeEducation = (idx: number) =>
    update({ education: profile.education.filter((_, i) => i !== idx) })

  // Cert helpers
  const addCert = () => {
    const entry: CertificationEntry = { id: generateId(), name: '', issuer: '', issueDate: '' }
    update({ certifications: [...profile.certifications, entry] })
  }
  const removeCert = (idx: number) =>
    update({ certifications: profile.certifications.filter((_, i) => i !== idx) })
  const updateCert = (idx: number, partial: Partial<CertificationEntry>) =>
    update({ certifications: profile.certifications.map((c, i) => i === idx ? { ...c, ...partial } : c) })

  // STAR helpers
  const addStar = () => {
    const entry: StarStory = { id: generateId(), title: '', situation: '', task: '', action: '', result: '', tags: [] }
    update({ starStories: [...profile.starStories, entry] })
  }
  const removeStar = (idx: number) =>
    update({ starStories: profile.starStories.filter((_, i) => i !== idx) })
  const updateStar = (idx: number, partial: Partial<StarStory>) =>
    update({ starStories: profile.starStories.map((s, i) => i === idx ? { ...s, ...partial } : s) })

  // Accomplishment helpers
  const addAccomplishment = () => {
    const entry: AccomplishmentEntry = { id: generateId(), title: '', description: '', impact: '', date: '' }
    update({ accomplishments: [...profile.accomplishments, entry] })
  }
  const removeAccomplishment = (idx: number) =>
    update({ accomplishments: profile.accomplishments.filter((_, i) => i !== idx) })
  const updateAccomplishment = (idx: number, partial: Partial<AccomplishmentEntry>) =>
    update({ accomplishments: profile.accomplishments.map((a, i) => i === idx ? { ...a, ...partial } : a) })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate('/profiles')}>
          <ArrowLeft size={18} />
        </Button>
        <Input
          value={profile.name}
          onChange={(e) => update({ name: e.target.value })}
          className="max-w-xs font-semibold text-base border-0 shadow-none focus-visible:ring-0 px-0"
          placeholder="Profile name"
        />
        <div className="ml-auto">
          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
            <Save size={14} /> {saving ? 'Saving…' : 'Save Profile'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="personal" className="h-full flex flex-col">
          <TabsList className="mx-6 mt-4 w-auto justify-start">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="work">Work History</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="education">Education</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="certs">Certifications</TabsTrigger>
            <TabsTrigger value="star">STAR Stories</TabsTrigger>
            <TabsTrigger value="accomplishments">Accomplishments</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto px-6 py-4">
            {/* Personal Info */}
            <TabsContent value="personal" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Full Name *</Label>
                  <Input value={profile.personalInfo.fullName} onChange={(e) => updatePersonal({ fullName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email *</Label>
                  <Input type="email" value={profile.personalInfo.email} onChange={(e) => updatePersonal({ email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={profile.personalInfo.phone ?? ''} onChange={(e) => updatePersonal({ phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <Input value={profile.personalInfo.location ?? ''} onChange={(e) => updatePersonal({ location: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>LinkedIn URL</Label>
                  <Input value={profile.personalInfo.linkedinUrl ?? ''} onChange={(e) => updatePersonal({ linkedinUrl: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>GitHub URL</Label>
                  <Input value={profile.personalInfo.githubUrl ?? ''} onChange={(e) => updatePersonal({ githubUrl: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Website URL</Label>
                  <Input value={profile.personalInfo.websiteUrl ?? ''} onChange={(e) => updatePersonal({ websiteUrl: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Personal Summary (your own words — not AI generated)</Label>
                <Textarea
                  rows={4}
                  value={profile.personalInfo.summary ?? ''}
                  onChange={(e) => updatePersonal({ summary: e.target.value })}
                  placeholder="Brief bio in your own words..."
                />
              </div>
            </TabsContent>

            {/* Work History */}
            <TabsContent value="work" className="mt-0 space-y-4">
              {profile.workHistory.map((work, idx) => (
                <div key={work.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-semibold text-muted-foreground">Position {idx + 1}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeWork(idx)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Company</Label>
                      <Input value={work.company} onChange={(e) => updateWork(idx, { company: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Title</Label>
                      <Input value={work.title} onChange={(e) => updateWork(idx, { title: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Start Date (YYYY-MM)</Label>
                      <Input placeholder="2022-01" value={work.startDate} onChange={(e) => updateWork(idx, { startDate: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>End Date (YYYY-MM or "present")</Label>
                      <Input placeholder="present" value={work.endDate} onChange={(e) => updateWork(idx, { endDate: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Location</Label>
                      <Input value={work.location} onChange={(e) => updateWork(idx, { location: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Technologies (comma-separated)</Label>
                      <Input
                        value={work.technologiesUsed.join(', ')}
                        onChange={(e) => updateWork(idx, { technologiesUsed: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Bullet points (one per line)</Label>
                    <Textarea
                      rows={4}
                      value={work.bullets.join('\n')}
                      onChange={(e) => updateWork(idx, { bullets: e.target.value.split('\n') })}
                      placeholder="Led a team of 5 engineers to ship..."
                    />
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addWork} className="gap-1.5 w-full">
                <Plus size={14} /> Add Position
              </Button>
            </TabsContent>

            {/* Projects */}
            <TabsContent value="projects" className="mt-0 space-y-4">
              {profile.projects.map((proj, idx) => (
                <div key={proj.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">Project {idx + 1}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeProject(idx)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Name</Label>
                      <Input value={proj.name} onChange={(e) => updateProject(idx, { name: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>URL (optional)</Label>
                      <Input value={proj.url ?? ''} onChange={(e) => updateProject(idx, { url: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Technologies (comma-separated)</Label>
                      <Input
                        value={proj.technologiesUsed.join(', ')}
                        onChange={(e) => updateProject(idx, { technologiesUsed: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Description</Label>
                    <Textarea rows={2} value={proj.description} onChange={(e) => updateProject(idx, { description: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Bullet points (one per line)</Label>
                    <Textarea rows={3} value={proj.bullets.join('\n')} onChange={(e) => updateProject(idx, { bullets: e.target.value.split('\n') })} />
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addProject} className="gap-1.5 w-full">
                <Plus size={14} /> Add Project
              </Button>
            </TabsContent>

            {/* Education */}
            <TabsContent value="education" className="mt-0 space-y-4">
              {profile.education.map((edu, idx) => (
                <div key={edu.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">Education {idx + 1}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeEducation(idx)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Institution</Label>
                      <Input value={edu.institution} onChange={(e) => updateEducation(idx, { institution: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Degree</Label>
                      <Input placeholder="B.S., M.S., Ph.D." value={edu.degree} onChange={(e) => updateEducation(idx, { degree: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Field of Study</Label>
                      <Input value={edu.field} onChange={(e) => updateEducation(idx, { field: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Graduation Date (YYYY-MM)</Label>
                      <Input placeholder="2019-05" value={edu.graduationDate} onChange={(e) => updateEducation(idx, { graduationDate: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>GPA (optional)</Label>
                      <Input value={edu.gpa ?? ''} onChange={(e) => updateEducation(idx, { gpa: e.target.value })} />
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addEducation} className="gap-1.5 w-full">
                <Plus size={14} /> Add Education
              </Button>
            </TabsContent>

            {/* Skills */}
            <TabsContent value="skills" className="mt-0 space-y-4">
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="Add a skill and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && skillInput.trim()) {
                      update({ skills: [...profile.skills, skillInput.trim()] })
                      setSkillInput('')
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (skillInput.trim()) {
                      update({ skills: [...profile.skills, skillInput.trim()] })
                      setSkillInput('')
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, idx) => (
                  <div key={idx} className="flex items-center gap-1 bg-secondary rounded-md px-2.5 py-1 text-sm">
                    {skill}
                    <button
                      className="ml-1 text-muted-foreground hover:text-foreground"
                      onClick={() => update({ skills: profile.skills.filter((_, i) => i !== idx) })}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Also enter each skill from comma-separated list:{' '}
                <button
                  className="underline"
                  onClick={() => {
                    const input = prompt('Paste comma-separated skills:')
                    if (input) {
                      const newSkills = input.split(',').map((s) => s.trim()).filter(Boolean)
                      update({ skills: [...new Set([...profile.skills, ...newSkills])] })
                    }
                  }}
                >
                  bulk import
                </button>
              </p>
            </TabsContent>

            {/* Certifications */}
            <TabsContent value="certs" className="mt-0 space-y-4">
              {profile.certifications.map((cert, idx) => (
                <div key={cert.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">Certification {idx + 1}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeCert(idx)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Name</Label>
                      <Input value={cert.name} onChange={(e) => updateCert(idx, { name: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Issuer</Label>
                      <Input value={cert.issuer} onChange={(e) => updateCert(idx, { issuer: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Issue Date (YYYY-MM)</Label>
                      <Input value={cert.issueDate} onChange={(e) => updateCert(idx, { issueDate: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Expiry Date (optional)</Label>
                      <Input value={cert.expiryDate ?? ''} onChange={(e) => updateCert(idx, { expiryDate: e.target.value })} />
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addCert} className="gap-1.5 w-full">
                <Plus size={14} /> Add Certification
              </Button>
            </TabsContent>

            {/* STAR Stories */}
            <TabsContent value="star" className="mt-0 space-y-4">
              <p className="text-sm text-muted-foreground">
                STAR stories (Situation, Task, Action, Result) help the AI write compelling bullet points and interview prep content.
              </p>
              {profile.starStories.map((story, idx) => (
                <div key={story.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <Input
                      className="max-w-sm font-semibold border-0 px-0 shadow-none focus-visible:ring-0"
                      placeholder="Story title..."
                      value={story.title}
                      onChange={(e) => updateStar(idx, { title: e.target.value })}
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeStar(idx)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  {(['situation', 'task', 'action', 'result'] as const).map((field) => (
                    <div key={field} className="space-y-1">
                      <Label className="capitalize">{field}</Label>
                      <Textarea
                        rows={2}
                        value={story[field]}
                        onChange={(e) => updateStar(idx, { [field]: e.target.value })}
                        placeholder={field === 'result' ? 'Include measurable outcomes...' : ''}
                      />
                    </div>
                  ))}
                  <div className="space-y-1">
                    <Label>Tags (comma-separated)</Label>
                    <Input
                      value={story.tags.join(', ')}
                      onChange={(e) => updateStar(idx, { tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                      placeholder="leadership, ml, scale"
                    />
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addStar} className="gap-1.5 w-full">
                <Plus size={14} /> Add STAR Story
              </Button>
            </TabsContent>

            {/* Accomplishments */}
            <TabsContent value="accomplishments" className="mt-0 space-y-4">
              {profile.accomplishments.map((acc, idx) => (
                <div key={acc.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">Accomplishment {idx + 1}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeAccomplishment(idx)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Title</Label>
                      <Input value={acc.title} onChange={(e) => updateAccomplishment(idx, { title: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Date (YYYY-MM)</Label>
                      <Input value={acc.date} onChange={(e) => updateAccomplishment(idx, { date: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Description</Label>
                    <Textarea rows={2} value={acc.description} onChange={(e) => updateAccomplishment(idx, { description: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Quantified Impact</Label>
                    <Input value={acc.impact} onChange={(e) => updateAccomplishment(idx, { impact: e.target.value })} placeholder="Reduced latency by 40%..." />
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addAccomplishment} className="gap-1.5 w-full">
                <Plus size={14} /> Add Accomplishment
              </Button>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}

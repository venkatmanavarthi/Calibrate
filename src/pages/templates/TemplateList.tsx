import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Copy, FileText, Share2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTemplatesStore } from '@/stores/templates.store'
import { generateId, now } from '@/lib/utils'
import type { ResumeTemplate } from '@/types/models'

// SVG layout thumbnails for each preset
const PRESET_THUMBNAILS: Record<string, React.ReactNode> = {
  'preset-ats-single-column': (
    <svg viewBox="0 0 80 104" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="80" height="104" fill="white" />
      <rect x="8" y="6" width="64" height="3" rx="1" fill="#333" />
      <rect x="16" y="11" width="48" height="1.5" rx="0.5" fill="#888" />
      <rect x="8" y="18" width="30" height="1.5" rx="0.5" fill="#555" />
      <rect x="8" y="21" width="64" height="0.5" fill="#ccc" />
      <rect x="8" y="24" width="60" height="1" rx="0.5" fill="#bbb" />
      <rect x="8" y="27" width="56" height="1" rx="0.5" fill="#bbb" />
      <rect x="8" y="33" width="30" height="1.5" rx="0.5" fill="#555" />
      <rect x="8" y="36" width="64" height="0.5" fill="#ccc" />
      <rect x="8" y="39" width="44" height="1" rx="0.5" fill="#333" />
      <rect x="8" y="42" width="36" height="1" rx="0.5" fill="#999" />
      <rect x="8" y="46" width="58" height="0.8" rx="0.4" fill="#bbb" />
      <rect x="8" y="49" width="54" height="0.8" rx="0.4" fill="#bbb" />
      <rect x="8" y="56" width="30" height="1.5" rx="0.5" fill="#555" />
      <rect x="8" y="59" width="64" height="0.5" fill="#ccc" />
      <rect x="8" y="62" width="40" height="1" rx="0.5" fill="#333" />
      <rect x="8" y="65" width="32" height="0.8" rx="0.4" fill="#999" />
      <rect x="8" y="68" width="56" height="0.8" rx="0.4" fill="#bbb" />
      <rect x="8" y="71" width="50" height="0.8" rx="0.4" fill="#bbb" />
    </svg>
  ),
  'preset-skills-first-technical': (
    <svg viewBox="0 0 80 104" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="80" height="104" fill="white" />
      <rect x="8" y="6" width="64" height="3" rx="1" fill="#333" />
      <rect x="16" y="11" width="48" height="1.5" rx="0.5" fill="#888" />
      <rect x="8" y="18" width="30" height="1.5" rx="0.5" fill="#555" />
      <rect x="8" y="21" width="64" height="0.5" fill="#ccc" />
      <rect x="8" y="24" width="24" height="1" rx="0.5" fill="#777" />
      <rect x="34" y="24" width="38" height="1" rx="0.5" fill="#bbb" />
      <rect x="8" y="27" width="20" height="1" rx="0.5" fill="#777" />
      <rect x="30" y="27" width="42" height="1" rx="0.5" fill="#bbb" />
      <rect x="8" y="30" width="22" height="1" rx="0.5" fill="#777" />
      <rect x="32" y="30" width="40" height="1" rx="0.5" fill="#bbb" />
      <rect x="8" y="36" width="30" height="1.5" rx="0.5" fill="#555" />
      <rect x="8" y="39" width="64" height="0.5" fill="#ccc" />
      <rect x="8" y="42" width="44" height="1" rx="0.5" fill="#333" />
      <rect x="8" y="45" width="36" height="1" rx="0.5" fill="#999" />
      <rect x="8" y="48" width="58" height="0.8" rx="0.4" fill="#bbb" />
      <rect x="8" y="51" width="52" height="0.8" rx="0.4" fill="#bbb" />
      <rect x="8" y="57" width="30" height="1.5" rx="0.5" fill="#555" />
      <rect x="8" y="60" width="64" height="0.5" fill="#ccc" />
      <rect x="8" y="63" width="40" height="1" rx="0.5" fill="#333" />
      <rect x="8" y="66" width="32" height="0.8" rx="0.4" fill="#bbb" />
      <rect x="8" y="69" width="50" height="0.8" rx="0.4" fill="#bbb" />
    </svg>
  ),
  'preset-executive': (
    <svg viewBox="0 0 80 104" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="80" height="104" fill="white" />
      <rect x="8" y="6" width="64" height="4" rx="1" fill="#333" />
      <rect x="12" y="12" width="56" height="1.5" rx="0.5" fill="#888" />
      <rect x="8" y="19" width="30" height="1.5" rx="0.5" fill="#555" />
      <rect x="8" y="22" width="64" height="0.5" fill="#ccc" />
      <rect x="8" y="25" width="62" height="1" rx="0.5" fill="#bbb" />
      <rect x="8" y="28" width="58" height="1" rx="0.5" fill="#bbb" />
      <rect x="8" y="31" width="60" height="1" rx="0.5" fill="#bbb" />
      <rect x="8" y="37" width="30" height="1.5" rx="0.5" fill="#555" />
      <rect x="8" y="40" width="64" height="0.5" fill="#ccc" />
      <rect x="8" y="43" width="48" height="1" rx="0.5" fill="#333" />
      <rect x="8" y="46" width="36" height="0.8" rx="0.4" fill="#999" />
      <rect x="8" y="49" width="60" height="0.8" rx="0.4" fill="#bbb" />
      <rect x="8" y="52" width="54" height="0.8" rx="0.4" fill="#bbb" />
      <rect x="8" y="58" width="25" height="1.5" rx="0.5" fill="#555" />
      <rect x="8" y="61" width="64" height="0.5" fill="#ccc" />
      <rect x="8" y="64" width="40" height="1" rx="0.5" fill="#333" />
      <rect x="8" y="67" width="32" height="0.8" rx="0.4" fill="#999" />
    </svg>
  ),
  'preset-portfolio-creative': (
    <svg viewBox="0 0 80 104" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="80" height="104" fill="white" />
      <rect x="8" y="6" width="64" height="3" rx="1" fill="#333" />
      <rect x="10" y="11" width="60" height="1.5" rx="0.5" fill="#888" />
      <rect x="8" y="18" width="35" height="1.5" rx="0.5" fill="#555" />
      <rect x="8" y="21" width="64" height="0.5" fill="#ccc" />
      <rect x="8" y="24" width="42" height="1" rx="0.5" fill="#333" />
      <rect x="8" y="27" width="30" height="0.8" rx="0.4" fill="#999" />
      <rect x="8" y="30" width="56" height="0.8" rx="0.4" fill="#bbb" />
      <rect x="8" y="33" width="50" height="0.8" rx="0.4" fill="#bbb" />
      <rect x="8" y="37" width="42" height="1" rx="0.5" fill="#333" />
      <rect x="8" y="40" width="28" height="0.8" rx="0.4" fill="#999" />
      <rect x="8" y="43" width="54" height="0.8" rx="0.4" fill="#bbb" />
      <rect x="8" y="49" width="30" height="1.5" rx="0.5" fill="#555" />
      <rect x="8" y="52" width="64" height="0.5" fill="#ccc" />
      <rect x="8" y="55" width="44" height="1" rx="0.5" fill="#333" />
      <rect x="8" y="58" width="36" height="0.8" rx="0.4" fill="#999" />
      <rect x="8" y="62" width="25" height="1.5" rx="0.5" fill="#555" />
      <rect x="8" y="65" width="64" height="0.5" fill="#ccc" />
      <rect x="8" y="68" width="60" height="0.8" rx="0.4" fill="#bbb" />
      <rect x="8" y="71" width="52" height="0.8" rx="0.4" fill="#bbb" />
    </svg>
  ),
}

const DEFAULT_TEMPLATE = `# {{FULL_NAME}}
{{EMAIL}} | {{PHONE}} | {{LOCATION}}
{{LINKEDIN}} | {{GITHUB}}

## Summary

{{SUMMARY}}

## Experience

<!-- Format each entry exactly as shown below (role first, date right-aligned): -->
**{{JOB_TITLE}}**, {{COMPANY}} — {{LOCATION}} <span style="float:right">{{START_DATE}} – {{END_DATE}}</span>

- {{ACHIEVEMENT_1}}
- {{ACHIEVEMENT_2}}

(repeat for each position from WORK_HISTORY)

## Projects

{{PROJECTS}}

## Education

<!-- Format each entry exactly as shown below (degree and institution first, date right-aligned): -->
**{{DEGREE}} in {{FIELD}}**, {{INSTITUTION}} <span style="float:right">{{GRADUATION_DATE}}</span>

(repeat for each entry from EDUCATION)

## Skills

{{SKILLS}}

## Certifications

{{CERTIFICATIONS}}
`

export default function TemplateList() {
  const navigate = useNavigate()
  const { templates, save, remove } = useTemplatesStore()

  const presetTemplates = templates.filter((t) => t.preset)
  const userTemplates = templates.filter((t) => !t.preset)

  const handleUsePreset = async (template: ResumeTemplate) => {
    const copy: ResumeTemplate = {
      ...template,
      id: generateId(),
      name: template.name,
      preset: undefined,
      createdAt: now(),
      updatedAt: now(),
    }
    await save(copy)
    navigate(`/templates/${copy.id}`)
  }

  const handleDuplicate = async (template: ResumeTemplate) => {
    const copy: ResumeTemplate = {
      ...template,
      id: generateId(),
      name: `${template.name} (copy)`,
      preset: undefined,
      createdAt: now(),
      updatedAt: now()
    }
    await save(copy)
  }

  const handleCreate = async () => {
    const newTemplate: ResumeTemplate = {
      id: generateId(),
      name: 'New Template',
      markdownContent: DEFAULT_TEMPLATE,
      createdAt: now(),
      updatedAt: now()
    }
    await save(newTemplate)
    navigate(`/templates/${newTemplate.id}`)
  }

  return (
    <div className="p-8 max-w-4xl space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Resume Templates</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Markdown templates define the structure and formatting of your generated resume.
          </p>
        </div>
        <Button size="sm" onClick={handleCreate} className="gap-1.5">
          <Plus size={14} /> New Template
        </Button>
      </div>

      {/* Preset gallery */}
      {presetTemplates.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Preset Templates</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {presetTemplates.map((template) => (
              <div
                key={template.id}
                className="border rounded-lg overflow-hidden hover:border-primary/50 hover:shadow-md transition-all group"
              >
                <div className="bg-muted/30 p-2 aspect-[11/14.3] flex items-center justify-center border-b">
                  <div className="w-full h-full max-w-[80px] mx-auto">
                    {PRESET_THUMBNAILS[template.id] ?? (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText size={24} className="text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-semibold leading-tight">{template.name}</p>
                  {template.description && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{template.description}</p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2 h-6 text-xs gap-1"
                    onClick={() => handleUsePreset(template)}
                  >
                    <Download size={10} /> Use this
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* User templates */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">My Templates</h3>
        {userTemplates.length === 0 ? (
          <div className="border border-dashed rounded-xl p-10 text-center space-y-3">
            <FileText size={28} className="mx-auto text-muted-foreground/40" />
            <div className="space-y-1">
              <p className="font-medium">No custom templates yet</p>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                Use a preset above or create your own template in Markdown.
              </p>
            </div>
            <Button size="sm" onClick={handleCreate} className="mt-1">
              Create Template
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {userTemplates.map((template) => (
              <div key={template.id} className="border rounded-lg p-4 flex items-center justify-between hover:bg-accent/30 transition-colors">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{template.name}</p>
                  {template.description && (
                    <p className="text-sm text-muted-foreground truncate">{template.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {template.markdownContent.split('\n').length} lines
                  </p>
                </div>
                <div className="flex gap-1.5 ml-4 flex-shrink-0">
                  <Button variant="ghost" size="icon" title="Share as .calibrate" onClick={() => window.api.templatesExportCalibrate(template.id)}>
                    <Share2 size={15} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDuplicate(template)}>
                    <Copy size={15} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/templates/${template.id}`)}>
                    <Pencil size={15} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Delete "${template.name}"?`)) remove(template.id)
                    }}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

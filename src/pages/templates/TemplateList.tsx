import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTemplatesStore } from '@/stores/templates.store'
import { generateId, now } from '@/lib/utils'
import type { ResumeTemplate } from '@/types/models'

const DEFAULT_TEMPLATE = `# {{FULL_NAME}}
{{EMAIL}} | {{PHONE}} | {{LOCATION}}
{{LINKEDIN}} | {{GITHUB}}

## Summary

{{SUMMARY}}

## Experience

{{WORK_HISTORY}}

## Projects

{{PROJECTS}}

## Education

{{EDUCATION}}

## Skills

{{SKILLS}}

## Certifications

{{CERTIFICATIONS}}
`

export default function TemplateList() {
  const navigate = useNavigate()
  const { templates, save, remove } = useTemplatesStore()

  const handleDuplicate = async (template: ResumeTemplate) => {
    const copy: ResumeTemplate = {
      ...template,
      id: generateId(),
      name: `${template.name} (copy)`,
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
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
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

      {templates.length === 0 ? (
        <div className="border border-dashed rounded-xl p-12 text-center">
          <p className="text-muted-foreground">No templates yet. Create your first one.</p>
          <Button className="mt-4" onClick={handleCreate}>
            Create Template
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {templates.map((template) => (
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
    </div>
  )
}

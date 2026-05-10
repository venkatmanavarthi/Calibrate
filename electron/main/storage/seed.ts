import fs from 'fs/promises'
import path from 'path'
import { TEMPLATES_DIR } from './index'
import type { ResumeTemplate } from '../../../src/types/models'
const PRESET_TEMPLATES: ResumeTemplate[] = [
  {
    id: 'preset-ats-single-column',
    name: 'ATS Single-Column',
    description: 'Clean single-column layout optimized for ATS parsing. Summary → Experience → Skills → Education → Certifications.',
    preset: true,
    defaultStyleHints: 'Single-column, ATS-friendly. Section headers bold and uppercase. Experience entries lead with job title.',
    markdownContent: `# {{FULL_NAME}}
{{EMAIL}} | {{PHONE}} | {{LOCATION}} | {{LINKEDIN}}

## SUMMARY

{{SUMMARY}}

## PROFESSIONAL EXPERIENCE

<!-- For each position:
**Job Title** — Company, Location <span style="float:right">Start – End</span>
- Achievement with measurable impact
- Achievement with measurable impact
-->
{{WORK_HISTORY}}

## SKILLS

{{SKILLS}}

## EDUCATION

<!-- For each entry:
**Degree in Field**, Institution <span style="float:right">Graduation Date</span>
GPA: X.X (if notable)
-->
{{EDUCATION}}

## CERTIFICATIONS

<!-- For each certification:
**Certification Name**, Issuing Org <span style="float:right">Date</span>
-->
{{CERTIFICATIONS}}
`,
    createdAt: '2026-05-09T00:00:00.000Z',
    updatedAt: '2026-05-09T00:00:00.000Z',
  },
  {
    id: 'preset-skills-first-technical',
    name: 'Skills-First Technical',
    description: 'Leads with a grouped skills section — ideal for engineers and data scientists. Skills → Experience → Projects → Education.',
    preset: true,
    defaultStyleHints: 'Technical focus. Skills lead. Projects section prominent. Use action verbs and metrics throughout.',
    markdownContent: `# {{FULL_NAME}}
{{EMAIL}} | {{GITHUB}} | {{LINKEDIN}} | {{LOCATION}}

## TECHNICAL SKILLS

<!-- Group by category, e.g.:
**Languages:** Python, SQL, TypeScript
**Frameworks:** React, FastAPI, Spark
**Cloud & Tools:** AWS, Docker, Git
-->
{{SKILLS}}

## PROFESSIONAL EXPERIENCE

<!-- For each position:
**Job Title**, Company <span style="float:right">Start – End</span>
*Location*
- Achievement quantified with numbers
- Achievement quantified with numbers
-->
{{WORK_HISTORY}}

## PROJECTS

<!-- For each project:
**Project Name** — Brief tech stack <span style="float:right">Date</span>
- Key feature or result
- Key feature or result
-->
{{PROJECTS}}

## EDUCATION

{{EDUCATION}}
`,
    createdAt: '2026-05-09T00:00:00.000Z',
    updatedAt: '2026-05-09T00:00:00.000Z',
  },
  {
    id: 'preset-executive',
    name: 'Executive',
    description: 'Senior-level format with a strong summary and emphasis on leadership impact. Summary → Experience → Education → Awards.',
    preset: true,
    defaultStyleHints: 'Executive tone. Summary leads and is substantive. Experience focuses on strategic impact and team/revenue scale.',
    markdownContent: `# {{FULL_NAME}}
{{EMAIL}} | {{PHONE}} | {{LINKEDIN}} | {{LOCATION}}

## EXECUTIVE SUMMARY

{{SUMMARY}}

## PROFESSIONAL EXPERIENCE

<!-- For each position, emphasize scope, leadership, and business impact:
**Job Title**, Company <span style="float:right">Start – End</span>
*Location*
- Led X-person team to deliver Y, resulting in $Z impact
- Strategic initiative description with business outcome
-->
{{WORK_HISTORY}}

## EDUCATION

{{EDUCATION}}

## CERTIFICATIONS & PROFESSIONAL DEVELOPMENT

{{CERTIFICATIONS}}

## AWARDS & RECOGNITION

{{AWARDS}}
`,
    createdAt: '2026-05-09T00:00:00.000Z',
    updatedAt: '2026-05-09T00:00:00.000Z',
  },
  {
    id: 'preset-portfolio-creative',
    name: 'Portfolio / Creative',
    description: 'Leads with projects for designers, developers, and creatives. Projects → Experience → Skills → Education.',
    preset: true,
    defaultStyleHints: 'Project-first layout. Show URLs and technologies. Keep experience entries concise. Skills listed as flat keywords.',
    markdownContent: `# {{FULL_NAME}}
{{EMAIL}} | {{WEBSITE}} | {{GITHUB}} | {{LINKEDIN}}

## SELECTED PROJECTS

<!-- For each project:
**Project Name** — [Live](<url>) · [Code](<repo>) <span style="float:right">Date</span>
*Tech stack: React, Node.js, PostgreSQL*
- What it does and why it matters
- Impact or metrics
-->
{{PROJECTS}}

## EXPERIENCE

<!-- Keep concise: 2-3 bullets per role -->
{{WORK_HISTORY}}

## SKILLS

{{SKILLS}}

## EDUCATION

{{EDUCATION}}
`,
    createdAt: '2026-05-09T00:00:00.000Z',
    updatedAt: '2026-05-09T00:00:00.000Z',
  },
]

export async function seedExampleTemplates(): Promise<void> {
  const files = await fs.readdir(TEMPLATES_DIR)
  const existingIds = new Set(files.filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')))

  // Always seed presets (idempotent — only write if missing)
  await Promise.all(
    PRESET_TEMPLATES.map(async (preset) => {
      if (!existingIds.has(preset.id)) {
        const filePath = path.join(TEMPLATES_DIR, `${preset.id}.json`)
        await fs.writeFile(filePath, JSON.stringify(preset, null, 2), 'utf-8')
      }
    })
  )
}

import fs from 'fs/promises'
import path from 'path'
import { TEMPLATES_DIR } from './index'
import type { ResumeTemplate } from '../../../src/types/models'

const EXAMPLE_TEMPLATE: ResumeTemplate = {
  id: 'example-data-engineer',
  name: 'Example Template',
  description: 'Single-column layout: summary, skills by category, chronological experience, education',
  markdownContent: `# {{FULL_NAME}}
{{EMAIL}} | {{PHONE}} | {{LINKEDIN}} | {{LOCATION}}

## SUMMARY

{{SUMMARY}}

## TECHNICAL SKILLS

<!-- Group skills by category relevant to the candidate, e.g.:
- **Category:** skill1, skill2, skill3
-->
{{SKILLS}}

## PROFESSIONAL EXPERIENCE

<!-- For each position, use this format (as many bullet points as relevant):
**Job Title**, Company Location <span style="float:right">Start – End</span>
- achievement or responsibility
-->
{{WORK_HISTORY}}

## EDUCATION

<!-- For each entry, use this format:
**Degree in Field**, Institution <span style="float:right">Graduation Date</span>
-->
{{EDUCATION}}
`,
  defaultStyleHints: 'Clean single-column layout. Section headers ALL CAPS. Company name bold, role italic. Skills grouped by labeled category.',
  createdAt: '2026-05-07T00:00:00.000Z',
  updatedAt: '2026-05-07T00:00:00.000Z'
}

export async function seedExampleTemplates(): Promise<void> {
  const files = await fs.readdir(TEMPLATES_DIR)
  if (files.filter((f) => f.endsWith('.json')).length > 0) return
  const filePath = path.join(TEMPLATES_DIR, `${EXAMPLE_TEMPLATE.id}.json`)
  await fs.writeFile(filePath, JSON.stringify(EXAMPLE_TEMPLATE, null, 2), 'utf-8')
}

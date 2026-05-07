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

- **Languages:** {{SKILL_LANGUAGES}}
- **Big Data:** {{SKILL_BIG_DATA}}
- **Cloud:** {{SKILL_CLOUD}}
- **Data Engineering:** {{SKILL_DATA_ENGINEERING}}
- **APIs & Frameworks:** {{SKILL_APIS_FRAMEWORKS}}
- **Databases:** {{SKILL_DATABASES}}
- **DevOps:** {{SKILL_DEVOPS}}

## PROFESSIONAL EXPERIENCE

**{{COMPANY_1}}**, {{LOCATION_1}} &nbsp;&nbsp;&nbsp; {{START_DATE_1}} – {{END_DATE_1}}
*{{TITLE_1}}*

- {{BULLET_1_1}}
- {{BULLET_1_2}}
- {{BULLET_1_3}}
- {{BULLET_1_4}}
- {{BULLET_1_5}}
- {{BULLET_1_6}}

**{{COMPANY_2}}**, {{LOCATION_2}} &nbsp;&nbsp;&nbsp; {{START_DATE_2}} – {{END_DATE_2}}
*{{TITLE_2}}*

- {{BULLET_2_1}}
- {{BULLET_2_2}}
- {{BULLET_2_3}}
- {{BULLET_2_4}}
- {{BULLET_2_5}}
- {{BULLET_2_6}}

**{{COMPANY_3}}**, {{LOCATION_3}} &nbsp;&nbsp;&nbsp; {{START_DATE_3}} – {{END_DATE_3}}
*{{TITLE_3}}*

- {{BULLET_3_1}}
- {{BULLET_3_2}}
- {{BULLET_3_3}}
- {{BULLET_3_4}}
- {{BULLET_3_5}}

**{{COMPANY_4}}**, {{LOCATION_4}} &nbsp;&nbsp;&nbsp; {{START_DATE_4}} – {{END_DATE_4}}
*{{TITLE_4}}*

- {{BULLET_4_1}}
- {{BULLET_4_2}}

## EDUCATION

**{{INSTITUTION_1}}**, {{DEGREE_1}} in {{FIELD_1}} &nbsp;&nbsp;&nbsp; {{GRAD_DATE_1}}

**{{INSTITUTION_2}}**, {{DEGREE_2}} in {{FIELD_2}} &nbsp;&nbsp;&nbsp; {{GRAD_DATE_2}}
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

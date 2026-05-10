import type { ExperienceProfile } from '../../../../src/types/models'
import { DEFAULT_GENERATION_PROMPT } from '../../../../src/lib/default-prompts'

const SCHEMA_DESCRIPTION = `
Output ONLY a valid JSON object matching this exact TypeScript shape — no markdown fences, no explanation:

{
  "contact": {
    "name": string,
    "email"?: string,
    "phone"?: string,
    "location"?: string,
    "linkedin"?: string,
    "github"?: string,
    "website"?: string
  },
  "sections": Array<{
    "title": string,
    "layout": "entries" | "skills" | "summary",

    // layout "summary": include "text" (a paragraph string)
    "text"?: string,

    // layout "skills": include "skills" (array of skill strings)
    "skills"?: string[],

    // layout "entries": include "entries" array
    "entries"?: Array<{
      "left": string,      // primary label, e.g. company name or institution
      "right"?: string,    // right-aligned text, e.g. date range "Jan 2020 – Present"
      "subleft"?: string,  // secondary left, e.g. job title or degree
      "subright"?: string, // secondary right, e.g. location
      "bullets"?: string[],  // use **bold** to highlight 1 key phrase per bullet (metric, tech, or outcome)
      "body"?: string      // paragraph text if no bullets
    }>
  }>
}

Section layout guidance by content type:
- Experience: layout "entries" — left=company, subleft=job title, right=date range, subright=location, bullets=achievements
- Education: layout "entries" — left=institution, subleft=degree + field, right=graduation date, subright=location
- Projects: layout "entries" — left=project name, right=date range (if available), subleft=technologies used, bullets=key achievements/features
- Certifications: layout "entries" — left=certification name, subleft=issuing organization, right=issue date (and expiry if present)
- Awards & Honors: layout "entries" — left=award name, subleft=issuing organization, right=date
- Publications: layout "entries" — left=publication title, subleft=journal/venue, right=date, body=brief description if needed
- Volunteer: layout "entries" — left=organization, subleft=role, right=date range, bullets=contributions
- Skills: layout "skills" — flat array of skill strings (group by category if appropriate, e.g. "Python · SQL · Spark")
- Languages: layout "skills" — each language with proficiency, e.g. "English (Native) · Spanish (Conversational)"
- Summary/Objective: layout "summary" — single paragraph

IMPORTANT: Include a section for each profile data category that has entries AND is relevant to the job description. If the profile has projects, certifications, languages, awards, publications, or volunteer work, include those sections. Omit sections only if the profile has no data for that category.`

export function buildGenerationMessages(
  profile: ExperienceProfile,
  templateContent: string,
  jobDescription: string,
  customPrompt?: string
) {
  const staticPart = customPrompt?.trim() || DEFAULT_GENERATION_PROMPT

  const systemPrompt = `${staticPart}

${SCHEMA_DESCRIPTION}

CANDIDATE PROFILE (source of truth — only use facts from here):
\`\`\`json
${JSON.stringify(profile, null, 2)}
\`\`\`

RESUME TEMPLATE (use this to determine which sections to include, their order, and the overall style/emphasis — do NOT output markdown, output the JSON schema above):
\`\`\`markdown
${templateContent}
\`\`\`

JOB DESCRIPTION (use only to decide which profile facts are most relevant to highlight):
\`\`\`
${jobDescription}
\`\`\``

  return [{ role: 'system' as const, content: systemPrompt }]
}

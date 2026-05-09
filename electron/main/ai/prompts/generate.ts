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
      "bullets"?: string[],
      "body"?: string      // paragraph text if no bullets
    }>
  }>
}`

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

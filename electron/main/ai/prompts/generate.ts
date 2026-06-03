import type { ExperienceProfile } from '../../../../src/types/models'
import { DEFAULT_GENERATION_PROMPT } from '../../../../src/lib/default-prompts'

const SCHEMA_DESCRIPTION = `
Output ONLY one valid JSON object matching this exact TypeScript shape. Do not return code fences, prose, comments, or partial JSON:

{
  "contact": {
    "name": string,
    "title"?: string,  // concise professional title from the profile, usually the current or most recent job title
    "email"?: string,
    "phone"?: string,

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
      "left": string,        // company, institution, project, certification, or award name
      "right"?: string,      // date range, graduation date, or issue date
      "subleft"?: string,    // role title, degree, issuer, or technologies
      "subright"?: string,
      "bullets"?: string[],  // achievement bullets; plain text only
      "body"?: string        // short paragraph only when bullets are not appropriate
    }>
  }>
}

Required section titles and layouts:
- Professional Summary: layout "summary"; one compact paragraph of 2-3 direct sentences.
- Technical Skills: layout "skills"; 5-8 strings formatted exactly as "Category: item1, item2, item3". Never return one flat skills line.
- Professional Experience: layout "entries"; one entry for every workHistory item unless the profile is empty.
- Projects: layout "entries"; include only if profile.projects has data.
- Education: layout "entries"; include one entry for every education item.
- Certifications: layout "entries"; include only if profile.certifications has data.
- Awards & Certifications: layout "entries"; include only if profile.accomplishments has data.

Entry mapping:
- Professional Experience: left=company, right=startDate – endDate, subleft=title, bullets=achievement bullets.
- Education: left=institution, right=graduationDate, subleft=degree + " in " + field.
- Projects: left=name, right=startDate – endDate if present, subleft=technologiesUsed joined by comma, body=description, bullets=project bullets.
- Certifications: left=name, right=issueDate – expiryDate if present, subleft=issuer, body=credential ID if present.
- Awards & Certifications: left=title, right=date, body=description + impact.

STYLE TARGET:
- Match this compact DOCX structure: centered name/title/contact, uppercase section headings with thin rules, labeled skill lines, bold company/title rows with right-aligned dates, italic role rows, and bullet-heavy experience.
- Keep bullets concise and factual, usually 16–26 words. Start with a strong verb.
- Prefer the candidate's original metrics and technologies over generic claims. If no metric exists, write a specific non-quantified outcome from the source bullet.
- For recent roles, use 4-6 bullets. For older roles, use 2-4 bullets. For projects, use 1-3 bullets.
- Do not output nested bullets, tables, HTML, comments, or explanatory notes inside JSON string fields.
- Use standard section titles exactly as shown in SECTION ORDER.

SECTION ORDER: Output sections in exactly this order (omit a section only if the profile has no data for it):
1. Professional Summary
2. Technical Skills
3. Professional Experience
4. Projects (if any)
5. Education
6. Certifications (if any)
7. Awards & Certifications (if any)

Do NOT add sections not listed above. Do NOT reorder sections to match the job description. The order above is fixed.`

export function buildGenerationMessages(
  profile: ExperienceProfile,
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

JOB DESCRIPTION (use only to decide which profile facts are most relevant to highlight):
\`\`\`
${jobDescription}
\`\`\``

  return [{ role: 'system' as const, content: systemPrompt }]
}

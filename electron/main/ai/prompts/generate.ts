import type { ExperienceProfile } from '../../../../src/types/models'
import { DEFAULT_GENERATION_PROMPT } from '../../../../src/lib/default-prompts'

export function buildGenerationMessages(
  profile: ExperienceProfile,
  templateContent: string,
  jobDescription: string,
  customPrompt?: string
) {
  const staticPart = customPrompt?.trim() || DEFAULT_GENERATION_PROMPT

  const systemPrompt = `${staticPart}

CANDIDATE PROFILE (source of truth — only use facts from here):
\`\`\`json
${JSON.stringify(profile, null, 2)}
\`\`\`

MARKDOWN TEMPLATE (output structure to follow):
\`\`\`markdown
${templateContent}
\`\`\`

JOB DESCRIPTION (use only to decide which profile facts are most relevant to highlight):
\`\`\`
${jobDescription}
\`\`\``

  return [{ role: 'system' as const, content: systemPrompt }]
}

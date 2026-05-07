import type { ExperienceProfile } from '../../../../src/types/models'
import { DEFAULT_REVISION_PROMPT } from '../../../../src/lib/default-prompts'

export function buildRevisionMessages(
  profileSubset: Partial<ExperienceProfile>,
  selectedText: string,
  surroundingContext: string,
  instruction: string,
  customPrompt?: string
) {
  const staticPart = customPrompt?.trim() || DEFAULT_REVISION_PROMPT

  const systemPrompt = `${staticPart}

SOURCE PROFILE EXCERPT (what you may draw from):
\`\`\`json
${JSON.stringify(profileSubset, null, 2)}
\`\`\``

  const userPrompt = `SURROUNDING CONTEXT (for tone and style reference only — do not modify or repeat this):
\`\`\`
${surroundingContext}
\`\`\`

SEGMENT TO REVISE:
\`\`\`
${selectedText}
\`\`\`

EDITING INSTRUCTION: ${instruction}

Respond with the revised segment only.`

  return [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userPrompt }
  ]
}

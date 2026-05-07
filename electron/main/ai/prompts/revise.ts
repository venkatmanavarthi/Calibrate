import type { ExperienceProfile } from '../../../../src/types/models'

export function buildRevisionMessages(
  profileSubset: Partial<ExperienceProfile>,
  selectedText: string,
  surroundingContext: string,
  instruction: string
) {
  const systemPrompt = `You are a professional resume editor. You will be given a segment of a resume and an editing instruction. Revise ONLY the given segment according to the instruction. You must NOT add any experience, skill, or achievement that is not present in the source profile excerpt below.

SOURCE PROFILE EXCERPT (what you may draw from):
\`\`\`json
${JSON.stringify(profileSubset, null, 2)}
\`\`\`

Rules:
1. Return ONLY the revised segment. No preamble, no explanation, no surrounding text.
2. Preserve Markdown formatting structure (headings, bullets, bold, etc.).
3. Do not remove bullets unless the instruction explicitly says to condense.
4. Do not add metrics or facts not present in the profile excerpt.`

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

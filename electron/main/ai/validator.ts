import type { ExperienceProfile, HallucinationWarning } from '../../../src/types/models'

function extractProfileEntities(profile: ExperienceProfile): Set<string> {
  const entities = new Set<string>()
  const profileText = JSON.stringify(profile).toLowerCase()

  // Add all words longer than 3 chars from the profile as known-good tokens
  const words = profileText.match(/\b[a-z]{4,}\b/g) ?? []
  words.forEach((w) => entities.add(w))

  // Add years
  profile.workHistory.forEach((w) => {
    entities.add(w.startDate.slice(0, 4))
    if (typeof w.endDate === 'string' && w.endDate !== 'present') {
      entities.add(w.endDate.slice(0, 4))
    }
  })

  return entities
}

// Checks for proper nouns and metrics that appear in output but not in profile
export function validateOutput(generatedText: string, profile: ExperienceProfile): HallucinationWarning[] {
  const knownEntities = extractProfileEntities(profile)
  const profileText = JSON.stringify(profile).toLowerCase()
  const warnings: HallucinationWarning[] = []

  // Match: capitalized multi-word phrases (proper nouns), percentages, dollar amounts, Nx multipliers
  const SUSPECT_PATTERN = /\b([A-Z][a-z]+ [A-Z][a-z]+|\d+%|\$[\d,]+|\d+x)\b/g
  const matches = [...generatedText.matchAll(SUSPECT_PATTERN)]

  for (const match of matches) {
    const token = match[0]
    const tokenLower = token.toLowerCase()

    if (!knownEntities.has(tokenLower) && !profileText.includes(tokenLower)) {
      warnings.push({
        suspectText: token,
        reason: `"${token}" does not appear in the source profile`
      })
    }
  }

  // Deduplicate by suspectText
  return [...new Map(warnings.map((w) => [w.suspectText, w])).values()]
}

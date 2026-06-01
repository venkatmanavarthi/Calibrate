import type { ExperienceProfile, NormalizedJob } from '../../../src/types/models'
import type { LLMProvider } from '../ai/types'

interface ScoreResult {
  score: number
  reason: string
}

function buildProfileSummary(profile: ExperienceProfile): string {
  const lines: string[] = []

  if (profile.personalInfo.summary) {
    lines.push(`SUMMARY: ${profile.personalInfo.summary}`)
  }

  if (profile.skills.length) {
    lines.push(`SKILLS: ${profile.skills.join(', ')}`)
  }

  if (profile.workHistory.length) {
    lines.push('\nWORK HISTORY:')
    for (const w of profile.workHistory) {
      lines.push(`- ${w.title} at ${w.company} (${w.startDate} – ${w.endDate})`)
      for (const b of w.bullets.slice(0, 3)) lines.push(`  • ${b}`)
    }
  }

  if (profile.projects.length) {
    lines.push('\nPROJECTS:')
    for (const p of profile.projects) {
      lines.push(`- ${p.name}: ${p.description}`)
      if (p.technologiesUsed.length) lines.push(`  Tech: ${p.technologiesUsed.join(', ')}`)
    }
  }

  if (profile.accomplishments.length) {
    lines.push('\nACCOMPLISHMENTS:')
    for (const a of profile.accomplishments) {
      lines.push(`- ${a.title}: ${a.impact}`)
    }
  }

  if (profile.certifications.length) {
    lines.push(`\nCERTIFICATIONS: ${profile.certifications.map((c) => c.name).join(', ')}`)
  }

  return lines.join('\n')
}

function stripHtmlForScoring(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000) // keep token count reasonable
}

export async function scoreJob(
  provider: LLMProvider,
  model: string,
  profile: ExperienceProfile,
  job: NormalizedJob
): Promise<ScoreResult> {
  const profileSummary = buildProfileSummary(profile)
  const jobText = stripHtmlForScoring(job.descriptionHtml)

  const messages = [
    {
      role: 'system' as const,
      content: `You are a career advisor scoring job fit. Given a candidate profile and a job description, return ONLY a JSON object with no code fences:\n{"score": <integer 1-10>, "reason": "<one sentence explanation>"}\n\nScoring criteria:\n- 9-10: Exceptional match, candidate exceeds most requirements\n- 7-8: Strong match, candidate meets most requirements\n- 5-6: Moderate match, some gaps but transferable skills\n- 3-4: Weak match, significant skill gaps\n- 1-2: Poor match, fundamentally misaligned role`
    },
    {
      role: 'user' as const,
      content: `CANDIDATE PROFILE:\n${profileSummary}\n\n---\n\nJOB: ${job.title} at ${job.company}\nLOCATION: ${job.location}\n\nJOB DESCRIPTION:\n${jobText}`
    }
  ]

  const raw = await provider.generate(
    messages,
    { model, temperature: 0.1, maxTokens: 150 },
    () => {} // no streaming needed
  )

  const cleaned = raw.replace(/^```\w*\n?/, '').replace(/\n?```$/, '').trim()
  const parsed = JSON.parse(cleaned) as { score: number; reason: string }
  const score = Math.max(1, Math.min(10, Math.round(parsed.score)))
  return { score, reason: parsed.reason ?? '' }
}

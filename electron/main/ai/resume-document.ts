import type { ExperienceProfile } from '../../../src/types/models'
import type { EducationEntry, WorkEntry } from '../../../src/types/models'
import type { ResumeDocument, ResumeDocumentEntry, ResumeDocumentSection } from '../../../src/types/resume-document'

const SECTION_ORDER = [
  'Professional Summary',
  'Technical Skills',
  'Professional Experience',
  'Projects',
  'Education',
  'Certifications',
  'Awards & Certifications',
]

const SECTION_ALIASES: Record<string, string> = {
  summary: 'Professional Summary',
  'professional summary': 'Professional Summary',
  objective: 'Professional Summary',
  skills: 'Technical Skills',
  'technical skills': 'Technical Skills',
  experience: 'Professional Experience',
  'work experience': 'Professional Experience',
  'professional experience': 'Professional Experience',
  projects: 'Projects',
  education: 'Education',
  certifications: 'Certifications',
  certificates: 'Certifications',
  awards: 'Awards & Certifications',
  'awards & honors': 'Awards & Certifications',
  'awards and honors': 'Awards & Certifications',
  'awards & certifications': 'Awards & Certifications',
}

export function stripCodeFences(text: string): string {
  return text.replace(/^```\w*\r?\n?/, '').replace(/\r?\n?```\s*$/, '').trim()
}

export function parseResumeDocument(text: string): ResumeDocument {
  const cleaned = stripCodeFences(text)
  try {
    return JSON.parse(cleaned) as ResumeDocument
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) throw new Error('AI response did not contain a JSON resume document')
    return JSON.parse(cleaned.slice(start, end + 1)) as ResumeDocument
  }
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const cleaned = value
    .replace(/<!--\s*GAP:[\s\S]*?-->/gi, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+\n/g, '\n')
    .trim()
  return cleaned || undefined
}

function cleanArray(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  return values.map(cleanText).filter((v): v is string => Boolean(v))
}

function normalizeTitle(title: unknown): string {
  const cleaned = cleanText(title)?.replace(/[:.]+$/, '') ?? ''
  return SECTION_ALIASES[cleaned.toLowerCase()] ?? cleaned
}

function orderSections(sections: ResumeDocumentSection[]): ResumeDocumentSection[] {
  return [...sections].sort((a, b) => {
    const aIdx = SECTION_ORDER.indexOf(a.title)
    const bIdx = SECTION_ORDER.indexOf(b.title)
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx)
  })
}

function inferTitle(profile: ExperienceProfile): string | undefined {
  return cleanText(profile.workHistory[0]?.title)
}

function compactKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function findWorkEntry(entry: ResumeDocumentEntry, workHistory: WorkEntry[]): WorkEntry | undefined {
  const left = compactKey(entry.left)
  const subleft = compactKey(entry.subleft ?? '')
  return workHistory.find((work) => {
    const company = compactKey(work.company)
    const title = compactKey(work.title)
    return Boolean(company && (left.includes(company) || company.includes(left))) ||
      Boolean(title && subleft && (subleft.includes(title) || title.includes(subleft)))
  })
}

function findEducationEntry(entry: ResumeDocumentEntry, education: EducationEntry[]): EducationEntry | undefined {
  const left = compactKey(entry.left)
  const subleft = compactKey(entry.subleft ?? '')
  return education.find((edu) => {
    const institution = compactKey(edu.institution)
    const degreeField = compactKey([edu.degree, edu.field].filter(Boolean).join(' '))
    return Boolean(institution && (left.includes(institution) || institution.includes(left))) ||
      Boolean(degreeField && subleft && (subleft.includes(degreeField) || degreeField.includes(subleft)))
  })
}

function formatWorkDate(work: WorkEntry): string | undefined {
  const start = cleanText(work.startDate)
  const end = work.endDate === 'present' ? 'Present' : cleanText(work.endDate)
  if (start && end) return `${start} – ${end}`
  return start ?? end
}

function formatEducationDegree(edu: EducationEntry): string | undefined {
  return cleanText([edu.degree, edu.field].filter(Boolean).join(' in '))
}

function canonicalizeEntries(
  title: string,
  entries: ResumeDocumentEntry[],
  profile: ExperienceProfile,
): ResumeDocumentEntry[] {
  if (title === 'Professional Experience') {
    return entries.map((entry, index) => {
      const work = profile.workHistory[index] ?? findWorkEntry(entry, profile.workHistory)
      if (!work) return entry
      return {
        ...entry,
        left: work.company,
        right: formatWorkDate(work),
        subleft: work.title,
        subright: cleanText(work.location),
      }
    })
  }

  if (title === 'Education') {
    return entries.map((entry, index) => {
      const edu = profile.education[index] ?? findEducationEntry(entry, profile.education)
      if (!edu) return entry
      return {
        ...entry,
        left: edu.institution,
        right: cleanText(edu.graduationDate),
        subleft: formatEducationDegree(edu),
      }
    })
  }

  return entries
}

function findSection(sections: ResumeDocumentSection[], title: string): ResumeDocumentSection | undefined {
  return sections.find((section) => section.title === title)
}

function hasMatchingEntry(entries: ResumeDocumentEntry[] | undefined, left: string, subleft?: string): boolean {
  const leftKey = compactKey(left)
  const subleftKey = compactKey(subleft ?? '')
  return (entries ?? []).some((entry) => {
    const entryLeft = compactKey(entry.left)
    const entrySubleft = compactKey(entry.subleft ?? '')
    return Boolean(leftKey && (entryLeft.includes(leftKey) || leftKey.includes(entryLeft))) ||
      Boolean(subleftKey && (entrySubleft.includes(subleftKey) || subleftKey.includes(entrySubleft)))
  })
}

function workToEntry(work: WorkEntry): ResumeDocumentEntry {
  return {
    left: work.company,
    right: formatWorkDate(work),
    subleft: work.title,
    subright: cleanText(work.location),
    bullets: cleanArray(work.bullets),
  }
}

function groupProfileSkills(skills: string[]): string[] {
  const cleaned = cleanArray(skills)
  if (!cleaned.length) return []

  const grouped = new Map<string, string[]>()
  const uncategorized: string[] = []

  for (const skill of cleaned) {
    const colonIdx = skill.indexOf(':')
    if (colonIdx === -1) {
      uncategorized.push(skill)
      continue
    }

    const label = skill.slice(0, colonIdx).trim()
    const value = skill.slice(colonIdx + 1).trim()
    if (!label || !value) {
      uncategorized.push(skill)
      continue
    }

    grouped.set(label, [...(grouped.get(label) ?? []), value])
  }

  if (grouped.size) {
    if (uncategorized.length) grouped.set('Additional', uncategorized)
    return [...grouped.entries()].map(([label, values]) => `${label}: ${values.join(', ')}`)
  }

  return [`Core Skills: ${uncategorized.join(', ')}`]
}

function ensureEntriesSection(
  sections: ResumeDocumentSection[],
  title: string,
  entriesToAdd: ResumeDocumentEntry[],
): void {
  if (!entriesToAdd.length) return
  const existing = findSection(sections, title)
  if (existing?.layout === 'entries') {
    existing.entries = [...(existing.entries ?? []), ...entriesToAdd]
    return
  }
  sections.push({ title, layout: 'entries', entries: entriesToAdd })
}

function ensureProfileSections(sections: ResumeDocumentSection[], profile: ExperienceProfile): ResumeDocumentSection[] {
  const next = [...sections]

  if (!findSection(next, 'Professional Summary') && profile.personalInfo.summary) {
    next.push({ title: 'Professional Summary', layout: 'summary', text: profile.personalInfo.summary })
  }

  if (!findSection(next, 'Technical Skills') && profile.skills.length) {
    next.push({ title: 'Technical Skills', layout: 'skills', skills: groupProfileSkills(profile.skills) })
  }

  const experience = findSection(next, 'Professional Experience')
  const missingWork = profile.workHistory
    .filter((work) => !hasMatchingEntry(experience?.layout === 'entries' ? experience.entries : undefined, work.company, work.title))
    .map(workToEntry)
  ensureEntriesSection(next, 'Professional Experience', missingWork)

  const projects = findSection(next, 'Projects')
  const missingProjects = profile.projects
    .filter((project) => !hasMatchingEntry(projects?.layout === 'entries' ? projects.entries : undefined, project.name))
    .map((project) => ({
      left: project.name,
      right: [cleanText(project.startDate), cleanText(project.endDate)].filter(Boolean).join(' – ') || undefined,
      subleft: project.technologiesUsed.length ? project.technologiesUsed.join(', ') : undefined,
      body: cleanText(project.description),
      bullets: cleanArray(project.bullets),
    }))
  ensureEntriesSection(next, 'Projects', missingProjects)

  const education = findSection(next, 'Education')
  const missingEducation = profile.education
    .filter((edu) => !hasMatchingEntry(education?.layout === 'entries' ? education.entries : undefined, edu.institution, formatEducationDegree(edu)))
    .map((edu) => ({
      left: edu.institution,
      right: cleanText(edu.graduationDate),
      subleft: formatEducationDegree(edu),
    }))
  ensureEntriesSection(next, 'Education', missingEducation)

  const certifications = findSection(next, 'Certifications')
  const missingCertifications = profile.certifications
    .filter((cert) => !hasMatchingEntry(certifications?.layout === 'entries' ? certifications.entries : undefined, cert.name, cert.issuer))
    .map((cert) => ({
      left: cert.name,
      right: [cleanText(cert.issueDate), cleanText(cert.expiryDate)].filter(Boolean).join(' – ') || undefined,
      subleft: cleanText(cert.issuer),
      body: cleanText(cert.credentialId ? `Credential ID: ${cert.credentialId}` : undefined),
    }))
  ensureEntriesSection(next, 'Certifications', missingCertifications)

  const awards = findSection(next, 'Awards & Certifications')
  const missingAccomplishments = profile.accomplishments
    .filter((accomplishment) => !hasMatchingEntry(awards?.layout === 'entries' ? awards.entries : undefined, accomplishment.title))
    .map((accomplishment) => ({
      left: accomplishment.title,
      right: cleanText(accomplishment.date),
      body: cleanText([accomplishment.description, accomplishment.impact].filter(Boolean).join(' ')),
    }))
  ensureEntriesSection(next, 'Awards & Certifications', missingAccomplishments)

  return next
}

function normalizeSkill(skill: string): string {
  const colonIdx = skill.indexOf(':')
  if (colonIdx === -1) return skill
  const label = skill.slice(0, colonIdx).trim()
  const value = skill.slice(colonIdx + 1).replace(/^[,\s]+/, '').trim()
  return value ? `${label}: ${value}` : label
}

function normalizeSection(section: ResumeDocumentSection, profile: ExperienceProfile): ResumeDocumentSection | null {
  const title = normalizeTitle(section.title)
  if (!title) return null

  if (section.layout === 'summary') {
    return {
      title,
      layout: 'summary',
      text: cleanText(section.text),
      hidden: Boolean(section.hidden),
    }
  }

  if (section.layout === 'skills') {
    return {
      title,
      layout: 'skills',
      skills: cleanArray(section.skills).map(normalizeSkill),
      hidden: Boolean(section.hidden),
    }
  }

  const entries = Array.isArray(section.entries) ? section.entries.map((entry) => ({
    left: cleanText(entry.left) ?? '',
    right: cleanText(entry.right),
    subleft: cleanText(entry.subleft),
    subright: cleanText(entry.subright),
    body: cleanText(entry.body),
    bullets: cleanArray(entry.bullets),
  })).filter((entry) => entry.left || entry.subleft || entry.body || entry.bullets.length) : []

  return {
    title,
    layout: 'entries',
    entries: canonicalizeEntries(title, entries, profile),
    hidden: Boolean(section.hidden),
  }
}

export function normalizeResumeDocument(doc: ResumeDocument, profile: ExperienceProfile): ResumeDocument {
  const sections = orderSections(ensureProfileSections((Array.isArray(doc.sections) ? doc.sections : [])
    .map((section) => normalizeSection(section, profile))
    .filter((section): section is ResumeDocumentSection => Boolean(section)), profile))

  const personal = profile.personalInfo
  return {
    contact: {
      name: cleanText(personal.fullName) ?? cleanText(doc.contact?.name) ?? '',
      title: inferTitle(profile) ?? cleanText(doc.contact?.title),
      email: cleanText(personal.email) ?? cleanText(doc.contact?.email),
      phone: cleanText(personal.phone) ?? cleanText(doc.contact?.phone),
      location: cleanText(personal.location) ?? cleanText(doc.contact?.location),
      linkedin: cleanText(personal.linkedinUrl) ?? cleanText(doc.contact?.linkedin),
      github: cleanText(personal.githubUrl) ?? cleanText(doc.contact?.github),
      website: cleanText(personal.websiteUrl) ?? cleanText(doc.contact?.website),
    },
    sections,
    metadata: doc.metadata,
  }
}

export function buildProfileResumeDocument(profile: ExperienceProfile): ResumeDocument {
  return normalizeResumeDocument({ contact: { name: '' }, sections: [] }, profile)
}

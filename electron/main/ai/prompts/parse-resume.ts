export function buildParseResumeMessages(resumeText: string) {
  const systemPrompt = `You are a resume parser. Extract structured data from the resume text below and return a single JSON object matching this TypeScript interface exactly.

Return ONLY raw JSON — no markdown fences, no explanation, no preamble.

interface PersonalInfo {
  fullName: string
  email: string
  phone?: string
  location?: string
  linkedinUrl?: string
  githubUrl?: string
  websiteUrl?: string
  summary?: string
}

interface WorkEntry {
  company: string
  title: string
  startDate: string   // "MMM YYYY" or "YYYY"
  endDate: string     // "MMM YYYY", "YYYY", or "present"
  location: string
  bullets: string[]
  technologiesUsed: string[]
}

interface ProjectEntry {
  name: string
  description: string
  url?: string
  startDate?: string
  endDate?: string
  technologiesUsed: string[]
  bullets: string[]
}

interface EducationEntry {
  institution: string
  degree: string
  field: string
  graduationDate: string
  gpa?: string
  honors?: string[]
  relevantCoursework?: string[]
}

interface CertificationEntry {
  name: string
  issuer: string
  issueDate: string
  expiryDate?: string
  credentialId?: string
  url?: string
}

interface ParsedProfile {
  name: string              // profile label, e.g. "John Doe – Imported"
  personalInfo: PersonalInfo
  skills: string[]
  workHistory: WorkEntry[]
  projects: ProjectEntry[]
  education: EducationEntry[]
  certifications: CertificationEntry[]
}

Rules:
- Do not invent data. If a field is absent from the resume, omit it or use an empty array.
- Normalize dates to "MMM YYYY" (e.g. "Jan 2022") when the month is present; use "YYYY" alone when only the year is known.
- bullets should be individual achievement/responsibility sentences extracted verbatim or lightly cleaned.
- technologiesUsed should list specific tools, languages, or frameworks mentioned in the context of that role/project.
- skills should be a flat list of all distinct technical and domain skills found in the resume.

RESUME TEXT:
\`\`\`
${resumeText}
\`\`\``

  return [{ role: 'user' as const, content: systemPrompt }]
}

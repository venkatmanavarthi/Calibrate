import { ipcMain, dialog } from 'electron'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import { buildProvider } from '../ai/index'
import { buildParseResumeMessages } from '../ai/prompts/parse-resume'
import { loadSettings } from '../storage/settings.store'
import { saveProfile } from '../storage/profiles.store'
import { getKey } from '../security/keystore'
import type { ExperienceProfile } from '../../../src/types/models'

import { PDFParse } from 'pdf-parse'

interface ParsedEntry {
  company?: string
  title?: string
  startDate?: string
  endDate?: string
  location?: string
  bullets?: string[]
  technologiesUsed?: string[]
  name?: string
  description?: string
  url?: string
  institution?: string
  degree?: string
  field?: string
  graduationDate?: string
  gpa?: string
  honors?: string[]
  relevantCoursework?: string[]
  issuer?: string
  issueDate?: string
  expiryDate?: string
  credentialId?: string
}

interface ParsedProfile {
  name?: string
  personalInfo?: {
    fullName?: string
    email?: string
    phone?: string
    location?: string
    linkedinUrl?: string
    githubUrl?: string
    websiteUrl?: string
    summary?: string
  }
  skills?: string[]
  workHistory?: ParsedEntry[]
  projects?: ParsedEntry[]
  education?: ParsedEntry[]
  certifications?: ParsedEntry[]
}

function assignIds<T extends object>(items: ParsedEntry[] | undefined, mapper: (e: ParsedEntry) => T): (T & { id: string })[] {
  if (!Array.isArray(items)) return []
  return items.map((e) => ({ id: uuidv4(), ...mapper(e) }))
}

function extractJson(raw: string): string {
  // Strip code fences if present
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) return fenced[1].trim()
  // Find first { ... } block
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start !== -1 && end !== -1) return raw.slice(start, end + 1)
  return raw.trim()
}

function buildProfile(parsed: ParsedProfile): ExperienceProfile {
  const now = new Date().toISOString()
  const pi = parsed.personalInfo ?? {}

  return {
    id: uuidv4(),
    name: parsed.name ?? `Imported – ${pi.fullName ?? 'Unknown'}`,
    createdAt: now,
    updatedAt: now,
    personalInfo: {
      fullName: pi.fullName ?? '',
      email: pi.email ?? '',
      phone: pi.phone,
      location: pi.location,
      linkedinUrl: pi.linkedinUrl,
      githubUrl: pi.githubUrl,
      websiteUrl: pi.websiteUrl,
      summary: pi.summary
    },
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    workHistory: assignIds(parsed.workHistory, (e) => ({
      company: e.company ?? '',
      title: e.title ?? '',
      startDate: e.startDate ?? '',
      endDate: e.endDate ?? 'present',
      location: e.location ?? '',
      bullets: Array.isArray(e.bullets) ? e.bullets : [],
      technologiesUsed: Array.isArray(e.technologiesUsed) ? e.technologiesUsed : []
    })),
    projects: assignIds(parsed.projects, (e) => ({
      name: e.name ?? '',
      description: e.description ?? '',
      url: e.url,
      startDate: e.startDate,
      endDate: e.endDate,
      technologiesUsed: Array.isArray(e.technologiesUsed) ? e.technologiesUsed : [],
      bullets: Array.isArray(e.bullets) ? e.bullets : []
    })),
    education: assignIds(parsed.education, (e) => ({
      institution: e.institution ?? '',
      degree: e.degree ?? '',
      field: e.field ?? '',
      graduationDate: e.graduationDate ?? '',
      gpa: e.gpa,
      honors: e.honors,
      relevantCoursework: e.relevantCoursework
    })),
    certifications: assignIds(parsed.certifications, (e) => ({
      name: e.name ?? '',
      issuer: e.issuer ?? '',
      issueDate: e.issueDate ?? '',
      expiryDate: e.expiryDate,
      credentialId: e.credentialId,
      url: e.url
    })),
    starStories: [],
    accomplishments: []
  }
}

export function registerPdfImportIpc(): void {
  ipcMain.handle('profiles:importFromPdf', async () => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      properties: ['openFile']
    })

    if (result.canceled || !result.filePaths[0]) {
      return { imported: false }
    }

    const settings = await loadSettings()
    const provider = settings.preferredProvider
    const hasKey = provider !== 'lmstudio' ? await getKey(provider) : 'local'
    if (!hasKey) {
      throw new Error(`No API key configured for ${provider}. Add one in Settings.`)
    }

    const pdfBuffer = await fs.readFile(result.filePaths[0])
    const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) })
    const { text } = await parser.getText()
    await parser.destroy()

    if (!text || text.trim().length < 50) {
      throw new Error('Could not extract text from the PDF. The file may be image-only or corrupted.')
    }

    const llm = await buildProvider(provider, settings)
    const model = settings.preferredModels[provider]
    const messages = buildParseResumeMessages(text)

    const raw = await llm.generate(messages, { model, temperature: 0.1 }, () => {})

    const jsonStr = extractJson(raw)
    const parsed = JSON.parse(jsonStr) as ParsedProfile

    if (!parsed.personalInfo?.fullName) {
      throw new Error('Could not parse the resume. Try a text-based PDF or check your AI provider.')
    }

    const profile = buildProfile(parsed)
    await saveProfile(profile)

    return { imported: true, profile }
  })
}

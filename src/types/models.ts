export interface WorkEntry {
  id: string
  company: string
  title: string
  startDate: string
  endDate: string | 'present'
  location: string
  bullets: string[]
  technologiesUsed: string[]
}

export interface ProjectEntry {
  id: string
  name: string
  description: string
  url?: string
  startDate?: string
  endDate?: string
  technologiesUsed: string[]
  bullets: string[]
}

export interface EducationEntry {
  id: string
  institution: string
  degree: string
  field: string
  graduationDate: string
  gpa?: string
  honors?: string[]
  relevantCoursework?: string[]
}

export interface CertificationEntry {
  id: string
  name: string
  issuer: string
  issueDate: string
  expiryDate?: string
  credentialId?: string
  url?: string
}

export interface StarStory {
  id: string
  title: string
  situation: string
  task: string
  action: string
  result: string
  tags: string[]
  relatedWorkEntryId?: string
}

export interface AccomplishmentEntry {
  id: string
  title: string
  description: string
  impact: string
  date: string
}

export interface PersonalInfo {
  fullName: string
  email: string
  phone?: string
  location?: string
  linkedinUrl?: string
  githubUrl?: string
  websiteUrl?: string
  summary?: string
}

export interface ExperienceProfile {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  personalInfo: PersonalInfo
  skills: string[]
  workHistory: WorkEntry[]
  projects: ProjectEntry[]
  education: EducationEntry[]
  certifications: CertificationEntry[]
  starStories: StarStory[]
  accomplishments: AccomplishmentEntry[]
}

export interface ResumeTemplate {
  id: string
  name: string
  description?: string
  markdownContent: string
  createdAt: string
  updatedAt: string
  defaultStyleHints?: string
}

export type AIProvider = 'anthropic' | 'openai' | 'gemini' | 'groq' | 'lmstudio'

export interface LMStudioConfig {
  baseUrl: string
  modelName: string
}

export interface AppSettings {
  preferredProvider: AIProvider
  preferredModels: Record<AIProvider, string>
  lmStudioConfig: LMStudioConfig
  encryptionAvailable: boolean
  theme: 'system' | 'light' | 'dark'
  pdfPageSize: 'Letter' | 'A4'
  pdfMarginMm: number
  pdfFont: 'Georgia' | 'Arial' | 'Helvetica' | 'Times New Roman' | 'Calibri' | 'Garamond'
  configuredProviders: AIProvider[]
}

export interface HallucinationWarning {
  suspectText: string
  reason: string
}

export interface GenerateRequest {
  requestId: string
  profileId: string
  templateId: string
  jobDescription: string
  provider: AIProvider
  model: string
}

export interface RevisionRequest {
  requestId: string
  selectedText: string
  selectionStart: number
  selectionEnd: number
  surroundingContext: string
  profileSubset: Partial<ExperienceProfile>
  instruction: string
  provider: AIProvider
  model: string
}

export interface PdfExportRequest {
  markdownContent: string
  destFilePath: string
  pageSize: 'Letter' | 'A4'
  marginMm: number
  font: string
}

export interface ExportBundle {
  version: 1
  exportedAt: string
  profiles: ExperienceProfile[]
  templates: ResumeTemplate[]
}

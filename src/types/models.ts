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
  preset?: boolean
}

export type AIProvider = 'anthropic' | 'openai' | 'gemini' | 'groq' | 'deepseek' | 'lmstudio'

export interface LMStudioConfig {
  baseUrl: string
  modelName: string
}

export interface CustomPrompts {
  generation?: string
  revision?: string
  analysis?: string
}

export interface PromptSnapshot {
  id: string
  savedAt: string
  generation: string
  revision: string
  analysis: string
}

export interface AppSettings {
  preferredProvider: AIProvider
  preferredModels: Record<AIProvider, string>
  lmStudioConfig: LMStudioConfig
  encryptionAvailable: boolean
  theme: 'system' | 'light' | 'dark'
  pdfPageSize: 'Letter' | 'A4' | 'Tabloid'
  pdfMarginMm: number
  pdfFont: 'Georgia' | 'Arial' | 'Helvetica' | 'Times New Roman' | 'Calibri' | 'Garamond'
  configuredProviders: AIProvider[]
  onboardingCompleted: boolean
  jobKeywords: string[]
  customPrompts?: CustomPrompts
  promptHistory?: PromptSnapshot[]
  gmailOAuthClientId?: string
  gmailOAuthClientSecret?: string
}

export interface HallucinationWarning {
  suspectText: string
  reason: string
}

export interface GenerateRequest {
  requestId: string
  profileId: string
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
  resumeDocument?: import('./resume-document').ResumeDocument
  destFilePath: string
  pageSize: 'Letter' | 'A4' | 'Tabloid'
  marginMm: number
  font: string
  paddingTopMm?: number
  paddingRightMm?: number
  paddingBottomMm?: number
  paddingLeftMm?: number
}

export interface ExportBundle {
  version: 1
  exportedAt: string
  profiles: ExperienceProfile[]
  templates: ResumeTemplate[]
}

export type CalibrateFile =
  | { version: 1; type: 'template'; template: ResumeTemplate }
  | { version: 1; type: 'prompts'; generation: string; revision: string }

export interface ResumeRating {
  overallScore: number
  atsScore: number
  keywordScore: number
  impactScore: number
  atsIssues: string[]
  matchedKeywords: string[]
  missingKeywords: string[]
  impactDetails: string[]
  summary: string
}

export interface RateResumeRequest {
  resumeMarkdown: string
  jobDescription: string
  provider: AIProvider
  model: string
}

export type JobAtsSource = 'greenhouse' | 'lever' | 'ashby' | 'website'

export interface TrackedCompany {
  id: string
  name: string
  source: JobAtsSource
  slug: string
  addedAt: string
}

export interface NormalizedJob {
  id: string
  source: JobAtsSource
  externalId: string
  company: string
  companyId: string
  title: string
  location: string
  remote: boolean
  department?: string
  employmentType?: string
  descriptionHtml: string
  applyUrl: string
  postedAt: string
  updatedAt: string
  firstSeenAt: string
  lastSeenAt: string
}

export interface JobQuery {
  keywords?: string
  location?: string
  remoteOnly?: boolean
  postedWithinDays?: number
}

export interface JobRefreshResult {
  companyId: string
  fetched: number
  added: number
  errors?: string
}

export interface YCCompany {
  id: number
  name: string
  slug: string
  website: string
  oneLiner: string
  batch: string
  status: string
  tags: string[]
}

export interface AtsProbeResult {
  ycCompanyId: number
  source: JobAtsSource
  atsSlug: string
}

// ─── Pipeline ────────────────────────────────────────────────────────────────

export interface Pipeline {
  id: string
  name: string
  profileId: string
  templateId: string
  provider: AIProvider
  model: string
  companyIds: string[] | 'all'
  scheduleMinutes: number
  minScore?: number
  enabled: boolean
  autoApply: boolean
  autoApplyMinScore?: number
  createdAt: string
  updatedAt: string
  lastRunAt?: string
}

export type PipelineRunStatus = 'running' | 'completed' | 'error'

export interface PipelineRun {
  id: string
  pipelineId: string
  startedAt: string
  completedAt?: string
  status: PipelineRunStatus
  jobsScanned: number
  jobsScored: number
  error?: string
}

export interface ScoredJob {
  id: string
  pipelineId: string
  runId: string
  jobId: string
  jobTitle: string
  jobCompany: string
  jobLocation: string
  jobRemote: boolean
  jobApplyUrl: string
  jobSource: JobAtsSource
  jobDescriptionHtml: string
  score: number
  scoreReason: string
  scoredAt: string
  resumeMarkdown?: string
  resumeGeneratedAt?: string
}

export interface ApplicationDefaults {
  eeoGender?: string
  eeoRace?: string
  eeoVeteran?: string
  eeoDisability?: string
  workAuthorized: boolean
  requiresSponsorship: boolean
  customQuestionDefaults?: Record<string, string>
}

export interface ApplicationRecord {
  id: string
  scoredJobId: string
  jobId: string
  jobTitle: string
  jobCompany: string
  jobSource: JobAtsSource
  appliedAt: string
  status: 'submitted' | 'failed' | 'skipped'
  failureReason?: string
  confirmationScreenshotPath?: string
  customAnswers: Record<string, string>
  sourceUrl?: string
  finalUrl?: string
  submissionMode?: 'auto' | 'review' | 'fill_only'
  accountEmail?: string
  accountAction?: 'none' | 'login_existing' | 'created' | 'reset_attempted' | 'blocked'
  verificationReason?: string
  filledFields?: string[]
  skippedFields?: string[]
}

export type GmailConnectionStatus = 'not_configured' | 'disconnected' | 'connected' | 'expired'

export interface GmailConnection {
  status: GmailConnectionStatus
  email?: string
  connectedAt?: string
  lastVerifiedAt?: string
  message?: string
}

export interface SiteCredential {
  origin: string
  email: string
  encryptedPassword: string
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
}

export type ApplyRunStatus = 'queued' | 'running' | 'submitted' | 'failed' | 'cancelled' | 'blocked'

export interface ApplyStep {
  id: string
  runId: string
  at: string
  action: string
  status: 'ok' | 'failed' | 'skipped'
  message: string
  screenshotPath?: string
}

export interface ApplyRun {
  id: string
  scoredJobId?: string
  jobId?: string
  sourceUrl: string
  finalUrl?: string
  status: ApplyRunStatus
  mode: 'auto'
  currentStep: string
  accountEmail?: string
  accountAction?: ApplicationRecord['accountAction']
  error?: string
  startedAt: string
  completedAt?: string
}

export interface ChromeApplyConnection {
  connected: boolean
  lastSeenAt?: string
  port: number
  extensionId?: string
  message?: string
}

export interface ChromeApplyStartRequest {
  scoredJobId?: string
  url?: string
}

export interface EditElementRequest {
  requestId: string
  resumeDocument: import('./resume-document').ResumeDocument
  target: import('./resume-document').SelectionTarget
  instruction?: string
  provider: AIProvider
  model: string
}

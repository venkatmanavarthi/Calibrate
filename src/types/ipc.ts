import type {
  ExperienceProfile,
  ResumeTemplate,
  AppSettings,
  AIProvider,
  HallucinationWarning,
  GenerateRequest,
  RevisionRequest,
  RateResumeRequest,
  ResumeRating,
  PdfExportRequest,
  ExportBundle,
  CalibrateFile,
  EditElementRequest,
  TrackedCompany,
  NormalizedJob,
  JobRefreshResult,
  YCCompany,
  AtsProbeResult,
  Pipeline,
  PipelineRun,
  ScoredJob,
  ApplicationRecord,
  ApplicationDefaults,
  GmailConnection,
  ChromeApplyConnection,
  ChromeApplyStartRequest,
  ApplyRun
} from './models'
import type { ResumeDocument } from './resume-document'

export type UpdateState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

export interface UpdateProgress {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

export type PipelineRunProgressPayload = {
  pipelineId: string
  runId: string
  phase: 'scanning' | 'scoring'
  current: number
  total: number
}

export type ChromeApplyProgressPayload = {
  runId: string
  status: ApplyRun['status']
  currentStep: string
  message?: string
}

export interface WindowAPI {
  // Profiles
  profilesList: () => Promise<ExperienceProfile[]>
  profilesGet: (id: string) => Promise<ExperienceProfile | null>
  profilesSave: (profile: ExperienceProfile) => Promise<{ ok: true }>
  profilesDelete: (id: string) => Promise<{ ok: true }>
  profilesImportFromPdf: () => Promise<{ imported: false } | { imported: true; profile: ExperienceProfile }>

  // Templates
  templatesList: () => Promise<ResumeTemplate[]>
  templatesGet: (id: string) => Promise<ResumeTemplate | null>
  templatesSave: (template: ResumeTemplate) => Promise<{ ok: true }>
  templatesDelete: (id: string) => Promise<{ ok: true }>
  templatesExportCalibrate: (id: string) => Promise<{ filePath: string | null }>

  // Prompts
  promptsExportCalibrate: () => Promise<{ filePath: string | null }>

  // Settings
  settingsGet: () => Promise<AppSettings>
  settingsSave: (s: Partial<AppSettings>) => Promise<{ ok: true }>
  settingsSetKey: (provider: AIProvider, key: string) => Promise<{ ok: true }>
  settingsDeleteKey: (provider: AIProvider) => Promise<{ ok: true }>
  settingsHasKey: (provider: AIProvider) => Promise<{ hasKey: boolean }>

  // AI (streaming via events)
  aiGenerate: (req: GenerateRequest) => Promise<void>
  aiRevise: (req: RevisionRequest) => Promise<void>
  aiRateResume: (req: RateResumeRequest) => Promise<ResumeRating>
  aiEditElement: (req: EditElementRequest) => Promise<{ resumeDocument: ResumeDocument }>
  aiCancel: (requestId: string) => Promise<{ ok: true }>
  aiListModels: (provider: AIProvider) => Promise<string[]>

  // Streaming listeners — return an unlisten function
  onAiChunk: (cb: (payload: { requestId: string; delta: string }) => void) => () => void
  onAiDone: (cb: (payload: { requestId: string; fullText: string; warnings: HallucinationWarning[]; resumeDocument?: ResumeDocument }) => void) => () => void
  onAiError: (cb: (payload: { requestId: string; message: string }) => void) => () => void

  // PDF
  pdfExport: (req: PdfExportRequest) => Promise<{ filePath: string }>
  pdfChooseDestination: () => Promise<{ filePath: string | null }>
  pdfEmailExport: (req: PdfExportRequest) => Promise<{ ok: true }>

  // Import / Export
  exportData: () => Promise<{ filePath: string | null }>
  importData: () => Promise<{ imported: boolean; profileCount: number; templateCount: number }>

  // .calibrate file open
  onTemplateOpenCalibrate: (cb: (template: ResumeTemplate) => void) => () => void
  onPromptsOpenCalibrate: (cb: (prompts: { generation: string; revision: string }) => void) => () => void

  // Jobs
  jobsListCompanies: () => Promise<TrackedCompany[]>
  jobsSaveCompany: (company: TrackedCompany) => Promise<{ ok: true }>
  jobsDeleteCompany: (id: string) => Promise<{ ok: true }>
  jobsListJobs: () => Promise<NormalizedJob[]>
  jobsRefreshCompany: (id: string) => Promise<JobRefreshResult>
  jobsRefreshAll: () => Promise<JobRefreshResult[]>
  jobsFetchYCCompanies: () => Promise<YCCompany[]>
  jobsProbeCompanyAts: (company: YCCompany) => Promise<AtsProbeResult | null>

  // Pipeline
  pipelineList: () => Promise<Pipeline[]>
  pipelineSave: (p: Pipeline) => Promise<{ ok: true }>
  pipelineDelete: (id: string) => Promise<{ ok: true }>
  pipelineListRuns: () => Promise<PipelineRun[]>
  pipelineListScoredJobs: () => Promise<ScoredJob[]>
  pipelineRunNow: (id: string) => Promise<{ ok: true }>
  pipelineGenerateResumes: (pipelineId: string, scoredJobIds: string[]) => Promise<ScoredJob[]>
  onPipelineRunStarted: (cb: (payload: { pipelineId: string; runId: string }) => void) => () => void
  onPipelineRunProgress: (cb: (payload: PipelineRunProgressPayload) => void) => () => void
  onPipelineRunCompleted: (cb: (payload: { pipelineId: string; runId: string; scoredJobs: ScoredJob[] }) => void) => () => void
  onPipelineRunError: (cb: (payload: { pipelineId: string; runId: string; error: string }) => void) => () => void

  // Applications
  applicationsList: () => Promise<ApplicationRecord[]>
  applicationsDelete: (id: string) => Promise<{ ok: true }>
  applicationSubmit: (scoredJobId: string) => Promise<ApplicationRecord>
  applicationSubmitBatch: (scoredJobIds: string[]) => Promise<ApplicationRecord[]>

  // Application defaults
  applicationDefaultsGet: () => Promise<ApplicationDefaults>
  applicationDefaultsSave: (d: ApplicationDefaults) => Promise<{ ok: true }>

  // Chrome apply
  chromeApplyCheckConnection: () => Promise<ChromeApplyConnection>
  chromeApplyStart: (req: ChromeApplyStartRequest) => Promise<ApplyRun>
  chromeApplyCancel: (sessionId: string) => Promise<{ ok: true }>
  chromeApplyListRuns: () => Promise<ApplyRun[]>
  onChromeApplyProgress: (cb: (payload: ChromeApplyProgressPayload) => void) => () => void

  // Gmail verification
  gmailStatus: () => Promise<GmailConnection>
  gmailConnect: () => Promise<GmailConnection>
  gmailDisconnect: () => Promise<{ ok: true }>

  // Session auth (opens BrowserWindow for user to log in to an ATS domain)
  sessionAuthenticate: (atsDomain: string) => Promise<void>
  sessionClear: (atsDomain: string) => Promise<{ ok: true }>

  // Shell
  shellOpenExternal: (url: string) => Promise<void>

  // Updates
  updatesCheck: () => Promise<void>
  updatesDownload: () => Promise<void>
  updatesInstallAndRestart: () => Promise<void>
  updatesGetVersion: () => Promise<string>
  onUpdatesStatus: (cb: (payload: { state: UpdateState }) => void) => () => void
  onUpdatesProgress: (cb: (payload: UpdateProgress) => void) => () => void
  onUpdatesError: (cb: (payload: { message: string }) => void) => () => void
}

declare global {
  interface Window {
    api: WindowAPI
  }
}

export type {
  ExperienceProfile,
  ResumeTemplate,
  AppSettings,
  AIProvider,
  HallucinationWarning,
  GenerateRequest,
  RevisionRequest,
  RateResumeRequest,
  ResumeRating,
  PdfExportRequest,
  ExportBundle,
  CalibrateFile,
  ResumeDocument,
  EditElementRequest,
  TrackedCompany,
  NormalizedJob,
  JobRefreshResult,
  YCCompany,
  AtsProbeResult,
  Pipeline,
  PipelineRun,
  ScoredJob,
  ApplicationRecord,
  ApplicationDefaults,
  GmailConnection,
  ChromeApplyConnection,
  ChromeApplyStartRequest,
  ApplyRun
}

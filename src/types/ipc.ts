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
  ExportBundle
} from './models'

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
  aiCancel: (requestId: string) => Promise<{ ok: true }>
  aiListModels: (provider: AIProvider) => Promise<string[]>

  // Streaming listeners — return an unlisten function
  onAiChunk: (cb: (payload: { requestId: string; delta: string }) => void) => () => void
  onAiDone: (cb: (payload: { requestId: string; fullText: string; warnings: HallucinationWarning[] }) => void) => () => void
  onAiError: (cb: (payload: { requestId: string; message: string }) => void) => () => void

  // PDF
  pdfExport: (req: PdfExportRequest) => Promise<{ filePath: string }>
  pdfChooseDestination: () => Promise<{ filePath: string | null }>

  // Import / Export
  exportData: () => Promise<{ filePath: string | null }>
  importData: () => Promise<{ imported: boolean; profileCount: number; templateCount: number }>

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
  ExportBundle
}

import type {
  ExperienceProfile,
  ResumeTemplate,
  AppSettings,
  AIProvider,
  HallucinationWarning,
  GenerateRequest,
  RevisionRequest,
  PdfExportRequest,
  ExportBundle
} from './models'

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
  PdfExportRequest,
  ExportBundle
}

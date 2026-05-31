import { contextBridge, ipcRenderer } from 'electron'
import type {
  WindowAPI,
  UpdateState,
  UpdateProgress,
  PipelineRunProgressPayload,
  ChromeApplyProgressPayload,
  ScoredJob,
  ApplicationDefaults,
  ChromeApplyStartRequest
} from '../../src/types/ipc'

const api: WindowAPI = {
  // Profiles
  profilesList: () => ipcRenderer.invoke('profiles:list'),
  profilesGet: (id) => ipcRenderer.invoke('profiles:get', id),
  profilesSave: (p) => ipcRenderer.invoke('profiles:save', p),
  profilesDelete: (id) => ipcRenderer.invoke('profiles:delete', id),
  profilesImportFromPdf: () => ipcRenderer.invoke('profiles:importFromPdf'),

  // Templates
  templatesList: () => ipcRenderer.invoke('templates:list'),
  templatesGet: (id) => ipcRenderer.invoke('templates:get', id),
  templatesSave: (t) => ipcRenderer.invoke('templates:save', t),
  templatesDelete: (id) => ipcRenderer.invoke('templates:delete', id),
  templatesExportCalibrate: (id) => ipcRenderer.invoke('templates:exportCalibrate', id),

  // Prompts
  promptsExportCalibrate: () => ipcRenderer.invoke('prompts:exportCalibrate'),

  // Settings
  settingsGet: () => ipcRenderer.invoke('settings:get'),
  settingsSave: (s) => ipcRenderer.invoke('settings:save', s),
  settingsSetKey: (provider, key) => ipcRenderer.invoke('settings:setKey', provider, key),
  settingsDeleteKey: (provider) => ipcRenderer.invoke('settings:deleteKey', provider),
  settingsHasKey: (provider) => ipcRenderer.invoke('settings:hasKey', provider),

  // AI
  aiGenerate: (req) => ipcRenderer.invoke('ai:generate', req),
  aiRevise: (req) => ipcRenderer.invoke('ai:revise', req),
  aiRateResume: (req) => ipcRenderer.invoke('ai:rateResume', req),
  aiEditElement: (req) => ipcRenderer.invoke('ai:editElement', req),
  aiCancel: (requestId) => ipcRenderer.invoke('ai:cancel', requestId),
  aiListModels: (provider) => ipcRenderer.invoke('ai:listModels', provider),

  // Streaming listeners
  onAiChunk: (cb) => {
    const handler = (_: Electron.IpcRendererEvent, payload: { requestId: string; delta: string }) => cb(payload)
    ipcRenderer.on('ai:chunk', handler)
    return () => ipcRenderer.removeListener('ai:chunk', handler)
  },
  onAiDone: (cb) => {
    const handler = (_: Electron.IpcRendererEvent, payload: Parameters<typeof cb>[0]) => cb(payload)
    ipcRenderer.on('ai:done', handler)
    return () => ipcRenderer.removeListener('ai:done', handler)
  },
  onAiError: (cb) => {
    const handler = (_: Electron.IpcRendererEvent, payload: { requestId: string; message: string }) => cb(payload)
    ipcRenderer.on('ai:error', handler)
    return () => ipcRenderer.removeListener('ai:error', handler)
  },

  // PDF
  pdfExport: (req) => ipcRenderer.invoke('pdf:export', req),
  pdfChooseDestination: () => ipcRenderer.invoke('pdf:chooseDestination'),
  pdfEmailExport: (req) => ipcRenderer.invoke('pdf:emailExport', req),

  // .calibrate file open
  onTemplateOpenCalibrate: (cb) => {
    const handler = (_: Electron.IpcRendererEvent, template: Parameters<typeof cb>[0]) => cb(template)
    ipcRenderer.on('template:openCalibrate', handler)
    return () => ipcRenderer.removeListener('template:openCalibrate', handler)
  },
  onPromptsOpenCalibrate: (cb) => {
    const handler = (_: Electron.IpcRendererEvent, prompts: Parameters<typeof cb>[0]) => cb(prompts)
    ipcRenderer.on('prompts:openCalibrate', handler)
    return () => ipcRenderer.removeListener('prompts:openCalibrate', handler)
  },

  // Import / Export
  exportData: () => ipcRenderer.invoke('export:data'),
  importData: () => ipcRenderer.invoke('import:data'),

  // Jobs
  jobsListCompanies: () => ipcRenderer.invoke('jobs:listCompanies'),
  jobsSaveCompany: (c) => ipcRenderer.invoke('jobs:saveCompany', c),
  jobsDeleteCompany: (id) => ipcRenderer.invoke('jobs:deleteCompany', id),
  jobsListJobs: () => ipcRenderer.invoke('jobs:listJobs'),
  jobsRefreshCompany: (id) => ipcRenderer.invoke('jobs:refreshCompany', id),
  jobsRefreshAll: () => ipcRenderer.invoke('jobs:refreshAll'),
  jobsFetchYCCompanies: () => ipcRenderer.invoke('jobs:fetchYCCompanies'),
  jobsProbeCompanyAts: (company) => ipcRenderer.invoke('jobs:probeCompanyAts', company),

  // Pipeline
  pipelineList: () => ipcRenderer.invoke('pipeline:list'),
  pipelineSave: (p) => ipcRenderer.invoke('pipeline:save', p),
  pipelineDelete: (id) => ipcRenderer.invoke('pipeline:delete', id),
  pipelineListRuns: () => ipcRenderer.invoke('pipeline:listRuns'),
  pipelineListScoredJobs: () => ipcRenderer.invoke('pipeline:listScoredJobs'),
  pipelineRunNow: (id) => ipcRenderer.invoke('pipeline:runNow', id),
  pipelineGenerateResumes: (pipelineId, scoredJobIds) =>
    ipcRenderer.invoke('pipeline:generateResumes', pipelineId, scoredJobIds),
  onPipelineRunStarted: (cb) => {
    const handler = (_: Electron.IpcRendererEvent, payload: Parameters<typeof cb>[0]) => cb(payload)
    ipcRenderer.on('pipeline:runStarted', handler)
    return () => ipcRenderer.removeListener('pipeline:runStarted', handler)
  },
  onPipelineRunProgress: (cb) => {
    const handler = (_: Electron.IpcRendererEvent, payload: PipelineRunProgressPayload) => cb(payload)
    ipcRenderer.on('pipeline:runProgress', handler)
    return () => ipcRenderer.removeListener('pipeline:runProgress', handler)
  },
  onPipelineRunCompleted: (cb) => {
    const handler = (_: Electron.IpcRendererEvent, payload: { pipelineId: string; runId: string; scoredJobs: ScoredJob[] }) => cb(payload)
    ipcRenderer.on('pipeline:runCompleted', handler)
    return () => ipcRenderer.removeListener('pipeline:runCompleted', handler)
  },
  onPipelineRunError: (cb) => {
    const handler = (_: Electron.IpcRendererEvent, payload: { pipelineId: string; runId: string; error: string }) => cb(payload)
    ipcRenderer.on('pipeline:runError', handler)
    return () => ipcRenderer.removeListener('pipeline:runError', handler)
  },

  // Applications
  applicationsList: () => ipcRenderer.invoke('applications:list'),
  applicationsDelete: (id) => ipcRenderer.invoke('applications:delete', id),
  applicationSubmit: (scoredJobId) => ipcRenderer.invoke('applications:submit', scoredJobId),
  applicationSubmitBatch: (scoredJobIds) => ipcRenderer.invoke('applications:submitBatch', scoredJobIds),

  // Application defaults
  applicationDefaultsGet: () => ipcRenderer.invoke('applicationDefaults:get'),
  applicationDefaultsSave: (d: ApplicationDefaults) => ipcRenderer.invoke('applicationDefaults:save', d),

  // Chrome apply
  chromeApplyCheckConnection: () => ipcRenderer.invoke('chromeApply:checkConnection'),
  chromeApplyStart: (req: ChromeApplyStartRequest) => ipcRenderer.invoke('chromeApply:start', req),
  chromeApplyCancel: (sessionId) => ipcRenderer.invoke('chromeApply:cancel', sessionId),
  chromeApplyListRuns: () => ipcRenderer.invoke('chromeApply:listRuns'),
  onChromeApplyProgress: (cb) => {
    const handler = (_: Electron.IpcRendererEvent, payload: ChromeApplyProgressPayload) => cb(payload)
    ipcRenderer.on('chromeApply:progress', handler)
    return () => ipcRenderer.removeListener('chromeApply:progress', handler)
  },

  // Gmail verification
  gmailStatus: () => ipcRenderer.invoke('gmail:status'),
  gmailConnect: () => ipcRenderer.invoke('gmail:connect'),
  gmailDisconnect: () => ipcRenderer.invoke('gmail:disconnect'),

  // Session auth
  sessionAuthenticate: (atsDomain) => ipcRenderer.invoke('session:authenticate', atsDomain),
  sessionClear: (atsDomain) => ipcRenderer.invoke('session:clear', atsDomain),

  // Shell
  shellOpenExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // Updates
  updatesCheck: () => ipcRenderer.invoke('updates:check'),
  updatesDownload: () => ipcRenderer.invoke('updates:download'),
  updatesInstallAndRestart: () => ipcRenderer.invoke('updates:installAndRestart'),
  updatesGetVersion: () => ipcRenderer.invoke('updates:getVersion'),
  onUpdatesStatus: (cb) => {
    const handler = (_: Electron.IpcRendererEvent, payload: { state: UpdateState }) => cb(payload)
    ipcRenderer.on('updates:status', handler)
    return () => ipcRenderer.removeListener('updates:status', handler)
  },
  onUpdatesProgress: (cb) => {
    const handler = (_: Electron.IpcRendererEvent, payload: UpdateProgress) => cb(payload)
    ipcRenderer.on('updates:progress', handler)
    return () => ipcRenderer.removeListener('updates:progress', handler)
  },
  onUpdatesError: (cb) => {
    const handler = (_: Electron.IpcRendererEvent, payload: { message: string }) => cb(payload)
    ipcRenderer.on('updates:error', handler)
    return () => ipcRenderer.removeListener('updates:error', handler)
  }
}

contextBridge.exposeInMainWorld('api', api)

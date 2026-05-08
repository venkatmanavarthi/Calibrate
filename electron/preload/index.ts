import { contextBridge, ipcRenderer } from 'electron'
import type { WindowAPI, UpdateState, UpdateProgress } from '../../src/types/ipc'

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

  // Import / Export
  exportData: () => ipcRenderer.invoke('export:data'),
  importData: () => ipcRenderer.invoke('import:data'),

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

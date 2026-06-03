import { BrowserWindow } from 'electron'
import { registerProfilesIpc, registerDataIpc } from './profiles.ipc'
import { registerSettingsIpc } from './settings.ipc'
import { registerAiIpc } from './ai.ipc'
import { registerPdfIpc } from './pdf.ipc'
import { registerPdfImportIpc } from './pdf-import.ipc'
import { registerUpdatesIpc } from './updates.ipc'
import { registerEmailIpc, registerShellIpc } from './email.ipc'
import { registerJobsIpc } from './jobs.ipc'
import { registerPipelineIpc } from './pipeline.ipc'
import { registerApplicationsIpc } from './applications.ipc'
import { registerInterviewIpc } from './interview.ipc'

export function registerAllIpc(win: BrowserWindow): void {
  registerProfilesIpc()
  registerSettingsIpc()
  registerAiIpc(win)
  registerPdfIpc(win)
  registerDataIpc(win)
  registerPdfImportIpc()
  registerUpdatesIpc(win)
  registerShellIpc()
  registerEmailIpc()
  registerJobsIpc()
  registerPipelineIpc(win)
  registerApplicationsIpc(win)
  registerInterviewIpc(win)
}

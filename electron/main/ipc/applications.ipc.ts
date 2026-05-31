import { ipcMain } from 'electron'
import {
  listApplications,
  deleteApplication
} from '../storage/applications.store'
import { openSessionWindow, clearSession } from '../session-auth/index'
import {
  startChromeApply,
  checkChromeApplyConnection,
  cancelChromeApply,
  getApplyRuns
} from '../chrome-apply/index'
import { getGmailStatus, startGmailConnect, disconnectGmail } from '../gmail/index'
import {
  loadApplicationDefaults,
  saveApplicationDefaults
} from '../storage/application-defaults.store'
import type { ApplicationDefaults } from '../../../src/types/models'
import type { BrowserWindow } from 'electron'

export function registerApplicationsIpc(win: BrowserWindow): void {
  ipcMain.handle('applications:list', () => listApplications())

  ipcMain.handle('applications:delete', async (_, id: string) => {
    deleteApplication(id)
    return { ok: true as const }
  })

  ipcMain.handle('applications:submit', async (_, scoredJobId: string) => {
    await startChromeApply({ scoredJobId }, win)
    const records = listApplications()
    return records.find((r) => r.scoredJobId === scoredJobId) ?? records[0]
  })

  ipcMain.handle('applications:submitBatch', async (_, scoredJobIds: string[]) => {
    const results = []
    for (const scoredJobId of scoredJobIds) {
      await startChromeApply({ scoredJobId }, win)
      const record = listApplications().find((r) => r.scoredJobId === scoredJobId)
      if (record) results.push(record)
    }
    return results
  })

  ipcMain.handle('applicationDefaults:get', () => loadApplicationDefaults())

  ipcMain.handle('applicationDefaults:save', async (_, d: ApplicationDefaults) => {
    await saveApplicationDefaults(d)
    return { ok: true as const }
  })

  ipcMain.handle('chromeApply:checkConnection', () => checkChromeApplyConnection())

  ipcMain.handle('chromeApply:start', (_, req) => startChromeApply(req, win))

  ipcMain.handle('chromeApply:cancel', async (_, sessionId: string) => {
    await cancelChromeApply(sessionId)
    return { ok: true as const }
  })

  ipcMain.handle('chromeApply:listRuns', () => getApplyRuns())

  ipcMain.handle('gmail:status', () => getGmailStatus())

  ipcMain.handle('gmail:connect', () => startGmailConnect())

  ipcMain.handle('gmail:disconnect', async () => {
    await disconnectGmail()
    return { ok: true as const }
  })

  ipcMain.handle('session:authenticate', (_, atsDomain: string) =>
    openSessionWindow(atsDomain)
  )

  ipcMain.handle('session:clear', async (_, atsDomain: string) => {
    await clearSession(atsDomain)
    return { ok: true as const }
  })
}

import { ipcMain, BrowserWindow, app } from 'electron'
import { autoUpdater } from 'electron-updater'

export function registerUpdatesIpc(win: BrowserWindow): void {
  const send = (channel: string, payload?: unknown) => {
    if (!win.isDestroyed()) win.webContents.send(channel, payload)
  }

  // In dev or on macOS (unsigned builds can't use Squirrel.Mac), register stubs only
  if (!app.isPackaged || process.platform === 'darwin') {
    ipcMain.handle('updates:getVersion', () => app.getVersion())
    ipcMain.handle('updates:check', () => {})
    ipcMain.handle('updates:download', () => {})
    ipcMain.handle('updates:installAndRestart', () => {})
    return
  }

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('checking-for-update', () =>
    send('updates:status', { state: 'checking' })
  )
  autoUpdater.on('update-available', () =>
    send('updates:status', { state: 'available' })
  )
  autoUpdater.on('update-not-available', () =>
    send('updates:status', { state: 'not-available' })
  )
  autoUpdater.on('download-progress', (progress) =>
    send('updates:progress', progress)
  )
  autoUpdater.on('update-downloaded', () =>
    send('updates:status', { state: 'downloaded' })
  )
  autoUpdater.on('error', (err) => {
    send('updates:status', { state: 'error' })
    send('updates:error', { message: err.message })
  })

  ipcMain.handle('updates:getVersion', () => app.getVersion())

  ipcMain.handle('updates:check', async () => {
    try {
      await autoUpdater.checkForUpdates()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      send('updates:status', { state: 'error' })
      send('updates:error', { message })
    }
  })

  ipcMain.handle('updates:download', async () => {
    try {
      send('updates:status', { state: 'downloading' })
      await autoUpdater.downloadUpdate()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      send('updates:status', { state: 'error' })
      send('updates:error', { message })
    }
  })

  ipcMain.handle('updates:installAndRestart', () => {
    autoUpdater.quitAndInstall()
  })

  // Check 10s after startup to avoid blocking first paint
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 10_000)
}

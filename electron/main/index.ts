import { app, BrowserWindow, shell, nativeTheme } from 'electron'
import { join } from 'path'
import { ensureDirectories } from './storage/index'
import { loadSettings } from './storage/settings.store'
import { registerAllIpc } from './ipc/index'
import { readPromptsCalibrateFile } from './ipc/settings.ipc'
import { startChromeApplyBridge } from './chrome-apply/bridge'

let mainWindow: BrowserWindow | null = null
let pendingCalibrateFile: string | null = null

function getCalibrateArgv(argv: string[]): string | null {
  return argv.find((a) => a.endsWith('.calibrate')) ?? null
}

async function sendCalibrateFile(filePath: string): Promise<void> {
  if (!mainWindow) return
  const file = await readPromptsCalibrateFile(filePath)
  if (!file) return
  mainWindow.webContents.send('prompts:openCalibrate', { generation: file.generation, revision: file.revision })
}

// Must register before app is ready to catch macOS cold-start open-file events
app.on('will-finish-launching', () => {
  app.on('open-file', (event, filePath) => {
    event.preventDefault()
    if (!filePath.endsWith('.calibrate')) return
    if (mainWindow) {
      sendCalibrateFile(filePath)
    } else {
      pendingCalibrateFile = filePath
    }
  })
})

// Single-instance lock so Win/Linux warm-start routes to the existing window
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', (_, argv) => {
    const filePath = getCalibrateArgv(argv)
    if (filePath && mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      sendCalibrateFile(filePath)
    } else if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

async function createWindow(): Promise<void> {
  await ensureDirectories()
  startChromeApplyBridge()

  const settings = await loadSettings()
  const prefersDark =
    settings.theme === 'dark' ||
    (settings.theme === 'system' && nativeTheme.shouldUseDarkColors)
  const backgroundColor = prefersDark ? '#1c1917' : '#f9f8f5'

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false // sandbox:true breaks safeStorage on some platforms
    }
  })

  mainWindow.once('ready-to-show', async () => {
    mainWindow?.show()
    // Handle file opened before window was ready (macOS cold start or Win/Linux argv)
    const filePath = pendingCalibrateFile ?? getCalibrateArgv(process.argv)
    if (filePath) {
      pendingCalibrateFile = null
      await sendCalibrateFile(filePath)
    }
  })

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://') && !url.startsWith('http://localhost')) {
      e.preventDefault()
      shell.openExternal(url)
    }
  })

  registerAllIpc(mainWindow)

  if (process.env['NODE_ENV'] === 'development') {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(join(__dirname, '../../renderer/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (!mainWindow) createWindow()
})

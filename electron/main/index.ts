import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { ensureDirectories } from './storage/index'
import { seedExampleTemplates } from './storage/seed'
import { registerAllIpc } from './ipc/index'

let mainWindow: BrowserWindow | null = null

async function createWindow(): Promise<void> {
  await ensureDirectories()
  await seedExampleTemplates()

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false // sandbox:true breaks safeStorage on some platforms
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

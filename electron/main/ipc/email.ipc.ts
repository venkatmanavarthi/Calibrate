import { ipcMain, shell } from 'electron'
import { execFile } from 'child_process'
import os from 'os'
import path from 'path'
import fs from 'fs'
import { exportToPdf } from '../pdf/exporter'
import type { PdfExportRequest } from '../../../src/types/models'

export function registerShellIpc(): void {
  ipcMain.handle('shell:openExternal', async (_, url: string) => {
    await shell.openExternal(url)
  })
}

export function registerEmailIpc(): void {
  ipcMain.handle('pdf:emailExport', async (_, req: PdfExportRequest) => {
    const tmpPath = path.join(os.tmpdir(), `resume-${Date.now()}.pdf`)
    await exportToPdf({ ...req, destFilePath: tmpPath })

    if (process.platform === 'darwin') {
      await openMailWithAttachmentMac(tmpPath)
    } else {
      // Non-macOS: open mail client without attachment (mailto can't attach files)
      await shell.openExternal('mailto:?subject=Resume')
    }

    return { ok: true as const }
  })
}

function openMailWithAttachmentMac(filePath: string): Promise<void> {
  const script = [
    'tell application "Mail"',
    '  set newMessage to make new outgoing message with properties {subject:"Resume", visible:true}',
    '  tell newMessage',
    `    make new attachment with properties {file name:POSIX file "${filePath}"}`,
    '  end tell',
    '  activate',
    'end tell',
  ].join('\n')

  const scriptPath = path.join(os.tmpdir(), `open-mail-${Date.now()}.applescript`)
  fs.writeFileSync(scriptPath, script, 'utf8')

  return new Promise((resolve, reject) => {
    execFile('osascript', [scriptPath], (err) => {
      fs.unlink(scriptPath, () => {})
      if (err) reject(err)
      else resolve()
    })
  })
}

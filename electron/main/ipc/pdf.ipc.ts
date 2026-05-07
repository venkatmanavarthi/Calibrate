import { ipcMain, dialog, BrowserWindow } from 'electron'
import { exportToPdf } from '../pdf/exporter'
import type { PdfExportRequest } from '../../../src/types/models'

export function registerPdfIpc(win: BrowserWindow): void {
  ipcMain.handle('pdf:chooseDestination', async () => {
    const result = await dialog.showSaveDialog(win, {
      defaultPath: 'resume.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    return { filePath: result.canceled ? null : result.filePath }
  })

  ipcMain.handle('pdf:export', async (_, req: PdfExportRequest) => {
    await exportToPdf(req)
    return { filePath: req.destFilePath }
  })
}

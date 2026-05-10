import { ipcMain, dialog } from 'electron'
import fs from 'fs/promises'
import { listTemplates, getTemplate, saveTemplate, deleteTemplate } from '../storage/templates.store'
import type { CalibrateFile, ResumeTemplate } from '../../../src/types/models'

export function registerTemplatesIpc(): void {
  ipcMain.handle('templates:list', () => listTemplates())
  ipcMain.handle('templates:get', (_, id: string) => getTemplate(id))
  ipcMain.handle('templates:save', (_, template: ResumeTemplate) => {
    return saveTemplate(template).then(() => ({ ok: true as const }))
  })
  ipcMain.handle('templates:delete', async (_, id: string) => {
    const template = await getTemplate(id)
    if (template?.preset) throw new Error('Cannot delete a preset template')
    return deleteTemplate(id).then(() => ({ ok: true as const }))
  })
  ipcMain.handle('templates:exportCalibrate', async (_, id: string) => {
    const template = await getTemplate(id)
    if (!template) return { filePath: null }

    const safeName = template.name.replace(/[/\\:*?"<>|]/g, '_')
    const result = await dialog.showSaveDialog({
      defaultPath: `${safeName}.calibrate`,
      filters: [{ name: 'Calibrate Template', extensions: ['calibrate'] }]
    })
    if (result.canceled || !result.filePath) return { filePath: null }

    const file: CalibrateFile = { version: 1, type: 'template', template }
    await fs.writeFile(result.filePath, JSON.stringify(file, null, 2), 'utf-8')
    return { filePath: result.filePath }
  })
}

export async function readCalibrateFile(filePath: string): Promise<CalibrateFile | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const file = JSON.parse(raw) as CalibrateFile
    if (file.version !== 1) return null
    if (file.type === 'template' && file.template?.id && file.template?.markdownContent) return file
    if (file.type === 'prompts' && typeof file.generation === 'string' && typeof file.revision === 'string') return file
    return null
  } catch {
    return null
  }
}

import { ipcMain } from 'electron'
import { listTemplates, getTemplate, saveTemplate, deleteTemplate } from '../storage/templates.store'
import type { ResumeTemplate } from '../../../src/types/models'

export function registerTemplatesIpc(): void {
  ipcMain.handle('templates:list', () => listTemplates())
  ipcMain.handle('templates:get', (_, id: string) => getTemplate(id))
  ipcMain.handle('templates:save', (_, template: ResumeTemplate) => {
    return saveTemplate(template).then(() => ({ ok: true as const }))
  })
  ipcMain.handle('templates:delete', (_, id: string) => {
    return deleteTemplate(id).then(() => ({ ok: true as const }))
  })
}

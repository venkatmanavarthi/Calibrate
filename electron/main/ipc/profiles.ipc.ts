import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { listProfiles, getProfile, saveProfile, deleteProfile } from '../storage/profiles.store'
import { listTemplates } from '../storage/templates.store'
import type { ExportBundle, ExperienceProfile, ResumeTemplate } from '../../../src/types/models'
import { PROFILES_DIR, TEMPLATES_DIR } from '../storage/index'

export function registerProfilesIpc(): void {
  ipcMain.handle('profiles:list', () => listProfiles())
  ipcMain.handle('profiles:get', (_, id: string) => getProfile(id))
  ipcMain.handle('profiles:save', (_, profile: ExperienceProfile) => {
    return saveProfile(profile).then(() => ({ ok: true as const }))
  })
  ipcMain.handle('profiles:delete', (_, id: string) => {
    return deleteProfile(id).then(() => ({ ok: true as const }))
  })
}

export function registerDataIpc(win: BrowserWindow): void {
  ipcMain.handle('export:data', async () => {
    const result = await dialog.showSaveDialog(win, {
      defaultPath: `calibrate-export-${Date.now()}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return { filePath: null }

    const [profiles, templates] = await Promise.all([listProfiles(), listTemplates()])
    const bundle: ExportBundle = {
      version: 1,
      exportedAt: new Date().toISOString(),
      profiles,
      templates
    }
    await fs.writeFile(result.filePath, JSON.stringify(bundle, null, 2), 'utf-8')
    return { filePath: result.filePath }
  })

  ipcMain.handle('import:data', async () => {
    const result = await dialog.showOpenDialog(win, {
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths[0]) {
      return { imported: false, profileCount: 0, templateCount: 0 }
    }

    const raw = await fs.readFile(result.filePaths[0], 'utf-8')
    const bundle = JSON.parse(raw) as ExportBundle

    if (bundle.version !== 1 || !Array.isArray(bundle.profiles) || !Array.isArray(bundle.templates)) {
      throw new Error('Invalid export file format')
    }

    await Promise.all([
      ...bundle.profiles.map((p: ExperienceProfile) =>
        fs.writeFile(path.join(PROFILES_DIR, `${p.id}.json`), JSON.stringify(p, null, 2), 'utf-8')
      ),
      ...bundle.templates.map((t: ResumeTemplate) =>
        fs.writeFile(path.join(TEMPLATES_DIR, `${t.id}.json`), JSON.stringify(t, null, 2), 'utf-8')
      )
    ])

    return {
      imported: true,
      profileCount: bundle.profiles.length,
      templateCount: bundle.templates.length
    }
  })
}

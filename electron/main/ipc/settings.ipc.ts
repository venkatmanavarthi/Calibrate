import { ipcMain } from 'electron'
import { loadSettings, saveSettings } from '../storage/settings.store'
import { setKey, deleteKey, hasKey } from '../security/keystore'
import type { AIProvider, AppSettings } from '../../../src/types/models'

export function registerSettingsIpc(): void {
  ipcMain.handle('settings:get', () => loadSettings())

  ipcMain.handle('settings:save', (_, partial: Partial<AppSettings>) => {
    return saveSettings(partial).then(() => ({ ok: true as const }))
  })

  ipcMain.handle('settings:setKey', async (_, provider: AIProvider, key: string) => {
    await setKey(provider, key)
    // Track which providers are configured
    const settings = await loadSettings()
    const configured = new Set(settings.configuredProviders)
    configured.add(provider)
    await saveSettings({ configuredProviders: [...configured] })
    return { ok: true as const }
  })

  ipcMain.handle('settings:deleteKey', async (_, provider: AIProvider) => {
    await deleteKey(provider)
    const settings = await loadSettings()
    const configured = settings.configuredProviders.filter((p) => p !== provider)
    await saveSettings({ configuredProviders: configured })
    return { ok: true as const }
  })

  ipcMain.handle('settings:hasKey', async (_, provider: AIProvider) => {
    const result = await hasKey(provider)
    return { hasKey: result }
  })
}

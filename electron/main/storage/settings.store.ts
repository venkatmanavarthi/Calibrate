import fs from 'fs/promises'
import { safeStorage } from 'electron'
import { SETTINGS_FILE } from './index'
import type { AppSettings } from '../../../src/types/models'

const DEFAULT_SETTINGS: AppSettings = {
  preferredProvider: 'anthropic',
  preferredModels: {
    anthropic: 'claude-sonnet-4-5',
    openai: 'gpt-4o',
    gemini: 'gemini-1.5-pro',
    groq: 'llama3-70b-8192',
    lmstudio: 'local-model'
  },
  lmStudioConfig: {
    baseUrl: 'http://localhost:1234/v1',
    modelName: 'local-model'
  },
  encryptionAvailable: safeStorage.isEncryptionAvailable(),
  theme: 'system',
  pdfPageSize: 'Letter',
  pdfMarginMm: 15,
  configuredProviders: []
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await fs.readFile(SETTINGS_FILE, 'utf-8')
    const stored = JSON.parse(raw) as Partial<AppSettings>
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      encryptionAvailable: safeStorage.isEncryptionAvailable()
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function saveSettings(partial: Partial<AppSettings>): Promise<void> {
  const current = await loadSettings()
  const updated = { ...current, ...partial }
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8')
}

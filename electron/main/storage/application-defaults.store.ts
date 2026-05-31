import fs from 'fs/promises'
import { APPLICATION_DEFAULTS_FILE } from './index'
import type { ApplicationDefaults } from '../../../src/types/models'

const DEFAULT_DEFAULTS: ApplicationDefaults = {
  workAuthorized: true,
  requiresSponsorship: false
}

export async function loadApplicationDefaults(): Promise<ApplicationDefaults> {
  try {
    const raw = await fs.readFile(APPLICATION_DEFAULTS_FILE, 'utf-8')
    return { ...DEFAULT_DEFAULTS, ...(JSON.parse(raw) as Partial<ApplicationDefaults>) }
  } catch {
    return { ...DEFAULT_DEFAULTS }
  }
}

export async function saveApplicationDefaults(d: ApplicationDefaults): Promise<void> {
  await fs.writeFile(APPLICATION_DEFAULTS_FILE, JSON.stringify(d, null, 2), 'utf-8')
}

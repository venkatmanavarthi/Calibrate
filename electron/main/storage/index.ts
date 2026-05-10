import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'

export const STORAGE_ROOT = app.getPath('userData')
export const PROFILES_DIR = path.join(STORAGE_ROOT, 'profiles')
export const TEMPLATES_DIR = path.join(STORAGE_ROOT, 'templates')
export const JOBS_DIR = path.join(STORAGE_ROOT, 'jobs')
export const SETTINGS_FILE = path.join(STORAGE_ROOT, 'settings.json')
export const KEYRING_FILE = path.join(STORAGE_ROOT, 'keyring.json')
export const COMPANIES_FILE = path.join(JOBS_DIR, 'companies.json')
export const JOBS_CACHE_FILE = path.join(JOBS_DIR, 'jobs.json')

export async function ensureDirectories(): Promise<void> {
  await fs.mkdir(PROFILES_DIR, { recursive: true })
  await fs.mkdir(TEMPLATES_DIR, { recursive: true })
  await fs.mkdir(JOBS_DIR, { recursive: true })
}

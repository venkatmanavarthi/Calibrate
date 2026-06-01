import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { initDb, migrateFromJson } from './db'

export const STORAGE_ROOT = app.getPath('userData')
export const PROFILES_DIR = path.join(STORAGE_ROOT, 'profiles')
export const JOBS_DIR = path.join(STORAGE_ROOT, 'jobs')
export const SETTINGS_FILE = path.join(STORAGE_ROOT, 'settings.json')
export const KEYRING_FILE = path.join(STORAGE_ROOT, 'keyring.json')
export const SITE_CREDENTIALS_FILE = path.join(STORAGE_ROOT, 'site-credentials.json')
export const GMAIL_CONNECTION_FILE = path.join(STORAGE_ROOT, 'gmail-connection.json')
export const COMPANIES_FILE = path.join(JOBS_DIR, 'companies.json')
export const JOBS_CACHE_FILE = path.join(JOBS_DIR, 'jobs.json')
export const YC_CACHE_FILE = path.join(JOBS_DIR, 'yc-companies.json')

export const APPLICATION_DEFAULTS_FILE = path.join(STORAGE_ROOT, 'application-defaults.json')
export const SCREENSHOTS_DIR = path.join(STORAGE_ROOT, 'screenshots')

export const PIPELINE_DIR = path.join(STORAGE_ROOT, 'pipeline')
export const PIPELINES_FILE = path.join(PIPELINE_DIR, 'pipelines.json')
export const PIPELINE_RUNS_FILE = path.join(PIPELINE_DIR, 'runs.json')
export const PIPELINE_SCORED_JOBS_FILE = path.join(PIPELINE_DIR, 'scored-jobs.json')

export async function ensureDirectories(): Promise<void> {
  await fs.mkdir(PROFILES_DIR, { recursive: true })
  await fs.mkdir(JOBS_DIR, { recursive: true })
  await fs.mkdir(PIPELINE_DIR, { recursive: true })
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true })
  initDb()
  await migrateFromJson()
}

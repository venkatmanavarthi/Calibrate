import fs from 'fs/promises'
import { safeStorage } from 'electron'
import { SITE_CREDENTIALS_FILE } from './index'
import type { SiteCredential } from '../../../src/types/models'

function nowIso(): string {
  return new Date().toISOString()
}

function normalizeOrigin(urlOrOrigin: string): string {
  try {
    return new URL(urlOrOrigin).origin
  } catch {
    return urlOrOrigin
  }
}

async function readAll(): Promise<SiteCredential[]> {
  try {
    return JSON.parse(await fs.readFile(SITE_CREDENTIALS_FILE, 'utf-8')) as SiteCredential[]
  } catch {
    return []
  }
}

async function writeAll(credentials: SiteCredential[]): Promise<void> {
  await fs.writeFile(SITE_CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), 'utf-8')
}

function encryptPassword(password: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(password).toString('base64')
  }
  return Buffer.from(password, 'utf-8').toString('base64')
}

function decryptPassword(encrypted: string): string {
  const buf = Buffer.from(encrypted, 'base64')
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(buf)
  }
  return buf.toString('utf-8')
}

export async function getSiteCredential(urlOrOrigin: string): Promise<{ email: string; password: string } | null> {
  const origin = normalizeOrigin(urlOrOrigin)
  const found = (await readAll()).find((c) => c.origin === origin)
  if (!found) return null
  return { email: found.email, password: decryptPassword(found.encryptedPassword) }
}

export async function saveSiteCredential(urlOrOrigin: string, email: string, password: string): Promise<void> {
  const origin = normalizeOrigin(urlOrOrigin)
  const all = await readAll()
  const existing = all.find((c) => c.origin === origin)
  if (existing) {
    existing.email = email
    existing.encryptedPassword = encryptPassword(password)
    existing.updatedAt = nowIso()
  } else {
    all.push({
      origin,
      email,
      encryptedPassword: encryptPassword(password),
      createdAt: nowIso(),
      updatedAt: nowIso()
    })
  }
  await writeAll(all)
}

export async function markSiteCredentialLogin(urlOrOrigin: string): Promise<void> {
  const origin = normalizeOrigin(urlOrOrigin)
  const all = await readAll()
  const existing = all.find((c) => c.origin === origin)
  if (!existing) return
  existing.lastLoginAt = nowIso()
  existing.updatedAt = nowIso()
  await writeAll(all)
}

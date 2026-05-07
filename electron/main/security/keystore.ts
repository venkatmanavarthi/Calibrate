import { safeStorage } from 'electron'
import fs from 'fs/promises'
import { KEYRING_FILE } from '../storage/index'
import type { AIProvider } from '../../../src/types/models'

type Keyring = Partial<Record<AIProvider, string>>

async function readKeyring(): Promise<Keyring> {
  try {
    const raw = await fs.readFile(KEYRING_FILE, 'utf-8')
    return JSON.parse(raw) as Keyring
  } catch {
    return {}
  }
}

async function writeKeyring(kr: Keyring): Promise<void> {
  await fs.writeFile(KEYRING_FILE, JSON.stringify(kr), 'utf-8')
}

export async function setKey(provider: AIProvider, plaintext: string): Promise<void> {
  const kr = await readKeyring()
  if (safeStorage.isEncryptionAvailable()) {
    kr[provider] = safeStorage.encryptString(plaintext).toString('base64')
  } else {
    kr[provider] = plaintext
  }
  await writeKeyring(kr)
}

export async function getKey(provider: AIProvider): Promise<string | null> {
  const kr = await readKeyring()
  const stored = kr[provider]
  if (!stored) return null
  if (!safeStorage.isEncryptionAvailable()) return stored
  const buf = Buffer.from(stored, 'base64')
  return safeStorage.decryptString(buf)
}

export async function deleteKey(provider: AIProvider): Promise<void> {
  const kr = await readKeyring()
  delete kr[provider]
  await writeKeyring(kr)
}

export async function hasKey(provider: AIProvider): Promise<boolean> {
  const kr = await readKeyring()
  return provider in kr
}

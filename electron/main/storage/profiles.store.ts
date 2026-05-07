import fs from 'fs/promises'
import path from 'path'
import { PROFILES_DIR } from './index'
import type { ExperienceProfile } from '../../../src/types/models'

export async function listProfiles(): Promise<ExperienceProfile[]> {
  const files = await fs.readdir(PROFILES_DIR)
  const profiles = await Promise.all(
    files
      .filter((f) => f.endsWith('.json'))
      .map(async (f) => {
        const raw = await fs.readFile(path.join(PROFILES_DIR, f), 'utf-8')
        return JSON.parse(raw) as ExperienceProfile
      })
  )
  return profiles.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getProfile(id: string): Promise<ExperienceProfile | null> {
  const filePath = path.join(PROFILES_DIR, `${id}.json`)
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as ExperienceProfile
  } catch {
    return null
  }
}

export async function saveProfile(profile: ExperienceProfile): Promise<void> {
  const filePath = path.join(PROFILES_DIR, `${profile.id}.json`)
  await fs.writeFile(filePath, JSON.stringify(profile, null, 2), 'utf-8')
}

export async function deleteProfile(id: string): Promise<void> {
  await fs.unlink(path.join(PROFILES_DIR, `${id}.json`))
}

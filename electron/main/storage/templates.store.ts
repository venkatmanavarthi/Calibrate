import fs from 'fs/promises'
import path from 'path'
import { TEMPLATES_DIR } from './index'
import type { ResumeTemplate } from '../../../src/types/models'

export async function listTemplates(): Promise<ResumeTemplate[]> {
  const files = await fs.readdir(TEMPLATES_DIR)
  const templates = await Promise.all(
    files
      .filter((f) => f.endsWith('.json'))
      .map(async (f) => {
        const raw = await fs.readFile(path.join(TEMPLATES_DIR, f), 'utf-8')
        return JSON.parse(raw) as ResumeTemplate
      })
  )
  return templates.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getTemplate(id: string): Promise<ResumeTemplate | null> {
  const filePath = path.join(TEMPLATES_DIR, `${id}.json`)
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as ResumeTemplate
  } catch {
    return null
  }
}

export async function saveTemplate(template: ResumeTemplate): Promise<void> {
  const filePath = path.join(TEMPLATES_DIR, `${template.id}.json`)
  await fs.writeFile(filePath, JSON.stringify(template, null, 2), 'utf-8')
}

export async function deleteTemplate(id: string): Promise<void> {
  await fs.unlink(path.join(TEMPLATES_DIR, `${id}.json`))
}

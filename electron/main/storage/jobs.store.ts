import fs from 'fs/promises'
import { COMPANIES_FILE, JOBS_CACHE_FILE } from './index'
import type { TrackedCompany, NormalizedJob } from '../../../src/types/models'

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf-8')
}

export async function listCompanies(): Promise<TrackedCompany[]> {
  return readJson<TrackedCompany[]>(COMPANIES_FILE, [])
}

export async function saveCompany(company: TrackedCompany): Promise<void> {
  const all = await listCompanies()
  const next = all.filter((c) => c.id !== company.id).concat(company)
  await writeJson(COMPANIES_FILE, next)
}

export async function deleteCompany(id: string): Promise<void> {
  const all = await listCompanies()
  await writeJson(COMPANIES_FILE, all.filter((c) => c.id !== id))
  const jobs = await listJobs()
  await writeJson(JOBS_CACHE_FILE, jobs.filter((j) => j.companyId !== id))
}

export async function listJobs(): Promise<NormalizedJob[]> {
  return readJson<NormalizedJob[]>(JOBS_CACHE_FILE, [])
}

export async function upsertJobs(companyId: string, incoming: NormalizedJob[]): Promise<number> {
  const all = await listJobs()
  const byKey = new Map(all.map((j) => [`${j.source}:${j.externalId}`, j]))
  const now = new Date().toISOString()
  let added = 0
  for (const job of incoming) {
    const key = `${job.source}:${job.externalId}`
    const existing = byKey.get(key)
    if (existing) {
      byKey.set(key, {
        ...existing,
        title: job.title,
        location: job.location,
        remote: job.remote,
        department: job.department,
        employmentType: job.employmentType,
        descriptionHtml: job.descriptionHtml,
        applyUrl: job.applyUrl,
        postedAt: job.postedAt || existing.postedAt,
        updatedAt: job.updatedAt,
        lastSeenAt: now
      })
    } else {
      byKey.set(key, { ...job, firstSeenAt: now, lastSeenAt: now })
      added++
    }
  }
  // Keep jobs from other companies untouched
  const others = all.filter((j) => j.companyId !== companyId)
  const updatedForCompany = Array.from(byKey.values()).filter((j) => j.companyId === companyId)
  await writeJson(JOBS_CACHE_FILE, [...others, ...updatedForCompany])
  return added
}

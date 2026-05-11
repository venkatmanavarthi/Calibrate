import { getDb } from './db'
import type { TrackedCompany, NormalizedJob } from '../../../src/types/models'

type JobRow = {
  id: string
  source: string
  externalId: string
  company: string
  companyId: string
  title: string
  location: string
  remote: number
  department: string | null
  employmentType: string | null
  descriptionHtml: string
  applyUrl: string
  postedAt: string
  updatedAt: string
  firstSeenAt: string
  lastSeenAt: string
}

function rowToJob(row: JobRow): NormalizedJob {
  return {
    ...row,
    source: row.source as NormalizedJob['source'],
    remote: row.remote === 1,
    department: row.department ?? undefined,
    employmentType: row.employmentType ?? undefined
  }
}

export async function listCompanies(): Promise<TrackedCompany[]> {
  return getDb()
    .prepare('SELECT * FROM companies ORDER BY addedAt ASC')
    .all() as TrackedCompany[]
}

export async function saveCompany(company: TrackedCompany): Promise<void> {
  getDb()
    .prepare(`
      INSERT INTO companies (id, name, source, slug, addedAt) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name   = excluded.name,
        source = excluded.source,
        slug   = excluded.slug
    `)
    .run(company.id, company.name, company.source, company.slug, company.addedAt)
}

export async function deleteCompany(id: string): Promise<void> {
  const db = getDb()
  db.transaction(() => {
    db.prepare('DELETE FROM jobs WHERE companyId = ?').run(id)
    db.prepare('DELETE FROM companies WHERE id = ?').run(id)
  })()
}

export async function listJobs(): Promise<NormalizedJob[]> {
  const rows = getDb()
    .prepare('SELECT * FROM jobs ORDER BY lastSeenAt DESC')
    .all() as JobRow[]
  return rows.map(rowToJob)
}

export async function upsertJobs(companyId: string, incoming: NormalizedJob[]): Promise<number> {
  if (incoming.length === 0) return 0

  const db = getDb()
  const now = new Date().toISOString()

  const countBefore = (
    db.prepare('SELECT COUNT(*) AS n FROM jobs WHERE companyId = ?').get(companyId) as { n: number }
  ).n

  const upsert = db.prepare(`
    INSERT INTO jobs
      (id, source, externalId, company, companyId, title, location, remote,
       department, employmentType, descriptionHtml, applyUrl, postedAt, updatedAt, firstSeenAt, lastSeenAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source, externalId) DO UPDATE SET
      title           = excluded.title,
      location        = excluded.location,
      remote          = excluded.remote,
      department      = excluded.department,
      employmentType  = excluded.employmentType,
      descriptionHtml = excluded.descriptionHtml,
      applyUrl        = excluded.applyUrl,
      postedAt        = COALESCE(excluded.postedAt, jobs.postedAt),
      updatedAt       = excluded.updatedAt,
      lastSeenAt      = excluded.lastSeenAt
  `)

  db.transaction(() => {
    for (const job of incoming) {
      upsert.run(
        job.id, job.source, job.externalId, job.company, job.companyId,
        job.title, job.location, job.remote ? 1 : 0,
        job.department ?? null, job.employmentType ?? null,
        job.descriptionHtml, job.applyUrl, job.postedAt, job.updatedAt,
        now, now
      )
    }
  })()

  const countAfter = (
    db.prepare('SELECT COUNT(*) AS n FROM jobs WHERE companyId = ?').get(companyId) as { n: number }
  ).n

  return countAfter - countBefore
}

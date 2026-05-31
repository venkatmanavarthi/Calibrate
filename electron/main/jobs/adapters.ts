import { createHash } from 'crypto'
import { sendChromeCommand } from '../chrome-apply/bridge'
import type { JobAtsSource, NormalizedJob, TrackedCompany } from '../../../src/types/models'

const REMOTE_PATTERNS = /\b(remote|anywhere|work from home|wfh|distributed)\b/i

function isRemote(...fields: (string | undefined | null)[]): boolean {
  return fields.some((f) => !!f && REMOTE_PATTERNS.test(f))
}

function nowIso(): string {
  return new Date().toISOString()
}

function safeIso(value: string | number | undefined | null): string {
  if (value == null) return ''
  try {
    const d = typeof value === 'number' ? new Date(value) : new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    return d.toISOString()
  } catch {
    return ''
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Calibrate/1.0' }
  })
  if (!res.ok) throw new Error(`${url} responded ${res.status}`)
  return (await res.json()) as T
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeWebsiteUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error('Website URL is required')
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function stableExternalId(url: string): string {
  return createHash('sha1').update(url).digest('hex')
}

// ---------- Greenhouse ----------
// GET https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
interface GreenhouseJob {
  id: number
  title: string
  updated_at: string
  absolute_url: string
  location?: { name: string }
  content?: string
  departments?: { name: string }[]
}
interface GreenhouseResponse {
  jobs: GreenhouseJob[]
}

async function fetchGreenhouse(company: TrackedCompany): Promise<NormalizedJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(company.slug)}/jobs?content=true`
  const data = await fetchJson<GreenhouseResponse>(url)
  return (data.jobs ?? []).map((job) => {
    const location = job.location?.name ?? ''
    const department = job.departments?.[0]?.name
    // Greenhouse content is HTML-encoded twice in some boards; decode minimally.
    const description = (job.content ?? '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
    return {
      id: `greenhouse:${job.id}`,
      source: 'greenhouse',
      externalId: String(job.id),
      company: company.name,
      companyId: company.id,
      title: job.title,
      location,
      remote: isRemote(location, job.title),
      department,
      descriptionHtml: description,
      applyUrl: job.absolute_url,
      postedAt: safeIso(job.updated_at),
      updatedAt: safeIso(job.updated_at),
      firstSeenAt: nowIso(),
      lastSeenAt: nowIso()
    }
  })
}

// ---------- Lever ----------
// GET https://api.lever.co/v0/postings/{slug}?mode=json
interface LeverPosting {
  id: string
  text: string
  hostedUrl: string
  applyUrl?: string
  createdAt: number
  updatedAt?: number
  categories?: { location?: string; team?: string; commitment?: string }
  workplaceType?: string
  description?: string
  descriptionPlain?: string
  lists?: { text: string; content: string }[]
}

async function fetchLever(company: TrackedCompany): Promise<NormalizedJob[]> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(company.slug)}?mode=json`
  const data = await fetchJson<LeverPosting[]>(url)
  return (data ?? []).map((p) => {
    const location = p.categories?.location ?? ''
    const lists = (p.lists ?? [])
      .map((l) => `<h3>${l.text}</h3>${l.content}`)
      .join('')
    return {
      id: `lever:${p.id}`,
      source: 'lever',
      externalId: p.id,
      company: company.name,
      companyId: company.id,
      title: p.text,
      location,
      remote: p.workplaceType === 'remote' || isRemote(location, p.workplaceType),
      department: p.categories?.team,
      employmentType: p.categories?.commitment,
      descriptionHtml: (p.description ?? '') + lists,
      applyUrl: p.applyUrl ?? p.hostedUrl,
      postedAt: safeIso(p.createdAt),
      updatedAt: safeIso(p.updatedAt ?? p.createdAt),
      firstSeenAt: nowIso(),
      lastSeenAt: nowIso()
    }
  })
}

// ---------- Ashby ----------
// GET https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true
interface AshbyJob {
  id: string
  title: string
  location?: string
  department?: string
  team?: string
  employmentType?: string
  publishedAt?: string
  updatedAt?: string
  jobUrl: string
  descriptionHtml?: string
  descriptionPlain?: string
  isRemote?: boolean
}
interface AshbyResponse {
  jobs: AshbyJob[]
}

async function fetchAshby(company: TrackedCompany): Promise<NormalizedJob[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(company.slug)}?includeCompensation=true`
  const data = await fetchJson<AshbyResponse>(url)
  return (data.jobs ?? []).map((job) => {
    const location = job.location ?? ''
    return {
      id: `ashby:${job.id}`,
      source: 'ashby',
      externalId: job.id,
      company: company.name,
      companyId: company.id,
      title: job.title,
      location,
      remote: job.isRemote === true || isRemote(location),
      department: job.department ?? job.team,
      employmentType: job.employmentType,
      descriptionHtml: job.descriptionHtml ?? job.descriptionPlain ?? '',
      applyUrl: job.jobUrl,
      postedAt: safeIso(job.publishedAt),
      updatedAt: safeIso(job.updatedAt ?? job.publishedAt),
      firstSeenAt: nowIso(),
      lastSeenAt: nowIso()
    }
  })
}

// ---------- Website via Chrome extension ----------
interface ChromeDiscoveredJob {
  title: string
  url: string
  location?: string
  department?: string
  descriptionText?: string
}

interface ChromeDiscoveryResult {
  jobs: ChromeDiscoveredJob[]
}

function descriptionToHtml(job: ChromeDiscoveredJob): string {
  const parts = [
    `<p><strong>${escapeHtml(job.title)}</strong></p>`,
    job.location ? `<p>${escapeHtml(job.location)}</p>` : '',
    `<p><a href="${escapeHtml(job.url)}">${escapeHtml(job.url)}</a></p>`,
    ...(job.descriptionText ?? '')
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 25)
      .map((p) => `<p>${escapeHtml(p)}</p>`)
  ]
  return parts.filter(Boolean).join('\n')
}

async function fetchWebsite(company: TrackedCompany): Promise<NormalizedJob[]> {
  const url = normalizeWebsiteUrl(company.slug)
  const result = await sendChromeCommand<ChromeDiscoveryResult>('discoverJobs', {
    url,
    companyName: company.name,
    limit: 25
  })
  const seen = new Set<string>()
  return (result.jobs ?? [])
    .filter((job) => {
      if (!job.url || !job.title) return false
      const key = job.url.replace(/#.*$/, '')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((job) => {
      const externalId = stableExternalId(job.url)
      const location = job.location ?? ''
      return {
        id: `website:${externalId}`,
        source: 'website',
        externalId,
        company: company.name,
        companyId: company.id,
        title: job.title,
        location,
        remote: isRemote(location, job.title, job.descriptionText),
        department: job.department,
        descriptionHtml: descriptionToHtml(job),
        applyUrl: job.url,
        postedAt: '',
        updatedAt: nowIso(),
        firstSeenAt: nowIso(),
        lastSeenAt: nowIso()
      }
    })
}

export async function fetchCompanyJobs(company: TrackedCompany): Promise<NormalizedJob[]> {
  switch (company.source) {
    case 'greenhouse':
      return fetchGreenhouse(company)
    case 'lever':
      return fetchLever(company)
    case 'ashby':
      return fetchAshby(company)
    case 'website':
      return fetchWebsite(company)
  }
}

export function adapterDisplayName(source: JobAtsSource): string {
  if (source === 'greenhouse') return 'Greenhouse'
  if (source === 'lever') return 'Lever'
  if (source === 'ashby') return 'Ashby'
  return 'Website'
}

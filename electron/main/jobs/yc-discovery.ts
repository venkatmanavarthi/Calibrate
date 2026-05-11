import fs from 'fs/promises'
import { YC_CACHE_FILE } from '../storage/index'
import type { YCCompany, JobAtsSource, AtsProbeResult } from '../../../src/types/models'

const YC_API = 'https://api.ycombinator.com/v0.1/companies'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

interface YCApiCompany {
  id: number
  name: string
  slug: string
  website: string
  oneLiner: string
  batch: string
  status: string
  tags: string[]
}

interface YCApiPage {
  companies: YCApiCompany[]
  totalPages: number
  nextPage: string | null
}

interface YCCache {
  fetchedAt: string
  companies: YCCompany[]
}

async function fetchPage(page: number): Promise<YCApiPage> {
  const res = await fetch(`${YC_API}?page=${page}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000)
  })
  if (!res.ok) throw new Error(`YC API responded ${res.status}`)
  return res.json() as Promise<YCApiPage>
}

function normalize(c: YCApiCompany): YCCompany {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    website: c.website ?? '',
    oneLiner: c.oneLiner ?? '',
    batch: c.batch ?? '',
    status: c.status ?? '',
    tags: c.tags ?? []
  }
}

export async function fetchAllYCCompanies(
  onProgress?: (fetched: number, total: number) => void
): Promise<YCCompany[]> {
  // Return cached data if fresh
  try {
    const raw = await fs.readFile(YC_CACHE_FILE, 'utf-8')
    const cache = JSON.parse(raw) as YCCache
    if (Date.now() - new Date(cache.fetchedAt).getTime() < CACHE_TTL_MS) {
      return cache.companies
    }
  } catch {
    // cache miss or corrupt
  }

  // Fetch page 1 to get totalPages
  const first = await fetchPage(1)
  const { totalPages } = first
  const companies: YCCompany[] = first.companies.map(normalize)
  onProgress?.(companies.length, totalPages * 25)

  // Fetch remaining pages with bounded concurrency
  const CONCURRENCY = 5
  for (let start = 2; start <= totalPages; start += CONCURRENCY) {
    const batch = Array.from(
      { length: Math.min(CONCURRENCY, totalPages - start + 1) },
      (_, i) => fetchPage(start + i)
    )
    const pages = await Promise.all(batch)
    for (const p of pages) companies.push(...p.companies.map(normalize))
    onProgress?.(companies.length, totalPages * 25)
  }

  const cache: YCCache = { fetchedAt: new Date().toISOString(), companies }
  await fs.writeFile(YC_CACHE_FILE, JSON.stringify(cache), 'utf-8')
  return companies
}

// Derive slug candidates from YC slug and website domain
function slugCandidates(company: YCCompany): string[] {
  const candidates = new Set<string>()
  if (company.slug) candidates.add(company.slug)
  try {
    const host = new URL(company.website).hostname.replace(/^www\./, '')
    const domain = host.split('.')[0]
    if (domain) candidates.add(domain)
  } catch {
    // invalid URL
  }
  return [...candidates]
}

async function tryFetch(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000)
    })
    return res.ok
  } catch {
    return false
  }
}

const ATS_PROBES: { source: JobAtsSource; url: (slug: string) => string }[] = [
  { source: 'greenhouse', url: (s) => `https://boards-api.greenhouse.io/v1/boards/${s}/jobs` },
  { source: 'lever', url: (s) => `https://api.lever.co/v0/postings/${s}?mode=json` },
  { source: 'ashby', url: (s) => `https://api.ashbyhq.com/posting-api/job-board/${s}` }
]

export async function probeCompanyAts(company: YCCompany): Promise<AtsProbeResult | null> {
  const candidates = slugCandidates(company)
  for (const slug of candidates) {
    const results = await Promise.all(
      ATS_PROBES.map(async (probe) => ({
        source: probe.source,
        slug,
        ok: await tryFetch(probe.url(slug))
      }))
    )
    const match = results.find((r) => r.ok)
    if (match) return { ycCompanyId: company.id, source: match.source, atsSlug: match.slug }
  }
  return null
}

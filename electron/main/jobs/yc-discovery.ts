import fs from 'fs/promises'
import { YC_CACHE_FILE } from '../storage/index'
import type { YCCompany, JobAtsSource, AtsProbeResult } from '../../../src/types/models'

const YC_API = 'https://yc-oss.github.io/api/companies/all.json'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

interface YCApiCompany {
  id: number
  name: string
  slug: string
  website: string
  one_liner: string
  batch: string
  status: string
  tags: string[]
}

interface YCCache {
  fetchedAt: string
  companies: YCCompany[]
}

function normalize(c: YCApiCompany): YCCompany {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    website: c.website ?? '',
    oneLiner: c.one_liner ?? '',
    batch: c.batch ?? '',
    status: c.status ?? '',
    tags: c.tags ?? []
  }
}

export async function fetchAllYCCompanies(
  onProgress?: (fetched: number, total: number) => void
): Promise<YCCompany[]> {
  try {
    const raw = await fs.readFile(YC_CACHE_FILE, 'utf-8')
    const cache = JSON.parse(raw) as YCCache
    if (Date.now() - new Date(cache.fetchedAt).getTime() < CACHE_TTL_MS) {
      return cache.companies
    }
  } catch {
    // cache miss or corrupt
  }

  const res = await fetch(YC_API, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(30000)
  })
  if (!res.ok) throw new Error(`YC API responded ${res.status}`)
  const raw = (await res.json()) as YCApiCompany[]
  const companies = raw
    .filter((c) => c.status === 'Active' || c.status === 'Public')
    .map(normalize)
  onProgress?.(companies.length, companies.length)

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

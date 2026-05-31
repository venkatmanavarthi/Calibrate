import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Wand2, Search, Building2, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useJobsStore } from '@/stores/jobs.store'
import { useSettingsStore } from '@/stores/settings.store'
import { useGeneratorStore } from '@/stores/generator.store'
import type { JobAtsSource, NormalizedJob } from '@/types/models'

const SOURCE_LABEL: Record<JobAtsSource, string> = {
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  ashby: 'Ashby',
  website: 'Website'
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function daysSince(iso: string): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return Math.floor((Date.now() - t) / 86400000)
}

function JobRow({ job, onGenerate }: { job: NormalizedJob; onGenerate: (j: NormalizedJob) => void }) {
  const age = daysSince(job.postedAt || job.firstSeenAt)
  return (
    <div className="border border-border rounded-md p-3 flex items-start gap-3 hover:bg-accent/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{job.title}</span>
          {job.remote && <Badge variant="secondary" className="text-[10px] py-0">Remote</Badge>}
          {age !== null && age <= 7 && <Badge className="text-[10px] py-0">New</Badge>}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-foreground/80">{job.company}</span>
          {job.location && <span>· {job.location}</span>}
          {job.department && <span>· {job.department}</span>}
          {age !== null && <span>· {age === 0 ? 'today' : `${age}d ago`}</span>}
          <span className="text-muted-foreground/60">· {SOURCE_LABEL[job.source]}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={() => window.api.shellOpenExternal(job.applyUrl)}>
          <ExternalLink size={14} />
        </Button>
        <Button size="sm" onClick={() => onGenerate(job)}>
          <Wand2 size={14} className="mr-1" />
          Generate
        </Button>
      </div>
    </div>
  )
}

const PAGE_SIZE = 25

export default function JobsPage() {
  const navigate = useNavigate()
  const { companies, jobs, load, refreshCompany, refreshing, lastRefresh } = useJobsStore()
  const settings = useSettingsStore((s) => s.settings)
  const saveSettings = useSettingsStore((s) => s.save)
  const setJobDescription = useGeneratorStore((s) => s.setJobDescription)
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [pulledCompanyId, setPulledCompanyId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [keywordInput, setKeywordInput] = useState('')
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [postedWithin, setPostedWithin] = useState<string>('any')
  const [locationFilter, setLocationFilter] = useState('all')
  const [page, setPage] = useState(1)

  const resetPage = useCallback(() => setPage(1), [])

  useEffect(() => { load() }, [load])

  const keywords = useMemo(() => settings?.jobKeywords ?? [], [settings])

  const addKeyword = useCallback(() => {
    const kw = keywordInput.trim().toLowerCase()
    if (!kw || keywords.includes(kw)) { setKeywordInput(''); return }
    saveSettings({ jobKeywords: [...keywords, kw] })
    setKeywordInput('')
    resetPage()
  }, [keywordInput, keywords, saveSettings, resetPage])

  const removeKeyword = useCallback((kw: string) => {
    saveSettings({ jobKeywords: keywords.filter((k) => k !== kw) })
    resetPage()
  }, [keywords, saveSettings, resetPage])

  // Only consider jobs belonging to the company that was last pulled.
  const companyJobs = useMemo(
    () => (pulledCompanyId ? jobs.filter((j) => j.companyId === pulledCompanyId) : []),
    [jobs, pulledCompanyId]
  )

  const locations = useMemo(() => {
    const seen = new Set<string>()
    companyJobs.forEach((j) => { if (j.location) seen.add(j.location) })
    return ['all', ...Array.from(seen).sort()]
  }, [companyJobs])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const maxDays = postedWithin === 'any' ? null : parseInt(postedWithin, 10)
    return companyJobs
      .filter((j) => {
        if (remoteOnly && !j.remote) return false
        if (locationFilter !== 'all' && j.location !== locationFilter) return false
        if (maxDays !== null) {
          const age = daysSince(j.postedAt || j.firstSeenAt)
          if (age === null || age > maxDays) return false
        }
        const hay = `${j.title} ${j.company} ${j.location} ${j.department ?? ''}`.toLowerCase()
        // Keywords: keep a job if it matches at least one (match ANY).
        if (keywords.length > 0 && !keywords.some((kw) => hay.includes(kw))) return false
        if (!q) return true
        return hay.includes(q)
      })
      .sort((a, b) => (b.postedAt || b.firstSeenAt).localeCompare(a.postedAt || a.firstSeenAt))
  }, [companyJobs, query, keywords, remoteOnly, postedWithin, locationFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const addedCount = useMemo(
    () => (lastRefresh ? lastRefresh.reduce((sum, r) => sum + r.added, 0) : null),
    [lastRefresh]
  )

  const handlePull = async () => {
    if (!selectedCompanyId) return
    await refreshCompany(selectedCompanyId)
    setPulledCompanyId(selectedCompanyId)
    setLocationFilter('all')
    setPage(1)
  }

  const handleGenerate = (job: NormalizedJob) => {
    const header = `${job.title} @ ${job.company}\n${job.location}${job.remote ? ' (Remote)' : ''}\n${job.applyUrl}\n\n`
    setJobDescription(header + stripHtml(job.descriptionHtml))
    navigate('/generate')
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-5">
        <h2 className="text-2xl font-bold">Jobs</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Select a company and pull its latest open roles.
        </p>
      </div>

      {companies.length === 0 ? (
        <div className="border border-dashed border-border rounded-md p-10 text-center">
          <Building2 size={28} className="mx-auto text-muted-foreground/60" />
          <p className="text-sm mt-3 font-medium">No companies tracked yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Add companies in the Companies tab to start seeing open roles here.
          </p>
          <Button className="mt-4" onClick={() => navigate('/companies')}>
            Go to Companies
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3">
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a company…" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} <span className="text-muted-foreground">· {SOURCE_LABEL[c.source]}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handlePull} disabled={refreshing || !selectedCompanyId}>
              <RefreshCw size={14} className={`mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Pulling…' : 'Pull'}
            </Button>
            {!refreshing && addedCount !== null && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {addedCount === 0 ? 'No new jobs' : `${addedCount} new job${addedCount === 1 ? '' : 's'}`}
              </span>
            )}
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword() } }}
                  placeholder="Add a keyword to filter roles (e.g. frontend, react)…"
                  className="pl-8"
                />
              </div>
              <Button variant="outline" onClick={addKeyword} disabled={!keywordInput.trim()}>
                Add keyword
              </Button>
            </div>
            {keywords.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {keywords.map((kw) => (
                  <Badge key={kw} variant="secondary" className="gap-1 pr-1">
                    {kw}
                    <button
                      onClick={() => removeKeyword(kw)}
                      className="rounded-sm hover:bg-foreground/10 p-0.5"
                      aria-label={`Remove ${kw}`}
                    >
                      <X size={11} />
                    </button>
                  </Badge>
                ))}
                <span className="text-xs text-muted-foreground ml-1">matches any</span>
              </div>
            )}
          </div>

          {pulledCompanyId === null ? (
            <div className="text-sm text-muted-foreground text-center py-10">
              Select a company above and click Pull to load its open roles.
            </div>
          ) : (
          <>
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => { setQuery(e.target.value); resetPage() }}
                placeholder="Search title, company, location…"
                className="pl-8"
              />
            </div>
            <Select value={locationFilter} onValueChange={(v) => { setLocationFilter(v); resetPage() }}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="All locations" /></SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc} value={loc}>{loc === 'all' ? 'All locations' : loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={postedWithin} onValueChange={(v) => { setPostedWithin(v); resetPage() }}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any time</SelectItem>
                <SelectItem value="1">Past 24h</SelectItem>
                <SelectItem value="7">Past week</SelectItem>
                <SelectItem value="30">Past month</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(e) => { setRemoteOnly(e.target.checked); resetPage() }}
              />
              Remote only
            </label>
          </div>

          <p className="text-xs text-muted-foreground mb-2">
            {filtered.length} of {companyJobs.length} jobs
          </p>

          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                {companyJobs.length === 0
                  ? 'No open roles found for this company.'
                  : 'No jobs match your filters.'}
              </div>
            ) : (
              paginated.map((j) => <JobRow key={j.id} job={j} onGenerate={handleGenerate} />)
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {safePage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
          </>
          )}
        </>
      )}
    </div>
  )
}

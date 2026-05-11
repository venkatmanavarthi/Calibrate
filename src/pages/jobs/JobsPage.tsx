import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Plus, RefreshCw, Trash2, ExternalLink, Wand2, Search, Telescope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useJobsStore } from '@/stores/jobs.store'
import { useGeneratorStore } from '@/stores/generator.store'
import { generateId, now } from '@/lib/utils'
import type { JobAtsSource, NormalizedJob, TrackedCompany, YCCompany, AtsProbeResult } from '@/types/models'

const SOURCE_LABEL: Record<JobAtsSource, string> = {
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  ashby: 'Ashby'
}

const SOURCE_HINTS: Record<JobAtsSource, string> = {
  greenhouse: 'e.g. "stripe" from boards.greenhouse.io/stripe',
  lever: 'e.g. "netflix" from jobs.lever.co/netflix',
  ashby: 'e.g. "ramp" from jobs.ashbyhq.com/ramp'
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function htmlToPlainText(html: string): string {
  return stripHtml(html)
}

function daysSince(iso: string): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return Math.floor((Date.now() - t) / 86400000)
}

function AddCompanyDialog({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}) {
  const addCompany = useJobsStore((s) => s.addCompany)
  const refreshCompany = useJobsStore((s) => s.refreshCompany)
  const [name, setName] = useState('')
  const [source, setSource] = useState<JobAtsSource>('greenhouse')
  const [slug, setSlug] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    setError(null)
    if (!name.trim() || !slug.trim()) return
    setBusy(true)
    const company: TrackedCompany = {
      id: generateId(),
      name: name.trim(),
      source,
      slug: slug.trim(),
      addedAt: now()
    }
    try {
      await addCompany(company)
      const result = await refreshCompany(company.id)
      if (result.errors) {
        setError(result.errors)
        setBusy(false)
        return
      }
      setName('')
      setSlug('')
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Track a company</DialogTitle>
          <DialogDescription>
            Add a company by its public job board slug. We'll fetch open roles directly from their ATS — no auth, no scraping.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 mt-2">
          <div className="grid gap-1.5">
            <Label htmlFor="company-name">Company name</Label>
            <Input
              id="company-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Stripe"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="company-source">ATS</Label>
            <Select value={source} onValueChange={(v) => setSource(v as JobAtsSource)}>
              <SelectTrigger id="company-source"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="greenhouse">Greenhouse</SelectItem>
                <SelectItem value="lever">Lever</SelectItem>
                <SelectItem value="ashby">Ashby</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="company-slug">Board slug</Label>
            <Input
              id="company-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="stripe"
            />
            <p className="text-xs text-muted-foreground">{SOURCE_HINTS[source]}</p>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button onClick={handleAdd} disabled={busy || !name.trim() || !slug.trim()}>
              {busy ? 'Adding…' : 'Add & fetch'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

type ProbeStatus = 'idle' | 'probing' | 'found' | 'not-found' | 'added'

interface YCRow {
  company: YCCompany
  selected: boolean
  status: ProbeStatus
  result: AtsProbeResult | null
}

function BrowseYCDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addCompany = useJobsStore((s) => s.addCompany)
  const refreshCompany = useJobsStore((s) => s.refreshCompany)

  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<YCRow[]>([])
  const [query, setQuery] = useState('')
  const [batchFilter, setBatchFilter] = useState('all')
  const [importing, setImporting] = useState(false)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!open || fetchedRef.current) return
    fetchedRef.current = true
    setLoading(true)
    window.api.jobsFetchYCCompanies()
      .then((companies) => {
        setRows(companies.map((c) => ({ company: c, selected: false, status: 'idle', result: null })))
      })
      .finally(() => setLoading(false))
  }, [open])

  const batches = useMemo(() => {
    const seen = new Set<string>()
    rows.forEach((r) => { if (r.company.batch) seen.add(r.company.batch) })
    return ['all', ...Array.from(seen).sort((a, b) => b.localeCompare(a))]
  }, [rows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (batchFilter !== 'all' && r.company.batch !== batchFilter) return false
      if (!q) return true
      return `${r.company.name} ${r.company.oneLiner} ${r.company.tags.join(' ')}`.toLowerCase().includes(q)
    })
  }, [rows, query, batchFilter])

  const selectedCount = rows.filter((r) => r.selected).length

  function toggle(id: number) {
    setRows((prev) => prev.map((r) => r.company.id === id ? { ...r, selected: !r.selected } : r))
  }

  async function handleImport() {
    const selected = rows.filter((r) => r.selected)
    if (!selected.length) return
    setImporting(true)

    // Probe all selected in parallel (bounded to 5 at a time)
    const CONCURRENCY = 5
    for (let i = 0; i < selected.length; i += CONCURRENCY) {
      const batch = selected.slice(i, i + CONCURRENCY)
      await Promise.all(batch.map(async (row) => {
        setRows((prev) => prev.map((r) => r.company.id === row.company.id ? { ...r, status: 'probing' } : r))
        const result = await window.api.jobsProbeCompanyAts(row.company)
        if (!result) {
          setRows((prev) => prev.map((r) => r.company.id === row.company.id ? { ...r, status: 'not-found', result: null } : r))
          return
        }
        setRows((prev) => prev.map((r) => r.company.id === row.company.id ? { ...r, status: 'found', result } : r))
        const company: TrackedCompany = {
          id: generateId(),
          name: row.company.name,
          source: result.source,
          slug: result.atsSlug,
          addedAt: now()
        }
        await addCompany(company)
        await refreshCompany(company.id)
        setRows((prev) => prev.map((r) => r.company.id === row.company.id ? { ...r, status: 'added' } : r))
      }))
    }
    setImporting(false)
  }

  const statusBadge = (status: ProbeStatus) => {
    if (status === 'probing') return <Badge variant="secondary" className="text-[10px] py-0">Probing…</Badge>
    if (status === 'found') return <Badge variant="secondary" className="text-[10px] py-0 bg-yellow-100 text-yellow-800">Found</Badge>
    if (status === 'added') return <Badge className="text-[10px] py-0 bg-green-600">Added</Badge>
    if (status === 'not-found') return <Badge variant="destructive" className="text-[10px] py-0">No ATS</Badge>
    return null
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Browse YC Companies</DialogTitle>
          <DialogDescription>
            Select companies to track. We'll auto-detect their Greenhouse, Lever, or Ashby job board.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mt-1">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search companies…" className="pl-8 h-8 text-sm" />
          </div>
          <Select value={batchFilter} onValueChange={setBatchFilter}>
            <SelectTrigger className="w-[110px] h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {batches.map((b) => <SelectItem key={b} value={b}>{b === 'all' ? 'All batches' : b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto border border-border rounded-md mt-2">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Loading YC companies…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              No companies match your search.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((row) => (
                <label
                  key={row.company.id}
                  className="flex items-start gap-3 px-3 py-2.5 hover:bg-accent/30 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={() => toggle(row.company.id)}
                    disabled={row.status === 'added' || importing}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{row.company.name}</span>
                      {row.company.batch && <Badge variant="outline" className="text-[10px] py-0">{row.company.batch}</Badge>}
                      {statusBadge(row.status)}
                      {row.result && <span className="text-[10px] text-muted-foreground">{row.result.source} · {row.result.atsSlug}</span>}
                    </div>
                    {row.company.oneLiner && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{row.company.oneLiner}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">{selectedCount} selected</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={importing}>Close</Button>
            <Button onClick={handleImport} disabled={importing || selectedCount === 0}>
              {importing ? 'Importing…' : `Add ${selectedCount || ''} selected`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
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
        <Button variant="ghost" size="sm" onClick={() => window.open(job.applyUrl, '_blank')}>
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

export default function JobsPage() {
  const navigate = useNavigate()
  const { companies, jobs, refreshing, load, refreshAll, removeCompany } = useJobsStore()
  const setJobDescription = useGeneratorStore((s) => s.setJobDescription)
  const [addOpen, setAddOpen] = useState(false)
  const [browseYCOpen, setBrowseYCOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [postedWithin, setPostedWithin] = useState<string>('any')
  const [locationFilter, setLocationFilter] = useState('all')

  useEffect(() => { load() }, [load])

  const locations = useMemo(() => {
    const seen = new Set<string>()
    jobs.forEach((j) => { if (j.location) seen.add(j.location) })
    return ['all', ...Array.from(seen).sort()]
  }, [jobs])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const maxDays = postedWithin === 'any' ? null : parseInt(postedWithin, 10)
    return jobs
      .filter((j) => {
        if (remoteOnly && !j.remote) return false
        if (locationFilter !== 'all' && j.location !== locationFilter) return false
        if (maxDays !== null) {
          const age = daysSince(j.postedAt || j.firstSeenAt)
          if (age === null || age > maxDays) return false
        }
        if (!q) return true
        const hay = `${j.title} ${j.company} ${j.location} ${j.department ?? ''}`.toLowerCase()
        return hay.includes(q)
      })
      .sort((a, b) => (b.postedAt || b.firstSeenAt).localeCompare(a.postedAt || a.firstSeenAt))
  }, [jobs, query, remoteOnly, postedWithin, locationFilter])

  const handleGenerate = (job: NormalizedJob) => {
    const header = `${job.title} @ ${job.company}\n${job.location}${job.remote ? ' (Remote)' : ''}\n${job.applyUrl}\n\n`
    setJobDescription(header + htmlToPlainText(job.descriptionHtml))
    navigate('/generate')
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Briefcase size={20} /> Jobs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track companies and generate tailored resumes for their open roles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={refreshAll}
            disabled={refreshing || companies.length === 0}
          >
            <RefreshCw size={14} className={`mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh all
          </Button>
          <Button variant="outline" onClick={() => setBrowseYCOpen(true)}>
            <Telescope size={14} className="mr-1.5" />
            Browse YC
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={14} className="mr-1.5" />
            Add company
          </Button>
        </div>
      </div>

      {companies.length === 0 ? (
        <div className="border border-dashed border-border rounded-md p-10 text-center">
          <Briefcase size={28} className="mx-auto text-muted-foreground/60" />
          <p className="text-sm mt-3 font-medium">No companies tracked yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Add a company by its Greenhouse, Lever, or Ashby slug to start pulling open roles.
          </p>
          <Button className="mt-4" onClick={() => setAddOpen(true)}>
            <Plus size={14} className="mr-1.5" />
            Add your first company
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-[240px_1fr] gap-6">
          <aside>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Tracked ({companies.length})
            </p>
            <div className="space-y-1">
              {companies.map((c) => {
                const count = jobs.filter((j) => j.companyId === c.id).length
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-1 px-2 py-1.5 rounded-md hover:bg-accent/40 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm truncate font-medium">{c.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {SOURCE_LABEL[c.source]} · {count} open
                      </div>
                    </div>
                    <button
                      onClick={() => removeCompany(c.id)}
                      title="Remove"
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          </aside>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search title, company, location…"
                  className="pl-8"
                />
              </div>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="All locations" /></SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc === 'all' ? 'All locations' : loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={postedWithin} onValueChange={setPostedWithin}>
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
                  onChange={(e) => setRemoteOnly(e.target.checked)}
                />
                Remote only
              </label>
            </div>

            <p className="text-xs text-muted-foreground mb-2">
              {filtered.length} of {jobs.length} jobs
            </p>

            <div className="space-y-2">
              {filtered.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  {jobs.length === 0
                    ? 'No jobs cached yet — click "Refresh all" to pull from tracked companies.'
                    : 'No jobs match your filters.'}
                </div>
              ) : (
                filtered.map((j) => <JobRow key={j.id} job={j} onGenerate={handleGenerate} />)
              )}
            </div>
          </section>
        </div>
      )}

      <AddCompanyDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <BrowseYCDialog open={browseYCOpen} onClose={() => setBrowseYCOpen(false)} />
    </div>
  )
}

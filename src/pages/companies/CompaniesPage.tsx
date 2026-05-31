import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, RefreshCw, Trash2, Search, Telescope, Building2 } from 'lucide-react'
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
import { generateId, now } from '@/lib/utils'
import type { JobAtsSource, TrackedCompany, YCCompany, AtsProbeResult } from '@/types/models'

const SOURCE_LABEL: Record<JobAtsSource, string> = {
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  ashby: 'Ashby',
  website: 'Website'
}

const SOURCE_HINTS: Record<JobAtsSource, string> = {
  greenhouse: 'e.g. "stripe" from boards.greenhouse.io/stripe',
  lever: 'e.g. "netflix" from jobs.lever.co/netflix',
  ashby: 'e.g. "ramp" from jobs.ashbyhq.com/ramp',
  website: 'e.g. "https://stripe.com" or "stripe.com/careers"'
}

function AddCompanyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
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
            Add a company by ATS slug or website URL. Website sources use the Chrome extension to find open roles.
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
            <Label htmlFor="company-source">Source</Label>
            <Select value={source} onValueChange={(v) => setSource(v as JobAtsSource)}>
              <SelectTrigger id="company-source"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="greenhouse">Greenhouse</SelectItem>
                <SelectItem value="lever">Lever</SelectItem>
                <SelectItem value="ashby">Ashby</SelectItem>
                <SelectItem value="website">Website via Chrome</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="company-slug">{source === 'website' ? 'Website URL' : 'Board slug'}</Label>
            <Input
              id="company-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={source === 'website' ? 'https://company.com/careers' : 'stripe'}
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
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [rows, setRows] = useState<YCRow[]>([])
  const [query, setQuery] = useState('')
  const [batchFilter, setBatchFilter] = useState('all')
  const [importing, setImporting] = useState(false)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!open || fetchedRef.current) return
    fetchedRef.current = true
    setLoading(true)
    setFetchError(null)
    window.api.jobsFetchYCCompanies()
      .then((companies) => {
        setRows(companies.map((c) => ({ company: c, selected: false, status: 'idle', result: null })))
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        setFetchError(msg.includes('429') ? 'YC API rate limit reached. Please try again in a few minutes.' : `Failed to load companies: ${msg}`)
        fetchedRef.current = false
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
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-sm"
            disabled={filtered.length === 0 || importing}
            onClick={() => {
              const filteredIds = new Set(filtered.map((r) => r.company.id))
              const allSelected = filtered.every((r) => r.selected)
              setRows((prev) => prev.map((r) =>
                filteredIds.has(r.company.id) ? { ...r, selected: !allSelected } : r
              ))
            }}
          >
            {filtered.length > 0 && filtered.every((r) => r.selected) ? 'Deselect All' : 'Select All'}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto border border-border rounded-md mt-2">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Loading YC companies…
            </div>
          ) : fetchError ? (
            <div className="flex items-center justify-center py-12 text-sm text-red-500 text-center px-4">
              {fetchError}
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

const COMPANIES_PAGE_SIZE = 20

export default function CompaniesPage() {
  const { companies, jobs, refreshing, load, refreshAll, removeCompany } = useJobsStore()
  const [addOpen, setAddOpen] = useState(false)
  const [browseYCOpen, setBrowseYCOpen] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => { load() }, [load])

  const totalPages = Math.max(1, Math.ceil(companies.length / COMPANIES_PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginatedCompanies = companies.slice((safePage - 1) * COMPANIES_PAGE_SIZE, safePage * COMPANIES_PAGE_SIZE)

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold">Companies</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Track companies and pull open roles from ATS job boards or a website searched in Chrome.
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
          <Building2 size={28} className="mx-auto text-muted-foreground/60" />
          <p className="text-sm mt-3 font-medium">No companies tracked yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Add a company by its Greenhouse, Lever, Ashby slug, or a website URL to start pulling open roles.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button variant="outline" onClick={() => setBrowseYCOpen(true)}>
              <Telescope size={14} className="mr-1.5" />
              Browse YC
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus size={14} className="mr-1.5" />
              Add your first company
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {paginatedCompanies.map((c) => {
              const count = jobs.filter((j) => j.companyId === c.id).length
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-4 border border-border rounded-md px-4 py-3 hover:bg-accent/20 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{c.name}</span>
                      <Badge variant="outline" className="text-[10px] py-0">{SOURCE_LABEL[c.source]}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {c.slug} · {count} open role{count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => removeCompany(c.id)}
                    title="Remove"
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 p-1 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
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
                Page {safePage} of {totalPages} · {companies.length} companies
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

      <AddCompanyDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <BrowseYCDialog open={browseYCOpen} onClose={() => setBrowseYCOpen(false)} />
    </div>
  )
}

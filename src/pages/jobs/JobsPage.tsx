import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Wand2, Search, Building2 } from 'lucide-react'
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
import { useGeneratorStore } from '@/stores/generator.store'
import type { JobAtsSource, NormalizedJob } from '@/types/models'

const SOURCE_LABEL: Record<JobAtsSource, string> = {
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  ashby: 'Ashby'
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
  const { companies, jobs, load } = useJobsStore()
  const setJobDescription = useGeneratorStore((s) => s.setJobDescription)
  const [query, setQuery] = useState('')
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [postedWithin, setPostedWithin] = useState<string>('any')
  const [locationFilter, setLocationFilter] = useState('all')
  const [page, setPage] = useState(1)

  const resetPage = useCallback(() => setPage(1), [])

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const handleGenerate = (job: NormalizedJob) => {
    const header = `${job.title} @ ${job.company}\n${job.location}${job.remote ? ' (Remote)' : ''}\n${job.applyUrl}\n\n`
    setJobDescription(header + stripHtml(job.descriptionHtml))
    navigate('/generate')
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold">Jobs</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Browse open roles from your tracked companies.
          </p>
        </div>
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
            {filtered.length} of {jobs.length} jobs
          </p>

          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                {jobs.length === 0
                  ? 'No jobs cached yet — go to Companies and click "Refresh all".'
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
    </div>
  )
}

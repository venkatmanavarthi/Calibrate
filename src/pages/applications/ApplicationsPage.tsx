import { useEffect, useState } from 'react'
import { Send, Trash2, Image, RotateCcw, ExternalLink, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useApplicationsStore } from '@/stores/applications.store'
import type { ApplicationRecord } from '@/types/models'

type StatusFilter = 'all' | 'submitted' | 'failed' | 'skipped'

function statusBadge(status: ApplicationRecord['status']) {
  if (status === 'submitted') {
    return <Badge className="bg-green-600 hover:bg-green-600 text-white gap-1"><CheckCircle2 size={11} />Submitted</Badge>
  }
  if (status === 'failed') {
    return <Badge variant="destructive" className="gap-1"><XCircle size={11} />Failed</Badge>
  }
  return <Badge variant="outline" className="gap-1 text-muted-foreground"><Clock size={11} />Skipped</Badge>
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function sourceLabel(source: ApplicationRecord['jobSource']): string {
  return source.charAt(0).toUpperCase() + source.slice(1)
}

export default function ApplicationsPage() {
  const { records, submittingIds, load, submit, remove } = useApplicationsStore()
  const { applyRuns, loadApplyRuns } = useApplicationsStore()
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([load(), loadApplyRuns()]).finally(() => setLoading(false))
  }, [load, loadApplyRuns])

  useEffect(() => {
    const unlisten = window.api.onChromeApplyProgress(() => {
      loadApplyRuns()
      load()
    })
    return unlisten
  }, [loadApplyRuns, load])

  const filtered = filter === 'all' ? records : records.filter((r) => r.status === filter)

  const counts = {
    all: records.length,
    submitted: records.filter((r) => r.status === 'submitted').length,
    failed: records.filter((r) => r.status === 'failed').length,
    skipped: records.filter((r) => r.status === 'skipped').length
  }

  return (
    <div className="p-8 max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Applications</h2>
        <p className="text-muted-foreground text-sm mt-1">
          History of all auto-submitted job applications.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b">
        {(['all', 'submitted', 'failed', 'skipped'] as StatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              'px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              filter === f
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            ].join(' ')}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="ml-1.5 text-xs text-muted-foreground">({counts[f]})</span>
          </button>
        ))}
      </div>

      {applyRuns.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-muted/40 border-b">
            <p className="text-sm font-medium">Recent Chrome apply runs</p>
          </div>
          <div className="divide-y">
            {applyRuns.slice(0, 5).map((run) => (
              <div key={run.id} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{run.currentStep}</p>
                  <p className="text-xs text-muted-foreground truncate">{run.sourceUrl}</p>
                  {run.error && <p className="text-xs text-destructive truncate">{run.error}</p>}
                </div>
                <Badge variant={run.status === 'submitted' ? 'default' : run.status === 'failed' || run.status === 'blocked' ? 'destructive' : 'secondary'}>
                  {run.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-muted-foreground text-sm py-12 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Job</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Company</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Platform</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Applied</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-medium text-muted-foreground w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((record) => (
                <ApplicationRow
                  key={record.id}
                  record={record}
                  isSubmitting={submittingIds.has(record.scoredJobId)}
                  onRetry={() => submit(record.scoredJobId)}
                  onDelete={() => remove(record.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ApplicationRow({
  record,
  isSubmitting,
  onRetry,
  onDelete
}: {
  record: ApplicationRecord
  isSubmitting: boolean
  onRetry: () => void
  onDelete: () => void
}) {
  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3 font-medium max-w-[220px] truncate">{record.jobTitle}</td>
      <td className="px-4 py-3 text-muted-foreground">{record.jobCompany}</td>
      <td className="px-4 py-3">
        <Badge variant="outline" className="text-xs font-normal">{sourceLabel(record.jobSource)}</Badge>
      </td>
      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{formatDate(record.appliedAt)}</td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          {statusBadge(record.status)}
          {record.failureReason && (
            <span className="text-xs text-muted-foreground">{record.failureReason}</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {record.confirmationScreenshotPath && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              title="View confirmation screenshot"
              onClick={() => window.api.shellOpenExternal(`file://${record.confirmationScreenshotPath}`)}
            >
              <Image size={13} />
            </Button>
          )}
          {record.status === 'failed' && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              title="Retry submission"
              disabled={isSubmitting}
              onClick={onRetry}
            >
              {isSubmitting ? (
                <Send size={13} className="animate-pulse" />
              ) : (
                <RotateCcw size={13} />
              )}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            title="Delete record"
            onClick={onDelete}
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </td>
    </tr>
  )
}

function EmptyState({ filter }: { filter: StatusFilter }) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <Send size={32} className="mx-auto mb-3 opacity-20" />
      <p className="text-sm font-medium">
        {filter === 'all'
          ? 'No applications yet'
          : `No ${filter} applications`}
      </p>
      <p className="text-xs mt-1">
        {filter === 'all'
          ? 'Enable auto-apply on a pipeline to start submitting applications automatically.'
          : 'Applications with this status will appear here.'}
      </p>
    </div>
  )
}

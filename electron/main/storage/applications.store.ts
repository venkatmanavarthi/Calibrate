import { getDb } from './db'
import type { ApplicationRecord } from '../../../src/types/models'

type ApplicationRow = {
  id: string
  scoredJobId: string
  jobId: string
  jobTitle: string
  jobCompany: string
  jobSource: string
  appliedAt: string
  status: string
  failureReason: string | null
  confirmationScreenshotPath: string | null
  customAnswers: string
  sourceUrl: string | null
  finalUrl: string | null
  submissionMode: string | null
  accountEmail: string | null
  accountAction: string | null
  verificationReason: string | null
  filledFields: string
  skippedFields: string
}

function rowToRecord(row: ApplicationRow): ApplicationRecord {
  return {
    ...row,
    jobSource: row.jobSource as ApplicationRecord['jobSource'],
    status: row.status as ApplicationRecord['status'],
    failureReason: row.failureReason ?? undefined,
    confirmationScreenshotPath: row.confirmationScreenshotPath ?? undefined,
    customAnswers: JSON.parse(row.customAnswers) as Record<string, string>,
    sourceUrl: row.sourceUrl ?? undefined,
    finalUrl: row.finalUrl ?? undefined,
    submissionMode: row.submissionMode as ApplicationRecord['submissionMode'] | undefined,
    accountEmail: row.accountEmail ?? undefined,
    accountAction: row.accountAction as ApplicationRecord['accountAction'] | undefined,
    verificationReason: row.verificationReason ?? undefined,
    filledFields: JSON.parse(row.filledFields ?? '[]') as string[],
    skippedFields: JSON.parse(row.skippedFields ?? '[]') as string[]
  }
}

export function listApplications(): ApplicationRecord[] {
  const rows = getDb()
    .prepare('SELECT * FROM application_records ORDER BY appliedAt DESC')
    .all() as ApplicationRow[]
  return rows.map(rowToRecord)
}

export function saveApplication(record: ApplicationRecord): void {
  getDb()
    .prepare(`
      INSERT INTO application_records
        (id, scoredJobId, jobId, jobTitle, jobCompany, jobSource, appliedAt,
         status, failureReason, confirmationScreenshotPath, customAnswers,
         sourceUrl, finalUrl, submissionMode, accountEmail, accountAction,
         verificationReason, filledFields, skippedFields)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status                     = excluded.status,
        failureReason              = excluded.failureReason,
        confirmationScreenshotPath = excluded.confirmationScreenshotPath,
        customAnswers              = excluded.customAnswers,
        sourceUrl                  = excluded.sourceUrl,
        finalUrl                   = excluded.finalUrl,
        submissionMode             = excluded.submissionMode,
        accountEmail               = excluded.accountEmail,
        accountAction              = excluded.accountAction,
        verificationReason         = excluded.verificationReason,
        filledFields               = excluded.filledFields,
        skippedFields              = excluded.skippedFields
    `)
    .run(
      record.id, record.scoredJobId, record.jobId,
      record.jobTitle, record.jobCompany, record.jobSource,
      record.appliedAt, record.status,
      record.failureReason ?? null,
      record.confirmationScreenshotPath ?? null,
      JSON.stringify(record.customAnswers),
      record.sourceUrl ?? null,
      record.finalUrl ?? null,
      record.submissionMode ?? null,
      record.accountEmail ?? null,
      record.accountAction ?? null,
      record.verificationReason ?? null,
      JSON.stringify(record.filledFields ?? []),
      JSON.stringify(record.skippedFields ?? [])
    )
}

export function deleteApplication(id: string): void {
  getDb().prepare('DELETE FROM application_records WHERE id = ?').run(id)
}

export function hasApplied(scoredJobId: string): boolean {
  const row = getDb()
    .prepare("SELECT 1 FROM application_records WHERE scoredJobId = ? AND status = 'submitted' LIMIT 1")
    .get(scoredJobId)
  return row !== undefined
}

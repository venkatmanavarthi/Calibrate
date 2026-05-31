import { getDb } from './db'
import type { ApplyRun, ApplyStep } from '../../../src/types/models'

type ApplyRunRow = {
  id: string
  scoredJobId: string | null
  jobId: string | null
  sourceUrl: string
  finalUrl: string | null
  status: string
  mode: string
  currentStep: string
  accountEmail: string | null
  accountAction: string | null
  error: string | null
  startedAt: string
  completedAt: string | null
}

type ApplyStepRow = {
  id: string
  runId: string
  at: string
  action: string
  status: string
  message: string
  screenshotPath: string | null
}

function runFromRow(row: ApplyRunRow): ApplyRun {
  return {
    id: row.id,
    scoredJobId: row.scoredJobId ?? undefined,
    jobId: row.jobId ?? undefined,
    sourceUrl: row.sourceUrl,
    finalUrl: row.finalUrl ?? undefined,
    status: row.status as ApplyRun['status'],
    mode: 'auto',
    currentStep: row.currentStep,
    accountEmail: row.accountEmail ?? undefined,
    accountAction: row.accountAction as ApplyRun['accountAction'] | undefined,
    error: row.error ?? undefined,
    startedAt: row.startedAt,
    completedAt: row.completedAt ?? undefined
  }
}

function stepFromRow(row: ApplyStepRow): ApplyStep {
  return {
    id: row.id,
    runId: row.runId,
    at: row.at,
    action: row.action,
    status: row.status as ApplyStep['status'],
    message: row.message,
    screenshotPath: row.screenshotPath ?? undefined
  }
}

export function listApplyRuns(): ApplyRun[] {
  const rows = getDb()
    .prepare('SELECT * FROM apply_runs ORDER BY startedAt DESC')
    .all() as ApplyRunRow[]
  return rows.map(runFromRow)
}

export function saveApplyRun(run: ApplyRun): void {
  getDb()
    .prepare(`
      INSERT INTO apply_runs
        (id, scoredJobId, jobId, sourceUrl, finalUrl, status, mode, currentStep,
         accountEmail, accountAction, error, startedAt, completedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        finalUrl       = excluded.finalUrl,
        status         = excluded.status,
        currentStep    = excluded.currentStep,
        accountEmail   = excluded.accountEmail,
        accountAction  = excluded.accountAction,
        error          = excluded.error,
        completedAt    = excluded.completedAt
    `)
    .run(
      run.id,
      run.scoredJobId ?? null,
      run.jobId ?? null,
      run.sourceUrl,
      run.finalUrl ?? null,
      run.status,
      run.mode,
      run.currentStep,
      run.accountEmail ?? null,
      run.accountAction ?? null,
      run.error ?? null,
      run.startedAt,
      run.completedAt ?? null
    )
}

export function saveApplyStep(step: ApplyStep): void {
  getDb()
    .prepare(`
      INSERT OR REPLACE INTO apply_steps
        (id, runId, at, action, status, message, screenshotPath)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      step.id,
      step.runId,
      step.at,
      step.action,
      step.status,
      step.message,
      step.screenshotPath ?? null
    )
}

export function listApplySteps(runId: string): ApplyStep[] {
  const rows = getDb()
    .prepare('SELECT * FROM apply_steps WHERE runId = ? ORDER BY at ASC')
    .all(runId) as ApplyStepRow[]
  return rows.map(stepFromRow)
}

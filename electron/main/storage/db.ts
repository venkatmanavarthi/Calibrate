import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import type { TrackedCompany, NormalizedJob, Pipeline, PipelineRun, ScoredJob } from '../../../src/types/models'

function paths() {
  const root = app.getPath('userData')
  const jobsDir = path.join(root, 'jobs')
  const pipelineDir = path.join(root, 'pipeline')
  return {
    db: path.join(root, 'calibrate.db'),
    migrationMarker: path.join(jobsDir, '.migrated-to-sqlite'),
    companiesFile: path.join(jobsDir, 'companies.json'),
    jobsCacheFile: path.join(jobsDir, 'jobs.json'),
    pipelinesFile: path.join(pipelineDir, 'pipelines.json'),
    pipelineRunsFile: path.join(pipelineDir, 'runs.json'),
    pipelineScoredJobsFile: path.join(pipelineDir, 'scored-jobs.json')
  }
}

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!_db) throw new Error('Database not initialized — call initDb() first')
  return _db
}

export function initDb(): void {
  _db = new Database(paths().db)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  createTables(_db)
}

function createTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id        TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      source    TEXT NOT NULL,
      slug      TEXT NOT NULL,
      addedAt   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id              TEXT PRIMARY KEY,
      source          TEXT NOT NULL,
      externalId      TEXT NOT NULL,
      company         TEXT NOT NULL,
      companyId       TEXT NOT NULL,
      title           TEXT NOT NULL,
      location        TEXT NOT NULL,
      remote          INTEGER NOT NULL DEFAULT 0,
      department      TEXT,
      employmentType  TEXT,
      descriptionHtml TEXT NOT NULL,
      applyUrl        TEXT NOT NULL,
      postedAt        TEXT NOT NULL,
      updatedAt       TEXT NOT NULL,
      firstSeenAt     TEXT NOT NULL,
      lastSeenAt      TEXT NOT NULL,
      UNIQUE(source, externalId)
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_companyId ON jobs(companyId);

    CREATE TABLE IF NOT EXISTS pipelines (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      profileId       TEXT NOT NULL,
      templateId      TEXT NOT NULL,
      provider        TEXT NOT NULL,
      model           TEXT NOT NULL,
      companyIds      TEXT NOT NULL,
      scheduleMinutes INTEGER NOT NULL,
      minScore        REAL,
      enabled         INTEGER NOT NULL DEFAULT 1,
      createdAt       TEXT NOT NULL,
      updatedAt       TEXT NOT NULL,
      lastRunAt       TEXT
    );

    CREATE TABLE IF NOT EXISTS pipeline_runs (
      id          TEXT PRIMARY KEY,
      pipelineId  TEXT NOT NULL,
      startedAt   TEXT NOT NULL,
      completedAt TEXT,
      status      TEXT NOT NULL,
      jobsScanned INTEGER NOT NULL DEFAULT 0,
      jobsScored  INTEGER NOT NULL DEFAULT 0,
      error       TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_runs_pipelineId ON pipeline_runs(pipelineId);

    CREATE TABLE IF NOT EXISTS scored_jobs (
      id                 TEXT PRIMARY KEY,
      pipelineId         TEXT NOT NULL,
      runId              TEXT NOT NULL,
      jobId              TEXT NOT NULL,
      jobTitle           TEXT NOT NULL,
      jobCompany         TEXT NOT NULL,
      jobLocation        TEXT NOT NULL,
      jobRemote          INTEGER NOT NULL DEFAULT 0,
      jobApplyUrl        TEXT NOT NULL,
      jobSource          TEXT NOT NULL,
      jobDescriptionHtml TEXT NOT NULL,
      score              REAL NOT NULL,
      scoreReason        TEXT NOT NULL,
      scoredAt           TEXT NOT NULL,
      resumeMarkdown     TEXT,
      resumeGeneratedAt  TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_scored_jobs_pipelineId ON scored_jobs(pipelineId);
    CREATE INDEX IF NOT EXISTS idx_scored_jobs_jobId      ON scored_jobs(jobId);
  `)
}

async function readJsonSafe<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf-8')) as T
  } catch {
    return fallback
  }
}

export async function migrateFromJson(): Promise<void> {
  const p = paths()

  try {
    await fs.access(p.migrationMarker)
    return
  } catch {
    // not yet migrated
  }

  const db = getDb()

  const [companies, jobs, pipelines, runs, scoredJobs] = await Promise.all([
    readJsonSafe<TrackedCompany[]>(p.companiesFile, []),
    readJsonSafe<NormalizedJob[]>(p.jobsCacheFile, []),
    readJsonSafe<Pipeline[]>(p.pipelinesFile, []),
    readJsonSafe<PipelineRun[]>(p.pipelineRunsFile, []),
    readJsonSafe<ScoredJob[]>(p.pipelineScoredJobsFile, [])
  ])

  const stmts = {
    company: db.prepare(
      'INSERT OR IGNORE INTO companies (id, name, source, slug, addedAt) VALUES (?, ?, ?, ?, ?)'
    ),
    job: db.prepare(`
      INSERT OR IGNORE INTO jobs
        (id, source, externalId, company, companyId, title, location, remote,
         department, employmentType, descriptionHtml, applyUrl, postedAt, updatedAt, firstSeenAt, lastSeenAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    pipeline: db.prepare(`
      INSERT OR IGNORE INTO pipelines
        (id, name, profileId, templateId, provider, model, companyIds, scheduleMinutes,
         minScore, enabled, createdAt, updatedAt, lastRunAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    run: db.prepare(`
      INSERT OR IGNORE INTO pipeline_runs
        (id, pipelineId, startedAt, completedAt, status, jobsScanned, jobsScored, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `),
    scoredJob: db.prepare(`
      INSERT OR IGNORE INTO scored_jobs
        (id, pipelineId, runId, jobId, jobTitle, jobCompany, jobLocation, jobRemote,
         jobApplyUrl, jobSource, jobDescriptionHtml, score, scoreReason, scoredAt, resumeMarkdown, resumeGeneratedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
  }

  db.transaction(() => {
    for (const c of companies) {
      stmts.company.run(c.id, c.name, c.source, c.slug, c.addedAt)
    }
    for (const j of jobs) {
      stmts.job.run(
        j.id, j.source, j.externalId, j.company, j.companyId,
        j.title, j.location, j.remote ? 1 : 0,
        j.department ?? null, j.employmentType ?? null,
        j.descriptionHtml, j.applyUrl, j.postedAt, j.updatedAt, j.firstSeenAt, j.lastSeenAt
      )
    }
    for (const p of pipelines) {
      stmts.pipeline.run(
        p.id, p.name, p.profileId, p.templateId, p.provider, p.model,
        JSON.stringify(p.companyIds), p.scheduleMinutes, p.minScore ?? null,
        p.enabled ? 1 : 0, p.createdAt, p.updatedAt, p.lastRunAt ?? null
      )
    }
    for (const r of runs) {
      stmts.run.run(
        r.id, r.pipelineId, r.startedAt, r.completedAt ?? null,
        r.status, r.jobsScanned, r.jobsScored, r.error ?? null
      )
    }
    for (const j of scoredJobs) {
      stmts.scoredJob.run(
        j.id, j.pipelineId, j.runId, j.jobId,
        j.jobTitle, j.jobCompany, j.jobLocation, j.jobRemote ? 1 : 0,
        j.jobApplyUrl, j.jobSource, j.jobDescriptionHtml,
        j.score, j.scoreReason, j.scoredAt,
        j.resumeMarkdown ?? null, j.resumeGeneratedAt ?? null
      )
    }
  })()

  await fs.writeFile(p.migrationMarker, new Date().toISOString(), 'utf-8')

  for (const file of [p.companiesFile, p.jobsCacheFile, p.pipelinesFile, p.pipelineRunsFile, p.pipelineScoredJobsFile]) {
    try {
      await fs.rename(file, file + '.bak')
    } catch {
      // file may not exist on fresh installs
    }
  }
}

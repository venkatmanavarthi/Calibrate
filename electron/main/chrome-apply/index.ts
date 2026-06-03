import type { BrowserWindow } from 'electron'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'
import { randomUUID } from 'crypto'
import { ChromeApplyDriver, type ChromeField, type ChromeSnapshot } from './driver'
import { getChromeApplyConnection, startChromeApplyBridge } from './bridge'
import { listScoredJobs, listPipelines } from '../storage/pipeline.store'
import { getProfile, listProfiles } from '../storage/profiles.store'
import { loadSettings } from '../storage/settings.store'
import { loadApplicationDefaults } from '../storage/application-defaults.store'
import { saveApplication } from '../storage/applications.store'
import { saveApplyRun, listApplyRuns, saveApplyStep } from '../storage/apply-runs.store'
import { getSiteCredential, markSiteCredentialLogin, saveSiteCredential } from '../storage/site-credentials.store'
import { getGmailStatus, findRecentVerificationCode } from '../gmail/index'
import { exportToPdf } from '../pdf/exporter'
import { SCREENSHOTS_DIR } from '../storage/index'
import type {
  ApplicationRecord,
  ApplyRun,
  ApplyStep,
  ChromeApplyConnection,
  ChromeApplyStartRequest,
  ExperienceProfile,
  ScoredJob
} from '../../../src/types/models'

function nowIso(): string {
  return new Date().toISOString()
}

function generatePassword(): string {
  return `${randomUUID().replace(/-/g, '').slice(0, 18)}Aa1!`
}

function includesAny(text: string, words: string[]): boolean {
  const s = text.toLowerCase()
  return words.some((w) => s.includes(w))
}

function fieldText(field: ChromeField): string {
  return `${field.label} ${field.selector} ${field.type}`.toLowerCase()
}

function matchValue(field: ChromeField, profile: ExperienceProfile, accountEmail: string): string | null {
  const text = fieldText(field)
  const nameParts = profile.personalInfo.fullName.trim().split(/\s+/)
  if (includesAny(text, ['first name', 'firstname', 'given name', 'given-name'])) return nameParts[0] ?? profile.personalInfo.fullName
  if (includesAny(text, ['last name', 'lastname', 'family name', 'surname'])) return nameParts.slice(1).join(' ') || nameParts[0] || ''
  if (includesAny(text, ['full name', 'your name', 'candidate name']) || text === 'name') return profile.personalInfo.fullName
  if (includesAny(text, ['email', 'e-mail'])) return accountEmail
  if (includesAny(text, ['phone', 'mobile', 'telephone'])) return profile.personalInfo.phone ?? null
  if (includesAny(text, ['linkedin'])) return profile.personalInfo.linkedinUrl ?? null
  if (includesAny(text, ['github'])) return profile.personalInfo.githubUrl ?? null
  if (includesAny(text, ['website', 'portfolio', 'personal site'])) return profile.personalInfo.websiteUrl ?? null
  if (includesAny(text, ['location', 'city', 'address'])) return profile.personalInfo.location ?? null
  return null
}

function findSubmit(fields: ChromeField[]): ChromeField | undefined {
  return fields.find((f) => f.type === 'submit' && includesAny(f.label, ['submit application', 'submit', 'apply']))
    ?? fields.find((f) => f.type === 'submit')
}

function isLikelyAccountPage(snapshot: ChromeSnapshot): boolean {
  const hasPassword = snapshot.fields.some((f) => f.type === 'password' || fieldText(f).includes('password'))
  if (!hasPassword) return false
  return includesAny(snapshot.text, ['sign in', 'log in', 'login', 'create account', 'sign up', 'register'])
}

async function buildPdf(scoredJob: ScoredJob): Promise<string | null> {
  if (!scoredJob.resumeDocument) return null
  const settings = await loadSettings()
  const destPath = path.join(os.tmpdir(), `calibrate-resume-${scoredJob.id}.pdf`)
  await exportToPdf({
    resumeDocument: scoredJob.resumeDocument,
    destFilePath: destPath,
    templateId: settings.pdfTemplateId,
  })
  return destPath
}

function emitProgress(win: BrowserWindow | null | undefined, run: ApplyRun, message?: string): void {
  win?.webContents.send('chromeApply:progress', {
    runId: run.id,
    status: run.status,
    currentStep: run.currentStep,
    message
  })
}

function makeStep(run: ApplyRun, action: string, status: ApplyStep['status'], message: string, screenshotPath?: string): ApplyStep {
  return {
    id: randomUUID(),
    runId: run.id,
    at: nowIso(),
    action,
    status,
    message,
    screenshotPath
  }
}

async function updateRun(win: BrowserWindow | null | undefined, run: ApplyRun, patch: Partial<ApplyRun>, message?: string): Promise<ApplyRun> {
  const updated = { ...run, ...patch }
  saveApplyRun(updated)
  emitProgress(win, updated, message)
  return updated
}

async function handleAccountPage(driver: ChromeApplyDriver, run: ApplyRun, profile: ExperienceProfile): Promise<{
  accountEmail: string
  accountAction: ApplicationRecord['accountAction']
}> {
  const snapshot = await driver.snapshot()
  if (!isLikelyAccountPage(snapshot)) {
    return { accountEmail: profile.personalInfo.email, accountAction: 'none' }
  }

  const gmail = await getGmailStatus()
  if (gmail.status !== 'connected' || !gmail.email) {
    throw new Error('gmail_not_connected: connect Gmail before automatic account creation or login')
  }

  const saved = await getSiteCredential(snapshot.url)
  const emailField = snapshot.fields.find((f) => includesAny(fieldText(f), ['email', 'e-mail']))
  const passwordFields = snapshot.fields.filter((f) => f.type === 'password' || fieldText(f).includes('password'))
  if (!emailField || passwordFields.length === 0) {
    return { accountEmail: gmail.email, accountAction: 'blocked' }
  }

  if (saved) {
    await driver.fill(emailField.selector, saved.email)
    await driver.fill(passwordFields[0].selector, saved.password)
    const submit = findSubmit(snapshot.fields)
    if (submit) await driver.click(submit.selector)
    await markSiteCredentialLogin(snapshot.url)
    return { accountEmail: saved.email, accountAction: 'login_existing' }
  }

  const password = generatePassword()
  await saveSiteCredential(snapshot.url, gmail.email, password)
  await driver.fill(emailField.selector, gmail.email)
  for (const field of passwordFields.slice(0, 2)) {
    await driver.fill(field.selector, password)
  }
  const submit = findSubmit(snapshot.fields)
  if (submit) await driver.click(submit.selector)

  const domain = new URL(snapshot.url).hostname
  const verification = await findRecentVerificationCode(domain, 5 * 60_000)
  if (verification?.code) {
    const next = await driver.snapshot()
    const codeField = next.fields.find((f) => includesAny(fieldText(f), ['code', 'verification', 'otp']))
    if (codeField) await driver.fill(codeField.selector, verification.code)
  } else if (verification?.link) {
    await driver.open(verification.link)
  }

  return { accountEmail: gmail.email, accountAction: 'created' }
}

async function fillApplication(
  driver: ChromeApplyDriver,
  profile: ExperienceProfile,
  accountEmail: string,
  pdfPath: string | null
): Promise<{ filled: string[]; skipped: string[]; missing: string[] }> {
  const defaults = await loadApplicationDefaults()
  let snapshot = await driver.snapshot()
  const filled: string[] = []
  const skipped: string[] = []

  const fileField = snapshot.fields.find((f) => f.type === 'file')
  if (fileField && pdfPath) {
    await driver.uploadFile(fileField.selector, pdfPath)
    filled.push(`${fileField.label || 'Resume'} -> resume PDF`)
  }

  for (const field of snapshot.fields) {
    if (field.filled || field.type === 'submit' || field.type === 'file' || field.type === 'password') continue
    const custom = Object.entries(defaults.customQuestionDefaults ?? {}).find(([key]) =>
      field.label.toLowerCase().includes(key.toLowerCase())
    )
    const value = custom?.[1] ?? matchValue(field, profile, accountEmail)
    if (!value) {
      if (field.required) skipped.push(field.label || field.selector)
      continue
    }
    if (field.type === 'select') await driver.select(field.selector, value)
    else await driver.fill(field.selector, value)
    filled.push(`${field.label || field.selector} -> ${value.slice(0, 80)}`)
  }

  snapshot = await driver.snapshot()
  const missing = snapshot.fields
    .filter((f) => f.required && !f.filled && f.type !== 'submit')
    .map((f) => `${f.label || f.selector} (${f.selector})`)
  return { filled, skipped, missing }
}

function verifySubmitted(before: ChromeSnapshot, after: ChromeSnapshot): { ok: boolean; reason: string } {
  const text = after.text.toLowerCase()
  const successWords = ['thank you', 'application received', 'successfully submitted', 'application submitted', 'thanks for applying', 'submission received']
  const matched = successWords.find((w) => text.includes(w))
  if (matched) return { ok: true, reason: `success_text:${matched}` }
  if (after.url !== before.url && includesAny(after.url, ['thank', 'confirm', 'success', 'submitted'])) {
    return { ok: true, reason: 'url_confirmation' }
  }
  const beforeInputs = before.fields.filter((f) => f.type !== 'submit').length
  const afterInputs = after.fields.filter((f) => f.type !== 'submit').length
  if (beforeInputs >= 3 && afterInputs === 0) return { ok: true, reason: 'form_removed' }
  return { ok: false, reason: after.url !== before.url ? 'url_changed_no_success' : 'no_success_signal' }
}

export function checkChromeApplyConnection(): ChromeApplyConnection {
  startChromeApplyBridge()
  return getChromeApplyConnection()
}

export function getApplyRuns(): ApplyRun[] {
  return listApplyRuns()
}

export async function startChromeApply(
  req: ChromeApplyStartRequest,
  win?: BrowserWindow | null
): Promise<ApplyRun> {
  startChromeApplyBridge()
  const scoredJob = req.scoredJobId
    ? (await listScoredJobs()).find((j) => j.id === req.scoredJobId)
    : undefined

  const pipelines = await listPipelines()
  const pipeline = scoredJob ? pipelines.find((p) => p.id === scoredJob.pipelineId) : undefined
  const profile = pipeline ? await getProfile(pipeline.profileId) : (await listProfiles())[0]
  const sourceUrl = scoredJob?.jobApplyUrl ?? req.url
  if (!sourceUrl) throw new Error('Either scoredJobId or url is required')
  if (!profile) throw new Error('No profile available for application filling')

  let run: ApplyRun = {
    id: randomUUID(),
    scoredJobId: scoredJob?.id,
    jobId: scoredJob?.jobId,
    sourceUrl,
    status: 'running',
    mode: 'auto',
    currentStep: 'Opening Chrome tab',
    startedAt: nowIso()
  }
  saveApplyRun(run)
  emitProgress(win, run)

  let pdfPath: string | null = null
  try {
    pdfPath = scoredJob ? await buildPdf(scoredJob) : null
    const driver = new ChromeApplyDriver()
    await driver.open(sourceUrl)

    run = await updateRun(win, run, { currentStep: 'Checking account state' })
    const account = await handleAccountPage(driver, run, profile)
    run = await updateRun(win, run, {
      accountEmail: account.accountEmail,
      accountAction: account.accountAction,
      currentStep: 'Filling application'
    })

    const fill = await fillApplication(driver, profile, account.accountEmail ?? profile.personalInfo.email, pdfPath)
    if (fill.missing.length > 0) {
      throw new Error(`missing_required_fields: ${fill.missing.slice(0, 6).join(', ')}`)
    }

    const beforeSubmit = await driver.snapshot()
    const submit = findSubmit(beforeSubmit.fields)
    if (!submit) throw new Error('no_submit_button')

    run = await updateRun(win, run, { currentStep: 'Submitting application' })
    await driver.click(submit.selector)
    await new Promise((resolve) => setTimeout(resolve, 1800))
    const afterSubmit = await driver.snapshot()
    const verification = verifySubmitted(beforeSubmit, afterSubmit)
    if (!verification.ok) throw new Error(`submit_unverified: ${verification.reason}`)

    const screenshotPath = path.join(SCREENSHOTS_DIR, `${run.id}.png`)
    const base64 = await driver.screenshot()
    await fs.writeFile(screenshotPath, Buffer.from(base64, 'base64'))

    const record: ApplicationRecord = {
      id: randomUUID(),
      scoredJobId: scoredJob?.id ?? run.id,
      jobId: scoredJob?.jobId ?? run.id,
      jobTitle: scoredJob?.jobTitle ?? 'Manual application',
      jobCompany: scoredJob?.jobCompany ?? new URL(sourceUrl).hostname,
      jobSource: scoredJob?.jobSource ?? 'website',
      appliedAt: nowIso(),
      status: 'submitted',
      confirmationScreenshotPath: screenshotPath,
      customAnswers: {},
      sourceUrl,
      finalUrl: afterSubmit.url,
      submissionMode: 'auto',
      accountEmail: account.accountEmail,
      accountAction: account.accountAction,
      verificationReason: verification.reason,
      filledFields: fill.filled,
      skippedFields: fill.skipped
    }
    saveApplication(record)
    saveApplyStep(makeStep(run, 'submit', 'ok', verification.reason, screenshotPath))

    run = await updateRun(win, run, {
      status: 'submitted',
      currentStep: 'Submitted',
      finalUrl: afterSubmit.url,
      completedAt: nowIso()
    }, verification.reason)
    return run
  } catch (e) {
    const message = (e as Error).message
    const status = message.includes('missing_required_fields') || message.includes('gmail_not_connected') ? 'blocked' : 'failed'
    saveApplyStep(makeStep(run, 'apply', 'failed', message))
    run = await updateRun(win, run, {
      status,
      currentStep: status === 'blocked' ? 'Blocked' : 'Failed',
      error: message,
      completedAt: nowIso()
    }, message)

    if (scoredJob) {
      saveApplication({
        id: randomUUID(),
        scoredJobId: scoredJob.id,
        jobId: scoredJob.jobId,
        jobTitle: scoredJob.jobTitle,
        jobCompany: scoredJob.jobCompany,
        jobSource: scoredJob.jobSource,
        appliedAt: nowIso(),
        status: 'failed',
        failureReason: message,
        customAnswers: {},
        sourceUrl,
        submissionMode: 'auto',
        accountEmail: run.accountEmail,
        accountAction: run.accountAction,
        filledFields: [],
        skippedFields: []
      })
    }
    return run
  } finally {
    if (pdfPath) fs.rm(pdfPath, { force: true }).catch(() => {})
  }
}

export async function cancelChromeApply(_sessionId: string): Promise<void> {
  // Sessions are single-run command chains today; cancellation is represented in
  // the IPC contract for the queued/parallel runner that will replace this MVP.
}

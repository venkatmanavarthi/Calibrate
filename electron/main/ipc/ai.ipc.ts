import { ipcMain, BrowserWindow } from 'electron'
import { buildProvider } from '../ai/index'
import { buildGenerationMessages } from '../ai/prompts/generate'
import { buildRevisionMessages } from '../ai/prompts/revise'
import { buildRatingMessages } from '../ai/prompts/rate'
import { buildEditElementMessages } from '../ai/prompts/edit-element'
import { validateOutput } from '../ai/validator'
import { resumeDocumentToText } from '../ai/utils/resume-doc-to-text'
import { buildProfileResumeDocument, normalizeResumeDocument, parseResumeDocument, stripCodeFences } from '../ai/resume-document'
import { getProfile } from '../storage/profiles.store'
import { loadSettings } from '../storage/settings.store'
import type { GenerateRequest, RevisionRequest, RateResumeRequest, ResumeRating, AIProvider, EditElementRequest } from '../../../src/types/models'
import type { ResumeDocument } from '../../../src/types/resume-document'

const activeControllers = new Map<string, AbortController>()

export function registerAiIpc(win: BrowserWindow): void {
  ipcMain.handle('ai:generate', async (_, req: GenerateRequest) => {
    const controller = new AbortController()
    activeControllers.set(req.requestId, controller)

    try {
      const [profile, settings] = await Promise.all([
        getProfile(req.profileId),
        loadSettings()
      ])

      if (!profile) throw new Error(`Profile ${req.profileId} not found`)

      const provider = await buildProvider(req.provider, settings)
      const messages = buildGenerationMessages(profile, req.jobDescription, settings.customPrompts?.generation)

      const fullText = await provider.generate(
        messages,
        { model: req.model, temperature: 0.2, signal: controller.signal },
        (delta) => win.webContents.send('ai:chunk', { requestId: req.requestId, delta })
      )

      const cleanJson = stripCodeFences(fullText)
      let resumeDocument: ResumeDocument | undefined
      let resumeText: string

      try {
        resumeDocument = normalizeResumeDocument(parseResumeDocument(cleanJson), profile)
        resumeText = resumeDocumentToText(resumeDocument)
      } catch {
        resumeDocument = buildProfileResumeDocument(profile)
        resumeText = resumeDocumentToText(resumeDocument)
      }

      const warnings = validateOutput(resumeText, profile)
      win.webContents.send('ai:done', { requestId: req.requestId, fullText: resumeText, warnings, resumeDocument })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      win.webContents.send('ai:error', { requestId: req.requestId, message })
    } finally {
      activeControllers.delete(req.requestId)
    }
  })

  ipcMain.handle('ai:revise', async (_, req: RevisionRequest) => {
    const controller = new AbortController()
    activeControllers.set(req.requestId, controller)

    try {
      const settings = await loadSettings()
      const provider = await buildProvider(req.provider, settings)
      const messages = buildRevisionMessages(
        req.profileSubset,
        req.selectedText,
        req.surroundingContext,
        req.instruction,
        settings.customPrompts?.revision
      )

      const fullText = await provider.generate(
        messages,
        { model: req.model, temperature: 0.3, signal: controller.signal },
        (delta) => win.webContents.send('ai:chunk', { requestId: req.requestId, delta })
      )

      win.webContents.send('ai:done', { requestId: req.requestId, fullText: stripCodeFences(fullText), warnings: [] })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      win.webContents.send('ai:error', { requestId: req.requestId, message })
    } finally {
      activeControllers.delete(req.requestId)
    }
  })

  ipcMain.handle('ai:rateResume', async (_, req: RateResumeRequest): Promise<ResumeRating> => {
    const settings = await loadSettings()
    const provider = await buildProvider(req.provider, settings)
    const messages = buildRatingMessages(req.resumeDocument, req.jobDescription, settings.customPrompts?.analysis)
    const raw = await provider.generate(messages, { model: req.model, temperature: 0.1 }, () => {})
    const cleaned = raw.replace(/^```(?:json)?\r?\n?/, '').replace(/\r?\n?```\s*$/, '').trim()
    return JSON.parse(cleaned) as ResumeRating
  })

  ipcMain.handle('ai:editElement', async (_, req: EditElementRequest): Promise<{ resumeDocument: ResumeDocument }> => {
    const controller = new AbortController()
    activeControllers.set(req.requestId, controller)

    try {
      const settings = await loadSettings()
      const provider = await buildProvider(req.provider, settings)
      const messages = buildEditElementMessages(req.resumeDocument, req.target, req.instruction)

      const fullText = await provider.generate(
        messages,
        { model: req.model, temperature: 0.3, signal: controller.signal },
        () => {}
      )

      const cleanJson = stripCodeFences(fullText)
      const resumeDocument = JSON.parse(cleanJson) as ResumeDocument
      return { resumeDocument }
    } finally {
      activeControllers.delete(req.requestId)
    }
  })

  ipcMain.handle('ai:cancel', (_, requestId: string) => {
    activeControllers.get(requestId)?.abort()
    activeControllers.delete(requestId)
    return { ok: true as const }
  })

  ipcMain.handle('ai:listModels', async (_, provider: AIProvider) => {
    const settings = await loadSettings()
    const p = await buildProvider(provider, settings)
    return p.listModels()
  })
}

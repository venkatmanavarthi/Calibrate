import { ipcMain, BrowserWindow } from 'electron'
import { buildProvider } from '../ai/index'
import { buildGenerationMessages } from '../ai/prompts/generate'
import { buildRevisionMessages } from '../ai/prompts/revise'
import { validateOutput } from '../ai/validator'
import { getProfile } from '../storage/profiles.store'
import { getTemplate } from '../storage/templates.store'
import { loadSettings } from '../storage/settings.store'
import type { GenerateRequest, RevisionRequest, AIProvider } from '../../../src/types/models'

// AIs frequently wrap their output in ```markdown ... ``` fences despite being told not to.
// Strip them so the renderer always receives clean markdown.
function stripCodeFences(text: string): string {
  return text.replace(/^```(?:markdown|md)?\r?\n?/, '').replace(/\r?\n?```\s*$/, '').trim()
}

const activeControllers = new Map<string, AbortController>()

export function registerAiIpc(win: BrowserWindow): void {
  ipcMain.handle('ai:generate', async (_, req: GenerateRequest) => {
    const controller = new AbortController()
    activeControllers.set(req.requestId, controller)

    try {
      const [profile, template, settings] = await Promise.all([
        getProfile(req.profileId),
        getTemplate(req.templateId),
        loadSettings()
      ])

      if (!profile) throw new Error(`Profile ${req.profileId} not found`)
      if (!template) throw new Error(`Template ${req.templateId} not found`)

      const provider = await buildProvider(req.provider, settings)
      const messages = buildGenerationMessages(profile, template.markdownContent, req.jobDescription, settings.customPrompts?.generation)

      const fullText = await provider.generate(
        messages,
        { model: req.model, temperature: 0.2, signal: controller.signal },
        (delta) => win.webContents.send('ai:chunk', { requestId: req.requestId, delta })
      )

      const cleanText = stripCodeFences(fullText)
      const warnings = validateOutput(cleanText, profile)
      win.webContents.send('ai:done', { requestId: req.requestId, fullText: cleanText, warnings })
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

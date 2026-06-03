import { ipcMain, BrowserWindow } from 'electron'
import { buildProvider } from '../ai/index'
import { buildInterviewMessages, buildInterviewScoreMessages } from '../ai/prompts/interview'
import { getProfile } from '../storage/profiles.store'
import { loadSettings } from '../storage/settings.store'
import type {
  InterviewMessageRequest,
  InterviewScoreRequest,
  InterviewScore
} from '../../../src/types/models'

const activeControllers = new Map<string, AbortController>()

export function registerInterviewIpc(win: BrowserWindow): void {
  ipcMain.handle('interview:sendMessage', async (_, req: InterviewMessageRequest) => {
    const controller = new AbortController()
    activeControllers.set(req.requestId, controller)

    try {
      const [settings] = await Promise.all([loadSettings()])
      const profile = req.config.profileId ? await getProfile(req.config.profileId) : null

      const provider = await buildProvider(req.config.provider, settings)
      const messages = buildInterviewMessages(req.config, profile, req.messages, req.turnNumber)

      const fullText = await provider.generate(
        messages,
        { model: req.config.model, temperature: 0.7, signal: controller.signal },
        (delta) => win.webContents.send('ai:chunk', { requestId: req.requestId, delta })
      )

      win.webContents.send('ai:done', { requestId: req.requestId, fullText, warnings: [] })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      win.webContents.send('ai:error', { requestId: req.requestId, message })
    } finally {
      activeControllers.delete(req.requestId)
    }
  })

  ipcMain.handle('interview:getScore', async (_, req: InterviewScoreRequest): Promise<InterviewScore> => {
    const settings = await loadSettings()
    const profile = req.config.profileId ? await getProfile(req.config.profileId) : null

    const provider = await buildProvider(req.config.provider, settings)
    const messages = buildInterviewScoreMessages(req.config, req.messages, profile)

    const raw = await provider.generate(messages, { model: req.config.model, temperature: 0.1 }, () => {})
    const cleaned = raw.replace(/^```(?:json)?\r?\n?/, '').replace(/\r?\n?```\s*$/, '').trim()
    return JSON.parse(cleaned) as InterviewScore
  })

  ipcMain.handle('interview:cancel', (_, requestId: string) => {
    activeControllers.get(requestId)?.abort()
    activeControllers.delete(requestId)
    return { ok: true as const }
  })
}

import http from 'http'
import { randomUUID } from 'crypto'
import type { ChromeApplyConnection } from '../../../src/types/models'

type BridgeCommand = {
  id: string
  type: string
  payload?: unknown
}

type PendingCommand = BridgeCommand & {
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
  timeout: NodeJS.Timeout
}

const PORT = 17654
const COMMAND_TIMEOUT = 90_000
const DISCOVERY_COMMAND_TIMEOUT = 180_000
const POLL_TIMEOUT = 25_000
const CONNECTION_STALE_MS = 90_000

let server: http.Server | null = null
let lastSeenAt: string | undefined
let extensionId: string | undefined
let pendingPoll: http.ServerResponse | null = null
let pendingCommands: PendingCommand[] = []
let bridgeError: string | undefined

function writeJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type'
  })
  res.end(JSON.stringify(body))
}

function readJson(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf-8')
        resolve(text ? JSON.parse(text) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function publicCommand(command: PendingCommand): BridgeCommand {
  return { id: command.id, type: command.type, payload: command.payload }
}

function flushNextCommand(): boolean {
  if (!pendingPoll || pendingCommands.length === 0) return false
  const res = pendingPoll
  pendingPoll = null
  writeJson(res, 200, { command: publicCommand(pendingCommands[0]) })
  return true
}

function handlePoll(req: http.IncomingMessage, res: http.ServerResponse): void {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`)
  lastSeenAt = new Date().toISOString()
  extensionId = url.searchParams.get('extensionId') ?? extensionId

  if (flushNextCommand()) return
  if (pendingPoll) {
    writeJson(pendingPoll, 204, {})
  }
  pendingPoll = res
  const pollTimer = setTimeout(() => {
    if (pendingPoll === res) {
      pendingPoll = null
      writeJson(res, 204, {})
    }
  }, POLL_TIMEOUT)
  res.on('close', () => {
    clearTimeout(pollTimer)
    if (pendingPoll === res) pendingPoll = null
  })
}

async function handleResult(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const body = await readJson(req) as { id?: string; ok?: boolean; result?: unknown; error?: string }
  const idx = pendingCommands.findIndex((c) => c.id === body.id)
  if (idx < 0) {
    writeJson(res, 404, { ok: false, error: 'unknown_command' })
    return
  }
  const [command] = pendingCommands.splice(idx, 1)
  clearTimeout(command.timeout)
  if (body.ok === false) command.reject(new Error(body.error ?? 'Chrome command failed'))
  else command.resolve(body.result)
  writeJson(res, 200, { ok: true })
  flushNextCommand()
}

export function startChromeApplyBridge(): void {
  if (server) return
  server = http.createServer((req, res) => {
    try {
      if (req.method === 'OPTIONS') {
        writeJson(res, 200, { ok: true })
        return
      }
      const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`)
      if (req.method === 'GET' && url.pathname === '/status') {
        writeJson(res, 200, getChromeApplyConnection())
        return
      }
      if (req.method === 'GET' && url.pathname === '/commands') {
        handlePoll(req, res)
        return
      }
      if (req.method === 'POST' && url.pathname === '/results') {
        handleResult(req, res).catch((e) => writeJson(res, 500, { ok: false, error: (e as Error).message }))
        return
      }
      writeJson(res, 404, { ok: false, error: 'not_found' })
    } catch (e) {
      writeJson(res, 500, { ok: false, error: (e as Error).message })
    }
  })
  server.on('error', (e) => {
    bridgeError = (e as Error).message
    server = null
  })
  server.listen(PORT, '127.0.0.1', () => {
    bridgeError = undefined
  })
}

export function getChromeApplyConnection(): ChromeApplyConnection {
  const connected = !!lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < CONNECTION_STALE_MS
  return {
    connected,
    lastSeenAt,
    port: PORT,
    extensionId,
    message: connected
      ? 'Chrome extension is connected.'
      : bridgeError
        ? `Chrome bridge failed to start on 127.0.0.1:${PORT}: ${bridgeError}`
        : 'Open Chrome with the bundled Calibrate extension loaded to connect.'
  }
}

export function sendChromeCommand<T = unknown>(type: string, payload?: unknown): Promise<T> {
  startChromeApplyBridge()
  return new Promise<T>((resolve, reject) => {
    const timeoutMs = type === 'discoverJobs' ? DISCOVERY_COMMAND_TIMEOUT : COMMAND_TIMEOUT
    const command: PendingCommand = {
      id: randomUUID(),
      type,
      payload,
      resolve: (value) => resolve(value as T),
      reject,
      timeout: setTimeout(() => {
        const idx = pendingCommands.findIndex((c) => c.id === command.id)
        if (idx >= 0) pendingCommands.splice(idx, 1)
        reject(new Error('Timed out waiting for Chrome extension. Confirm the extension is loaded and connected.'))
      }, timeoutMs)
    }
    pendingCommands.push(command)
    flushNextCommand()
  })
}

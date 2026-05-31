import fs from 'fs/promises'
import http from 'http'
import crypto from 'crypto'
import { safeStorage, shell } from 'electron'
import { GMAIL_CONNECTION_FILE } from '../storage/index'
import { loadSettings } from '../storage/settings.store'
import type { GmailConnection } from '../../../src/types/models'

type StoredGmailConnection = GmailConnection & {
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
}

type TokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type: string
}

const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
const CALLBACK_HOST = '127.0.0.1'

function encrypt(value: string): string {
  if (safeStorage.isEncryptionAvailable()) return safeStorage.encryptString(value).toString('base64')
  return Buffer.from(value, 'utf-8').toString('base64')
}

function decrypt(value: string): string {
  const buf = Buffer.from(value, 'base64')
  if (safeStorage.isEncryptionAvailable()) return safeStorage.decryptString(buf)
  return buf.toString('utf-8')
}

async function readConnection(): Promise<StoredGmailConnection | null> {
  try {
    const stored = JSON.parse(await fs.readFile(GMAIL_CONNECTION_FILE, 'utf-8')) as StoredGmailConnection
    return {
      ...stored,
      accessToken: stored.accessToken ? decrypt(stored.accessToken) : undefined,
      refreshToken: stored.refreshToken ? decrypt(stored.refreshToken) : undefined
    }
  } catch {
    return null
  }
}

async function writeConnection(connection: StoredGmailConnection): Promise<void> {
  const toStore: StoredGmailConnection = {
    ...connection,
    accessToken: connection.accessToken ? encrypt(connection.accessToken) : undefined,
    refreshToken: connection.refreshToken ? encrypt(connection.refreshToken) : undefined
  }
  await fs.writeFile(GMAIL_CONNECTION_FILE, JSON.stringify(toStore, null, 2), 'utf-8')
}

export async function getGmailStatus(): Promise<GmailConnection> {
  const settings = await loadSettings()
  if (!settings.gmailOAuthClientId || !settings.gmailOAuthClientSecret) {
    return {
      status: 'not_configured',
      message: 'Add a Gmail OAuth client ID and secret in Settings before connecting Gmail.'
    }
  }

  const stored = await readConnection()
  if (!stored?.refreshToken && !stored?.accessToken) return { status: 'disconnected' }
  if (stored.expiresAt && stored.expiresAt < Date.now() && !stored.refreshToken) {
    return {
      status: 'expired',
      email: stored.email,
      connectedAt: stored.connectedAt,
      lastVerifiedAt: stored.lastVerifiedAt
    }
  }
  return {
    status: 'connected',
    email: stored.email,
    connectedAt: stored.connectedAt,
    lastVerifiedAt: stored.lastVerifiedAt
  }
}

function createOAuthCallbackServer(): Promise<{ redirectUri: string; codePromise: Promise<string> }> {
  return new Promise((resolveServer, rejectServer) => {
    const server = http.createServer((req, res) => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      const redirectUri = `http://${CALLBACK_HOST}:${port}/gmail/oauth/callback`
      const url = new URL(req.url ?? '/', redirectUri)
      if (url.pathname !== '/gmail/oauth/callback') {
        res.writeHead(404)
        res.end('Not found')
        return
      }
      const code = url.searchParams.get('code')
      const error = url.searchParams.get('error')
      if (error || !code) {
        res.writeHead(400, { 'content-type': 'text/plain' })
        res.end('Gmail connection failed. You can close this tab.')
        server.close()
        rejectCode(new Error(error ?? 'missing_oauth_code'))
        return
      }
      res.writeHead(200, { 'content-type': 'text/plain' })
      res.end('Gmail connected to Calibrate. You can close this tab.')
      server.close()
      resolveCode(code)
    })

    let resolveCode: (code: string) => void = () => {}
    let rejectCode: (reason?: unknown) => void = () => {}
    const codePromise = new Promise<string>((resolve, reject) => {
      resolveCode = resolve
      rejectCode = reject
    })

    server.on('error', rejectServer)
    server.listen(0, CALLBACK_HOST, () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      resolveServer({
        redirectUri: `http://${CALLBACK_HOST}:${port}/gmail/oauth/callback`,
        codePromise
      })
    })
    setTimeout(() => {
      server.close()
      rejectCode(new Error('Timed out waiting for Gmail OAuth callback'))
    }, 120_000)
  })
}

async function exchangeCode(code: string, redirectUri: string): Promise<TokenResponse> {
  const settings = await loadSettings()
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: settings.gmailOAuthClientId ?? '',
      client_secret: settings.gmailOAuthClientSecret ?? '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    }).toString()
  })
  if (!res.ok) throw new Error(`Gmail token exchange failed: ${res.status}`)
  return res.json() as Promise<TokenResponse>
}

async function refreshAccessToken(connection: StoredGmailConnection): Promise<StoredGmailConnection> {
  if (!connection.refreshToken) throw new Error('gmail_refresh_token_missing')
  const settings = await loadSettings()
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: settings.gmailOAuthClientId ?? '',
      client_secret: settings.gmailOAuthClientSecret ?? '',
      refresh_token: connection.refreshToken,
      grant_type: 'refresh_token'
    }).toString()
  })
  if (!res.ok) throw new Error(`Gmail token refresh failed: ${res.status}`)
  const token = await res.json() as TokenResponse
  const updated = {
    ...connection,
    accessToken: token.access_token,
    expiresAt: Date.now() + ((token.expires_in ?? 3600) - 60) * 1000
  }
  await writeConnection(updated)
  return updated
}

async function getAccessToken(): Promise<string | null> {
  const connection = await readConnection()
  if (!connection) return null
  if (connection.accessToken && (!connection.expiresAt || connection.expiresAt > Date.now())) {
    return connection.accessToken
  }
  const refreshed = await refreshAccessToken(connection)
  return refreshed.accessToken ?? null
}

async function getGmailProfile(accessToken: string): Promise<{ emailAddress?: string }> {
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { authorization: `Bearer ${accessToken}` }
  })
  if (!res.ok) throw new Error(`Gmail profile failed: ${res.status}`)
  return res.json() as Promise<{ emailAddress?: string }>
}

export async function startGmailConnect(): Promise<GmailConnection> {
  const settings = await loadSettings()
  if (!settings.gmailOAuthClientId || !settings.gmailOAuthClientSecret) {
    return {
      status: 'not_configured',
      message: 'Gmail OAuth is not configured. Create a Google OAuth desktop client and save its client ID and secret first.'
    }
  }

  const state = crypto.randomBytes(16).toString('hex')
  const { redirectUri, codePromise } = await createOAuthCallbackServer()
  const params = new URLSearchParams({
    client_id: settings.gmailOAuthClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_READONLY_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state
  })
  await shell.openExternal(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)

  const code = await codePromise
  const token = await exchangeCode(code, redirectUri)
  const profile = await getGmailProfile(token.access_token)
  const connection: StoredGmailConnection = {
    status: 'connected',
    email: profile.emailAddress,
    connectedAt: new Date().toISOString(),
    lastVerifiedAt: new Date().toISOString(),
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + ((token.expires_in ?? 3600) - 60) * 1000
  }
  await writeConnection(connection)
  return {
    status: 'connected',
    email: connection.email,
    connectedAt: connection.connectedAt,
    lastVerifiedAt: connection.lastVerifiedAt
  }
}

export async function disconnectGmail(): Promise<void> {
  await fs.rm(GMAIL_CONNECTION_FILE, { force: true })
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
}

function collectParts(payload: any): string {
  const chunks: string[] = []
  const visit = (part: any) => {
    if (!part) return
    if (part.body?.data) chunks.push(decodeBase64Url(part.body.data))
    for (const child of part.parts ?? []) visit(child)
  }
  visit(payload)
  return chunks.join('\n')
}

export async function findRecentVerificationCode(
  domain: string,
  _sinceMs: number
): Promise<{ code?: string; link?: string } | null> {
  const accessToken = await getAccessToken()
  if (!accessToken) return null

  const host = domain.replace(/^www\./, '')
  const query = `newer_than:10m (${host} OR verification OR verify OR code OR login)`
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=${encodeURIComponent(query)}`,
    { headers: { authorization: `Bearer ${accessToken}` } }
  )
  if (!listRes.ok) return null
  const list = await listRes.json() as { messages?: Array<{ id: string }> }
  for (const message of list.messages ?? []) {
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
      { headers: { authorization: `Bearer ${accessToken}` } }
    )
    if (!res.ok) continue
    const full = await res.json() as any
    const text = `${full.snippet ?? ''}\n${collectParts(full.payload)}`
    const code = text.match(/\b\d{6,8}\b/)?.[0] ?? text.match(/\b[A-Z0-9]{6,10}\b/)?.[0]
    if (code) return { code }
    const link = text.match(/https?:\/\/[^\s"'<>]+/i)?.[0]
    if (link && link.includes(host)) return { link }
  }
  return null
}

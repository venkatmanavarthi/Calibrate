import { BrowserWindow, session } from 'electron'

export async function openSessionWindow(atsDomain: string): Promise<void> {
  const win = new BrowserWindow({
    width: 1100,
    height: 900,
    show: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: false
    }
  })
  await win.loadURL(`https://${atsDomain}`)
}

export async function clearSession(atsDomain: string): Promise<void> {
  const ses = session.defaultSession
  const cookies = await ses.cookies.get({ domain: atsDomain })
  for (const cookie of cookies) {
    const url = `https://${cookie.domain?.replace(/^\./, '')}${cookie.path}`
    await ses.cookies.remove(url, cookie.name)
  }
}

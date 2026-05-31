import { sendChromeCommand } from './bridge'

export type ChromeField = {
  label: string
  selector: string
  type: string
  required: boolean
  filled: boolean
}

export type ChromeSnapshot = {
  tabId: number
  url: string
  title: string
  text: string
  fields: ChromeField[]
}

export class ChromeApplyDriver {
  private tabId: number | null = null

  async open(url: string): Promise<void> {
    const result = await sendChromeCommand<{ tabId: number }>('openTab', { url })
    this.tabId = result.tabId
  }

  async snapshot(): Promise<ChromeSnapshot> {
    if (this.tabId == null) throw new Error('Chrome tab is not open')
    return sendChromeCommand<ChromeSnapshot>('snapshot', { tabId: this.tabId })
  }

  async fill(selector: string, value: string): Promise<void> {
    if (this.tabId == null) throw new Error('Chrome tab is not open')
    await sendChromeCommand('fill', { tabId: this.tabId, selector, value })
  }

  async click(selector: string): Promise<void> {
    if (this.tabId == null) throw new Error('Chrome tab is not open')
    await sendChromeCommand('click', { tabId: this.tabId, selector })
  }

  async select(selector: string, value: string): Promise<void> {
    if (this.tabId == null) throw new Error('Chrome tab is not open')
    await sendChromeCommand('select', { tabId: this.tabId, selector, value })
  }

  async uploadFile(selector: string, filePath: string): Promise<void> {
    if (this.tabId == null) throw new Error('Chrome tab is not open')
    await sendChromeCommand('uploadFile', { tabId: this.tabId, selector, filePath })
  }

  async screenshot(): Promise<string> {
    if (this.tabId == null) throw new Error('Chrome tab is not open')
    const result = await sendChromeCommand<{ base64: string }>('screenshot', { tabId: this.tabId })
    return result.base64
  }

  async currentUrl(): Promise<string> {
    const snapshot = await this.snapshot()
    return snapshot.url
  }
}

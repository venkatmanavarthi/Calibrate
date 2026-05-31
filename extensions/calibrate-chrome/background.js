const BRIDGE = 'http://127.0.0.1:17654'
const EXTENSION_ID = chrome.runtime.id
const BRIDGE_ALARM = 'calibrate-bridge-poll'
let polling = false

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForTabComplete(tabId, timeoutMs = 15000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const tab = await chrome.tabs.get(tabId)
    if (tab.status === 'complete') return
    await sleep(250)
  }
}

async function runInTab(tabId, func, args = []) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args
  })
  return result && result.result
}

function showCalibrateCursor(selector, label) {
  const style = document.getElementById('__calibrate_cursor_style') || document.createElement('style')
  style.id = '__calibrate_cursor_style'
  style.textContent = `
    @keyframes calibratePageGlow {
      0% { opacity: 0; box-shadow: inset 0 0 0 rgba(37,99,235,0), inset 0 0 0 rgba(20,184,166,0); }
      20% { opacity: 1; box-shadow: inset 0 0 34px rgba(37,99,235,.40), inset 0 0 90px rgba(20,184,166,.18); }
      100% { opacity: 0; box-shadow: inset 0 0 12px rgba(37,99,235,0), inset 0 0 42px rgba(20,184,166,0); }
    }
    @keyframes calibrateCursorPulse {
      0%, 100% { transform: scale(1); opacity: .75; }
      50% { transform: scale(1.9); opacity: .15; }
    }
  `
  if (!style.parentNode) document.documentElement.appendChild(style)

  const pageGlow = document.getElementById('__calibrate_page_glow') || document.createElement('div')
  pageGlow.id = '__calibrate_page_glow'
  pageGlow.setAttribute('aria-hidden', 'true')
  pageGlow.style.cssText = [
    'position: fixed',
    'inset: 0',
    'z-index: 2147483646',
    'pointer-events: none',
    'border: 2px solid rgba(37,99,235,.55)',
    'animation: calibratePageGlow 1100ms ease-out both'
  ].join(';')
  if (!pageGlow.parentNode) document.documentElement.appendChild(pageGlow)
  pageGlow.getAnimations().forEach((animation) => animation.cancel())
  pageGlow.animate(
    [
      { opacity: 0, boxShadow: 'inset 0 0 0 rgba(37,99,235,0), inset 0 0 0 rgba(20,184,166,0)' },
      { opacity: 1, boxShadow: 'inset 0 0 34px rgba(37,99,235,.40), inset 0 0 90px rgba(20,184,166,.18)', offset: 0.2 },
      { opacity: 0, boxShadow: 'inset 0 0 12px rgba(37,99,235,0), inset 0 0 42px rgba(20,184,166,0)' }
    ],
    { duration: 1100, easing: 'ease-out' }
  )

  const existing = document.getElementById('__calibrate_cursor')
  const cursor = existing || document.createElement('div')
  cursor.id = '__calibrate_cursor'
  cursor.setAttribute('aria-hidden', 'true')
  cursor.style.cssText = [
    'position: fixed',
    'left: 0',
    'top: 0',
    'width: 22px',
    'height: 22px',
    'z-index: 2147483647',
    'pointer-events: none',
    'transition: transform 180ms ease',
    'filter: drop-shadow(0 2px 5px rgba(0,0,0,.35))'
  ].join(';')

  cursor.innerHTML = `
    <div style="
      position:absolute;left:-11px;top:-11px;width:28px;height:28px;border-radius:999px;
      background:rgba(37,99,235,.35);
      animation:calibrateCursorPulse 900ms ease-out infinite;
    "></div>
    <div style="
      position:relative;
      width:0;height:0;
      border-left:7px solid #111827;
      border-top:13px solid #111827;
      border-right:7px solid transparent;
      border-bottom:13px solid transparent;
      transform:rotate(-8deg);
    "></div>
    <div style="
      position:absolute;left:12px;top:13px;
      min-width:44px;padding:3px 6px;border-radius:999px;
      background:#111827;color:white;font:12px/1.2 system-ui,-apple-system,BlinkMacSystemFont,sans-serif;
      white-space:nowrap;
    ">${label || 'Calibrate'}</div>
  `
  if (!existing) document.documentElement.appendChild(cursor)

  const el = document.querySelector(selector)
  if (!el) throw new Error(`Element not found: ${selector}`)
  const rect = el.getBoundingClientRect()
  const x = Math.max(8, Math.min(window.innerWidth - 24, rect.left + rect.width / 2))
  const y = Math.max(8, Math.min(window.innerHeight - 24, rect.top + rect.height / 2))
  cursor.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`

  el.animate(
    [
      { outline: '0 solid rgba(37,99,235,0)' },
      { outline: '3px solid rgba(37,99,235,.75)' },
      { outline: '0 solid rgba(37,99,235,0)' }
    ],
    { duration: 700, easing: 'ease-out' }
  )
  return true
}

function collectSnapshot() {
  const PLACEHOLDER_TEXTS = ['select', 'select...', 'select…', 'please select', 'choose', 'choose one', '--', '—']

  function visible(el) {
    const r = el.getBoundingClientRect()
    const style = window.getComputedStyle(el)
    return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
  }

  function resolveLabel(el) {
    if (el.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`)
      if (lbl && lbl.textContent) return lbl.textContent.trim()
    }
    const aria = el.getAttribute('aria-label')
    if (aria) return aria.trim()
    const labelledBy = el.getAttribute('aria-labelledby')
    if (labelledBy) {
      const ref = document.getElementById(labelledBy)
      if (ref && ref.textContent) return ref.textContent.trim()
    }
    let node = el.parentElement
    for (let i = 0; i < 6 && node && node !== document.body; i++) {
      const lbl = node.querySelector(':scope > label, :scope > legend, :scope > .label, :scope > [class*="label"]')
      if (lbl && lbl.textContent) return lbl.textContent.trim()
      node = node.parentElement
    }
    return el.getAttribute('placeholder') || el.getAttribute('name') || ''
  }

  function makeSelector(el) {
    if (el.id) return `#${CSS.escape(el.id)}`
    const name = el.getAttribute('name')
    if (name) return `${el.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`
    const testId = el.getAttribute('data-testid')
    if (testId) return `[data-testid="${CSS.escape(testId)}"]`
    if (!el.dataset.calibrateId) el.dataset.calibrateId = Math.random().toString(36).slice(2)
    return `[data-calibrate-id="${el.dataset.calibrateId}"]`
  }

  function looksRequired(el, label) {
    if (el.required === true) return true
    if (el.getAttribute('aria-required') === 'true') return true
    if (label.includes('*')) return true
    if (/\(required\)$/i.test(label)) return true
    if (el.closest('.required, [data-required="true"], [class*="required"]')) return true
    return false
  }

  function isFilled(el) {
    const tag = el.tagName.toLowerCase()
    const type = (el.getAttribute('type') || '').toLowerCase()
    if (type === 'file') return el.files && el.files.length > 0
    if (type === 'checkbox' || type === 'radio') return el.checked === true
    if (tag === 'select') {
      if (!el.value) return false
      const text = (el.options[el.selectedIndex] && el.options[el.selectedIndex].text || '').trim().toLowerCase()
      return !PLACEHOLDER_TEXTS.includes(text)
    }
    return ((el.value || el.textContent || '') + '').trim().length > 0
  }

  const fields = []
  const seen = new Set()
  const selector = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select, button[type="submit"], input[type="submit"], [role="combobox"]'
  for (const el of document.querySelectorAll(selector)) {
    if (!visible(el)) continue
    const sel = makeSelector(el)
    if (seen.has(sel)) continue
    seen.add(sel)
    const label = resolveLabel(el) || (el.textContent || el.value || sel).trim()
    let type = el.tagName.toLowerCase()
    if (el.tagName === 'INPUT') type = el.getAttribute('type') || 'text'
    if (el.getAttribute('role') === 'combobox') type = 'combobox'
    if (el.tagName === 'BUTTON') type = 'submit'
    fields.push({
      label,
      selector: sel,
      type,
      required: looksRequired(el, label),
      filled: isFilled(el)
    })
  }

  return {
    url: location.href,
    title: document.title,
    text: (document.body && document.body.innerText || '').slice(0, 12000),
    fields
  }
}

function collectDiscoveryPage() {
  function visible(el) {
    const r = el.getBoundingClientRect()
    const style = window.getComputedStyle(el)
    return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
  }

  function clean(text) {
    return (text || '').replace(/\s+/g, ' ').trim()
  }

  const links = []
  const seen = new Set()
  for (const a of document.querySelectorAll('a[href]')) {
    if (!visible(a)) continue
    const href = a.href
    if (!href || seen.has(href)) continue
    seen.add(href)
    const parent = a.closest('li, article, tr, [class*="job"], [class*="career"], [class*="posting"], [data-testid], section, div')
    links.push({
      href,
      text: clean(a.innerText || a.textContent || a.getAttribute('aria-label') || a.getAttribute('title')),
      nearText: clean(parent ? parent.innerText : '')
    })
  }

  const heading = clean(
    (document.querySelector('h1, [data-qa="job-title"], [class*="job-title"], [class*="posting-headline"]') || {}).innerText
  )

  const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
  return {
    url: location.href,
    title: document.title,
    heading,
    metaDescription: clean(metaDescription),
    text: clean(document.body?.innerText || '').slice(0, 30000),
    links
  }
}

function collectJobDetail() {
  function clean(text) {
    return (text || '').replace(/\s+/g, ' ').trim()
  }

  function firstText(selectors) {
    for (const selector of selectors) {
      const el = document.querySelector(selector)
      const text = clean(el && el.innerText)
      if (text) return text
    }
    return ''
  }

  const title = firstText([
    'h1',
    '[data-qa="job-title"]',
    '[data-testid*="job-title"]',
    '[class*="job-title"]',
    '[class*="posting-headline"] h2',
    '[class*="posting-title"]'
  ])
  const locationText = firstText([
    '[data-qa="job-location"]',
    '[data-testid*="location"]',
    '[class*="location"]',
    '[class*="office"]'
  ])
  const description = firstText([
    '[data-qa="job-description"]',
    '[data-testid*="description"]',
    '[class*="job-description"]',
    '[class*="posting-description"]',
    '[class*="description"]',
    'main',
    'article',
    'body'
  ])

  return {
    url: window.location.href,
    title: title || clean(document.title).replace(/\s*[-|]\s*.*$/, ''),
    location: locationText,
    descriptionText: description.slice(0, 24000)
  }
}

function normalizeUrl(input) {
  const value = (input || '').trim()
  if (!value) throw new Error('Website URL is required')
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function canonicalUrl(input) {
  try {
    const url = new URL(input)
    url.hash = ''
    if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '')
    return url.toString()
  } catch {
    return input
  }
}

function isHttpUrl(url) {
  return /^https?:\/\//i.test(url || '')
}

function badDiscoveryUrl(url) {
  return !isHttpUrl(url)
    || /\.(pdf|png|jpe?g|gif|svg|zip|docx?|xlsx?)($|\?)/i.test(url)
    || /(facebook|twitter|x\.com|instagram|youtube|linkedin\.com|privacy|terms|cookie|mailto:|tel:)/i.test(url)
}

function scoreCareerLink(link, startOrigin) {
  const text = `${link.text || ''} ${link.href || ''}`.toLowerCase()
  let score = 0
  if (/(careers?|jobs?|open roles?|openings?|positions?|join[-\s]?us|work with us)/i.test(text)) score += 8
  if (/(greenhouse\.io|lever\.co|ashbyhq\.com|ashby\.com|workdayjobs\.com|smartrecruiters\.com|jobvite\.com|bamboohr\.com)/i.test(text)) score += 10
  try {
    if (new URL(link.href).origin === startOrigin) score += 2
  } catch {}
  if (/blog|press|news|docs|support|contact|about/i.test(text)) score -= 4
  return score
}

function looksLikeGenericJobText(text) {
  return /^(apply|view|learn more|read more|see more|details|open role|job|career|careers|all jobs|view job|apply now)$/i.test((text || '').trim())
}

function isJobLink(link) {
  if (!link || badDiscoveryUrl(link.href)) return false
  const href = link.href || ''
  const text = `${link.text || ''} ${link.nearText || ''}`.trim()
  const combined = `${href} ${text}`.toLowerCase()
  if (looksLikeGenericJobText(link.text) && !/(greenhouse\.io|lever\.co|ashbyhq\.com|ashby\.com|workdayjobs\.com)/i.test(href)) {
    return false
  }
  if (/(greenhouse\.io\/.*\/jobs\/\d+|boards\.greenhouse\.io\/.*\/jobs\/\d+|jobs\.lever\.co\/[^/]+\/[^/]+|ashbyhq\.com\/.*\/[a-f0-9-]{16,}|workdayjobs\.com\/.*\/job\/|smartrecruiters\.com\/.*\/\d+)/i.test(href)) {
    return true
  }
  if (/(\/jobs?\/|\/careers?\/|\/positions?\/|\/openings?\/|\/apply\/)/i.test(href)
    && /(engineer|developer|manager|designer|product|data|sales|marketing|operations|analyst|recruiter|intern|support|architect|lead|director|scientist|security|finance|customer|success|ai|ml)/i.test(combined)) {
    return true
  }
  return false
}

function titleFromLink(link) {
  const text = (link.text || link.nearText || '').replace(/\s+/g, ' ').trim()
  if (text && text.length <= 120 && !looksLikeGenericJobText(text)) return text
  try {
    const last = new URL(link.href).pathname.split('/').filter(Boolean).pop() || ''
    return decodeURIComponent(last).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  } catch {
    return 'Open role'
  }
}

function extractLocation(text) {
  const source = (text || '').split(/\n|•|\|/).map((p) => p.trim()).filter(Boolean)
  return source.find((p) => /\b(remote|hybrid|onsite|united states|usa|canada|india|london|new york|san francisco|austin|seattle|bengaluru|bangalore)\b/i.test(p) && p.length < 90) || ''
}

async function navigateTab(tabId, url) {
  await chrome.tabs.update(tabId, { url, active: true })
  await waitForTabComplete(tabId, 20000)
  await sleep(700)
}

async function discoverJobs(payload) {
  const startUrl = normalizeUrl(payload.url)
  const limit = Math.max(1, Math.min(Number(payload.limit) || 40, 60))
  const startOrigin = new URL(startUrl).origin
  const tab = await chrome.tabs.create({ url: startUrl, active: true })
  await waitForTabComplete(tab.id, 20000)
  await sleep(700)

  const pages = new Map()
  const jobLinks = new Map()
  const visited = new Set()

  function addPage(url, label, score) {
    if (!url || badDiscoveryUrl(url)) return
    const key = canonicalUrl(url)
    const current = pages.get(key)
    if (!current || current.score < score) pages.set(key, { url: key, label, score })
  }

  function addJob(link) {
    const url = canonicalUrl(link.href)
    if (!url || badDiscoveryUrl(url) || jobLinks.has(url)) return
    jobLinks.set(url, { ...link, href: url })
  }

  const commonPaths = ['/careers', '/jobs', '/careers/jobs', '/company/careers', '/about/careers']
  addPage(startUrl, 'Home', 4)
  for (const path of commonPaths) addPage(`${startOrigin}${path}`, path, 3)

  const firstPage = await runInTab(tab.id, collectDiscoveryPage)
  for (const link of firstPage.links || []) {
    const score = scoreCareerLink(link, startOrigin)
    if (score > 0) addPage(link.href, link.text, score)
    if (isJobLink(link)) addJob(link)
  }

  const sortedPages = () => Array.from(pages.values()).sort((a, b) => b.score - a.score).slice(0, 10)
  for (const page of sortedPages()) {
    if (visited.has(page.url)) continue
    visited.add(page.url)
    try {
      await navigateTab(tab.id, page.url)
      const data = await runInTab(tab.id, collectDiscoveryPage)
      if (/(apply for this job|submit application|job description|responsibilities|requirements|qualifications)/i.test(data.text || '')) {
        addJob({ href: data.url, text: data.heading || data.title, nearText: data.text.slice(0, 600) })
      }
      for (const link of data.links || []) {
        const score = scoreCareerLink(link, startOrigin)
        if (score > 6 && pages.size < 20) addPage(link.href, link.text, score - 1)
        if (isJobLink(link)) addJob(link)
      }
    } catch {
      // Some sites block direct page loads; keep whatever was discovered.
    }
    if (jobLinks.size >= limit) break
  }

  const jobs = []
  for (const link of Array.from(jobLinks.values()).slice(0, limit)) {
    try {
      await navigateTab(tab.id, link.href)
      const detail = await runInTab(tab.id, collectJobDetail)
      const title = (detail.title && detail.title.length >= 3 ? detail.title : titleFromLink(link)).slice(0, 140)
      jobs.push({
        title,
        url: detail.url || link.href,
        location: detail.location || extractLocation(link.nearText || detail.descriptionText),
        descriptionText: detail.descriptionText || link.nearText || title
      })
    } catch {
      jobs.push({
        title: titleFromLink(link).slice(0, 140),
        url: link.href,
        location: extractLocation(link.nearText),
        descriptionText: link.nearText || link.text || ''
      })
    }
  }

  return { jobs, pagesVisited: visited.size }
}

function fillField(selector, value) {
  const el = document.querySelector(selector)
  if (!el) throw new Error(`Element not found: ${selector}`)
  el.scrollIntoView({ block: 'center' })
  el.focus()
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const desc = Object.getOwnPropertyDescriptor(proto, 'value')
  if (desc && desc.set) desc.set.call(el, value)
  else el.value = value
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  el.blur()
}

function clickField(selector) {
  const el = document.querySelector(selector)
  if (!el) throw new Error(`Element not found: ${selector}`)
  el.scrollIntoView({ block: 'center' })
  el.click()
}

function selectField(selector, value) {
  const el = document.querySelector(selector)
  if (!el) throw new Error(`Element not found: ${selector}`)
  const options = Array.from(el.options || [])
  const target = options.find((o) => o.value === value)
    || options.find((o) => (o.textContent || '').trim().toLowerCase().includes(value.toLowerCase()))
  if (!target) throw new Error(`Option not found: ${value}`)
  el.value = target.value
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

async function withDebugger(tabId, fn) {
  const target = { tabId }
  await chrome.debugger.attach(target, '1.3')
  try {
    return await fn((method, params) => chrome.debugger.sendCommand(target, method, params || {}))
  } finally {
    await chrome.debugger.detach(target).catch(() => {})
  }
}

async function uploadFile(tabId, selector, filePath) {
  return withDebugger(tabId, async (send) => {
    await send('DOM.enable')
    const doc = await send('DOM.getDocument', { depth: 1 })
    let found = await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector })
    if (!found.nodeId) {
      found = await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' })
    }
    if (!found.nodeId) throw new Error(`File input not found: ${selector}`)
    await send('DOM.setFileInputFiles', { nodeId: found.nodeId, files: [filePath] })
  })
}

async function execute(command) {
  const payload = command.payload || {}
  switch (command.type) {
    case 'openTab': {
      const tab = await chrome.tabs.create({ url: payload.url, active: true })
      await waitForTabComplete(tab.id)
      return { tabId: tab.id }
    }
    case 'snapshot': {
      const tab = await chrome.tabs.get(payload.tabId)
      const snap = await runInTab(payload.tabId, collectSnapshot)
      return { tabId: payload.tabId, ...snap, url: tab.url || snap.url, title: tab.title || snap.title }
    }
    case 'fill':
      await runInTab(payload.tabId, showCalibrateCursor, [payload.selector, 'Fill'])
      await runInTab(payload.tabId, fillField, [payload.selector, payload.value])
      return { ok: true }
    case 'click':
      await runInTab(payload.tabId, showCalibrateCursor, [payload.selector, 'Click'])
      await runInTab(payload.tabId, clickField, [payload.selector])
      await sleep(1000)
      return { ok: true }
    case 'select':
      await runInTab(payload.tabId, showCalibrateCursor, [payload.selector, 'Select'])
      await runInTab(payload.tabId, selectField, [payload.selector, payload.value])
      return { ok: true }
    case 'uploadFile':
      await runInTab(payload.tabId, showCalibrateCursor, [payload.selector || 'input[type="file"]', 'Upload'])
      await uploadFile(payload.tabId, payload.selector || 'input[type="file"]', payload.filePath)
      return { ok: true }
    case 'screenshot': {
      const tab = await chrome.tabs.get(payload.tabId)
      const base64Url = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' })
      return { base64: base64Url.replace(/^data:image\/png;base64,/, '') }
    }
    case 'discoverJobs':
      return discoverJobs(payload)
    default:
      throw new Error(`Unknown command: ${command.type}`)
  }
}

async function postResult(id, body) {
  await fetch(`${BRIDGE}/results`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, ...body })
  })
}

async function poll() {
  if (polling) return
  polling = true
  while (true) {
    try {
      const res = await fetch(`${BRIDGE}/commands?extensionId=${encodeURIComponent(EXTENSION_ID)}`)
      if (res.status === 204) {
        await sleep(300)
        continue
      }
      const body = await res.json()
      if (!body.command) continue
      try {
        const result = await execute(body.command)
        await postResult(body.command.id, { ok: true, result })
      } catch (error) {
        await postResult(body.command.id, { ok: false, error: error && error.message ? error.message : String(error) })
      }
    } catch {
      await sleep(1500)
    }
  }
}

function ensureBridgeAlarm() {
  chrome.alarms.create(BRIDGE_ALARM, { periodInMinutes: 0.5 })
}

chrome.runtime.onInstalled.addListener(() => {
  ensureBridgeAlarm()
  poll()
})

chrome.runtime.onStartup.addListener(() => {
  ensureBridgeAlarm()
  poll()
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === BRIDGE_ALARM) poll()
})

chrome.action.onClicked.addListener(() => {
  poll()
})

ensureBridgeAlarm()
poll()

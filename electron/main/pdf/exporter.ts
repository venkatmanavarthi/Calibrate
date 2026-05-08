import { BrowserWindow, app } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { marked } from 'marked'
import type { PdfExportRequest } from '../../../src/types/models'

export async function exportToPdf(req: PdfExportRequest): Promise<void> {
  const bodyHtml = await marked.parse(req.markdownContent)
  const fullHtml = buildPrintableHtml(bodyHtml, req.marginMm, req.font)

  const tempPath = path.join(app.getPath('temp'), `resume-print-${Date.now()}.html`)
  await fs.writeFile(tempPath, fullHtml, 'utf-8')

  const win = new BrowserWindow({
    show: false,
    webPreferences: { javascript: false }
  })

  await win.loadURL(`file://${tempPath}`)

  const pdfBuffer = await win.webContents.printToPDF({
    pageSize: req.pageSize,
    printBackground: true,
    margins: {
      top: req.marginMm / 25.4,
      bottom: req.marginMm / 25.4,
      left: req.marginMm / 25.4,
      right: req.marginMm / 25.4,
      marginType: 'custom'
    }
  })

  win.destroy()
  await fs.unlink(tempPath).catch(() => {})
  await fs.writeFile(req.destFilePath, pdfBuffer)
}

function buildPrintableHtml(body: string, marginMm: number, font: string): string {
  const fontStack = `'${font}', Georgia, 'Times New Roman', serif`
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { margin: ${marginMm}mm; }
  * { box-sizing: border-box; }
  body {
    font-family: ${fontStack};
    font-size: 11pt;
    line-height: 1.5;
    color: #111;
    margin: 0;
    padding: 0;
    overflow-wrap: break-word;
    word-break: break-word;
  }
  h1 { font-size: 18pt; margin: 0 0 4pt; }
  h2 { font-size: 13pt; border-bottom: 1px solid #aaa; margin: 12pt 0 4pt; padding-bottom: 2pt; }
  h3 { font-size: 11pt; margin: 8pt 0 2pt; }
  p { margin: 0 0 6pt; overflow-wrap: break-word; word-break: break-word; overflow: hidden; }
  p::after { content: ''; display: block; clear: both; }
  ul { margin: 2pt 0 6pt; padding-left: 18pt; }
  li { margin-bottom: 2pt; overflow-wrap: break-word; word-break: break-word; }
  a { color: #111; text-decoration: none; }
  strong { font-weight: bold; }
  pre, code { white-space: pre-wrap; overflow-wrap: break-word; font-family: inherit; font-size: inherit; }
</style>
</head>
<body>${body}</body>
</html>`
}

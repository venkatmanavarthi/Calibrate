import { useEffect, useState } from 'react'
import { marked } from 'marked'

interface PdfPreviewProps {
  markdown: string
  font: string
  pageSize: 'Letter' | 'A4'
  marginMm: number
}

// Page dimensions in px at 96dpi
const PAGE_PX = { Letter: { w: 816, h: 1056 }, A4: { w: 794, h: 1123 } }

function buildHtml(body: string, font: string, marginMm: number): string {
  const fontStack = `'${font}', Georgia, 'Times New Roman', serif`
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: white; }
  body {
    font-family: ${fontStack};
    font-size: 11pt;
    line-height: 1.5;
    color: #111;
    padding: ${marginMm}mm;
    overflow-wrap: break-word;
    word-break: break-word;
  }
  h1 { font-size: 18pt; margin: 0 0 4pt; }
  h2 { font-size: 13pt; border-bottom: 1px solid #aaa; margin: 12pt 0 4pt; padding-bottom: 2pt; }
  h3 { font-size: 11pt; margin: 8pt 0 2pt; }
  p { margin: 0 0 6pt; overflow-wrap: break-word; word-break: break-word; }
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

export default function PdfPreview({ markdown, font, pageSize, marginMm }: PdfPreviewProps) {
  const [srcDoc, setSrcDoc] = useState('')
  const { w, h } = PAGE_PX[pageSize]

  useEffect(() => {
    const body = marked.parse(markdown || '') as string
    setSrcDoc(buildHtml(body, font, marginMm))
  }, [markdown, font, pageSize, marginMm])

  return (
    <div className="h-full overflow-auto bg-muted/40 flex justify-center py-6">
      <div
        className="shadow-lg bg-white"
        style={{ width: w, minHeight: h, flexShrink: 0 }}
      >
        <iframe
          srcDoc={srcDoc}
          style={{ width: w, height: h, border: 'none', display: 'block' }}
          sandbox="allow-same-origin"
          title="PDF Preview"
        />
      </div>
    </div>
  )
}

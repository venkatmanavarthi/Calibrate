import { useEffect, useState } from 'react'
import { marked } from 'marked'

interface PdfPreviewProps {
  markdown: string
  font: string
  pageSize: 'Letter' | 'A4' | 'Tabloid'
  marginMm: number
  fontSize?: number
  textAlign?: string
  lineHeight?: number
  paddingTopMm?: number
  paddingRightMm?: number
  paddingBottomMm?: number
  paddingLeftMm?: number
  zoom?: number
}

// Page dimensions in px at 96dpi
const PAGE_PX = { Letter: { w: 816, h: 1056 }, A4: { w: 794, h: 1123 }, Tabloid: { w: 1056, h: 1632 } }

function buildHtml(
  body: string,
  font: string,
  marginMm: number,
  fontSize = 11,
  textAlign = 'left',
  lineHeight = 1.5,
  paddingTopMm?: number,
  paddingRightMm?: number,
  paddingBottomMm?: number,
  paddingLeftMm?: number,
): string {
  const fontStack = `'${font}', Georgia, 'Times New Roman', serif`
  const top = paddingTopMm ?? marginMm
  const right = paddingRightMm ?? marginMm
  const bottom = paddingBottomMm ?? marginMm
  const left = paddingLeftMm ?? marginMm
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Resume</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: white; }
  body {
    font-family: ${fontStack};
    font-size: ${fontSize}pt;
    line-height: ${lineHeight};
    text-align: ${textAlign};
    color: #111;
    padding: ${top}mm ${right}mm ${bottom}mm ${left}mm;
    overflow-wrap: break-word;
  }
  h1 { font-size: 1.636em; margin: 0 0 4pt; }
  h2 { font-size: 1.182em; border-bottom: 1px solid #aaa; margin: 12pt 0 4pt; padding-bottom: 2pt; }
  h3 { font-size: 1em; margin: 8pt 0 2pt; }
  p { margin: 0 0 6pt; overflow-wrap: break-word; }
  ul { margin: 2pt 0 6pt; padding-left: 18pt; }
  li { margin-bottom: 2pt; overflow-wrap: break-word; }
  a { color: #111; text-decoration: none; }
  strong { font-weight: bold; }
  pre, code { white-space: pre-wrap; overflow-wrap: break-word; font-family: inherit; font-size: inherit; }
</style>
</head>
<body>${body}</body>
</html>`
}

export default function PdfPreview({
  markdown, font, pageSize, marginMm,
  fontSize = 11, textAlign = 'left', lineHeight = 1.5,
  paddingTopMm, paddingRightMm, paddingBottomMm, paddingLeftMm,
  zoom = 1,
}: PdfPreviewProps) {
  const [srcDoc, setSrcDoc] = useState('')
  const { w, h } = PAGE_PX[pageSize]

  useEffect(() => {
    const body = marked.parse(markdown || '') as string
    setSrcDoc(buildHtml(body, font, marginMm, fontSize, textAlign, lineHeight, paddingTopMm, paddingRightMm, paddingBottomMm, paddingLeftMm))
  }, [markdown, font, pageSize, marginMm, fontSize, textAlign, lineHeight, paddingTopMm, paddingRightMm, paddingBottomMm, paddingLeftMm])

  return (
    <div className="h-full overflow-auto bg-muted/40 flex justify-center py-6">
      <div style={{ width: w * zoom, height: h * zoom, flexShrink: 0 }}>
        <div
          className="shadow-lg bg-white"
          style={{ width: w, height: h, transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        >
          <iframe
            srcDoc={srcDoc}
            style={{ width: w, height: h, border: 'none', display: 'block' }}
            sandbox="allow-same-origin"
            title="PDF Preview"
          />
        </div>
      </div>
    </div>
  )
}

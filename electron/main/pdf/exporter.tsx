import fs from 'fs'
import React from 'react'
import type { PdfExportRequest } from '../../../src/types/models'

const FONT_MAP: Record<string, string> = {
  'Georgia': 'Times-Roman',
  'Garamond': 'Times-Roman',
  'Times New Roman': 'Times-Roman',
  'Arial': 'Helvetica',
  'Calibri': 'Helvetica',
  'Helvetica': 'Helvetica',
}

function mmToPt(mm: number): number {
  return (mm * 72) / 25.4
}

export async function exportMarkdownAsPdf(markdownText: string, destFilePath: string, pageSize: 'Letter' | 'A4' | 'Tabloid'): Promise<void> {
  const { renderToBuffer, Document, Page, Text, View } = await import('@react-pdf/renderer')
  const pdfPageSize = pageSize === 'Letter' ? 'LETTER' : pageSize === 'Tabloid' ? 'TABLOID' : 'A4'
  const buffer = await renderToBuffer(
    React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: pdfPageSize, style: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' } },
        React.createElement(View, null, React.createElement(Text, null, markdownText))
      )
    ) as any
  )
  fs.writeFileSync(destFilePath, buffer)
}

function resumeDocumentToPlainText(req: PdfExportRequest): string {
  const doc = req.resumeDocument
  if (!doc) return req.markdownContent
  const lines: string[] = [doc.contact.name]
  const contact = [
    doc.contact.email,
    doc.contact.phone,
    doc.contact.location,
    doc.contact.linkedin,
    doc.contact.github,
    doc.contact.website
  ].filter(Boolean)
  if (contact.length) lines.push(contact.join(' | '))
  for (const section of doc.sections.filter((s) => !s.hidden)) {
    lines.push('', section.title.toUpperCase())
    if (section.text) lines.push(section.text)
    if (section.skills?.length) lines.push(section.skills.join(', '))
    for (const entry of section.entries ?? []) {
      lines.push([entry.left, entry.right].filter(Boolean).join(' | '))
      lines.push([entry.subleft, entry.subright].filter(Boolean).join(' | '))
      if (entry.body) lines.push(entry.body)
      for (const bullet of entry.bullets ?? []) lines.push(`- ${bullet}`)
    }
  }
  return lines.filter((line) => line != null).join('\n')
}

export async function exportToPdf(req: PdfExportRequest): Promise<void> {
  if (!req.resumeDocument) throw new Error('resumeDocument is required for export')
  const { renderToBuffer, Document, Page, Text, View } = await import('@react-pdf/renderer')

  const marginPt = mmToPt(req.marginMm)
  const fontSize = req.fontSize ?? 11
  const lineHeight = req.lineHeight ?? 1.4
  const pdfPageSize = req.pageSize === 'Letter' ? 'LETTER' : req.pageSize === 'Tabloid' ? 'TABLOID' : 'A4'
  const text = resumeDocumentToPlainText(req)

  const buffer = await renderToBuffer(
    React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        {
          size: pdfPageSize,
          style: {
            fontFamily: FONT_MAP[req.font] ?? 'Times-Roman',
            fontSize,
            lineHeight,
            paddingTop: req.paddingTopMm !== undefined ? mmToPt(req.paddingTopMm) : marginPt,
            paddingRight: req.paddingRightMm !== undefined ? mmToPt(req.paddingRightMm) : marginPt,
            paddingBottom: req.paddingBottomMm !== undefined ? mmToPt(req.paddingBottomMm) : marginPt,
            paddingLeft: req.paddingLeftMm !== undefined ? mmToPt(req.paddingLeftMm) : marginPt,
          }
        },
        React.createElement(View, null, React.createElement(Text, null, text))
      )
    ) as any
  )
  fs.writeFileSync(req.destFilePath, buffer)
}

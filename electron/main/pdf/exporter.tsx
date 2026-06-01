import fs from 'fs'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import type { PdfExportRequest } from '../../../src/types/models'
import { resumeDocumentToDocx } from './resume-document-to-docx'
import { convertDocxToPdf } from './libreoffice'

async function writeTmpDocxAndConvert(buf: Buffer, destFilePath: string): Promise<void> {
  const tmpId = randomUUID()
  const tmpDocx = path.join(os.tmpdir(), `${tmpId}.docx`)
  const tmpPdf = path.join(os.tmpdir(), `${tmpId}.pdf`)
  try {
    fs.writeFileSync(tmpDocx, buf)
    convertDocxToPdf(tmpDocx, os.tmpdir())
    fs.copyFileSync(tmpPdf, destFilePath)
  } finally {
    if (fs.existsSync(tmpDocx)) fs.unlinkSync(tmpDocx)
    if (fs.existsSync(tmpPdf)) fs.unlinkSync(tmpPdf)
  }
}

export async function exportMarkdownAsPdf(markdownText: string, destFilePath: string, pageSize: 'Letter' | 'A4' | 'Tabloid'): Promise<void> {
  const pageSizes = {
    Letter:  { width: 12240, height: 15840 },
    A4:      { width: 11906, height: 16838 },
    Tabloid: { width: 15840, height: 24480 },
  }
  const lines = markdownText.split('\n')
  const doc = new Document({
    sections: [{
      properties: { page: { size: pageSizes[pageSize] ?? pageSizes.Letter, margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      children: lines.map((line) => new Paragraph({ children: [new TextRun({ text: line, size: 20, font: 'Calibri' })] })),
    }],
  })
  const buf = await Packer.toBuffer(doc) as Buffer
  await writeTmpDocxAndConvert(buf, destFilePath)
}

export async function exportToPdf(req: PdfExportRequest): Promise<void> {
  if (!req.resumeDocument) throw new Error('resumeDocument is required for export')
  const buf = await resumeDocumentToDocx(req)
  await writeTmpDocxAndConvert(buf, req.destFilePath)
}

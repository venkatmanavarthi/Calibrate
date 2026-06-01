import fs from 'fs'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
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

export async function exportToPdf(req: PdfExportRequest): Promise<void> {
  if (!req.resumeDocument) throw new Error('resumeDocument is required for export')
  const buf = await resumeDocumentToDocx(req)
  await writeTmpDocxAndConvert(buf, req.destFilePath)
}

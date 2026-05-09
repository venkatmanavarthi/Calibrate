import fs from 'fs'
import { renderToBuffer } from '@react-pdf/renderer'
import type { PdfExportRequest } from '../../../src/types/models'
import { ResumeDocumentPdf } from '../../../src/components/pdf/ResumeDocumentPdf'

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

export async function exportToPdf(req: PdfExportRequest): Promise<void> {
  if (!req.resumeDocument) throw new Error('resumeDocument is required for export')

  const marginPt = mmToPt(req.marginMm)
  const fontSize = req.fontSize ?? 11
  const lineHeight = req.lineHeight ?? 1.4

  const buffer = await renderToBuffer(
    <ResumeDocumentPdf
      doc={req.resumeDocument}
      cfg={{
        font: FONT_MAP[req.font] ?? 'Times-Roman',
        fontSize,
        lineHeight,
        pageSize: req.pageSize === 'Letter' ? 'LETTER' : 'A4',
        marginPt,
        paddingTopPt: req.paddingTopMm !== undefined ? mmToPt(req.paddingTopMm) : marginPt,
        paddingRightPt: req.paddingRightMm !== undefined ? mmToPt(req.paddingRightMm) : marginPt,
        paddingBottomPt: req.paddingBottomMm !== undefined ? mmToPt(req.paddingBottomMm) : marginPt,
        paddingLeftPt: req.paddingLeftMm !== undefined ? mmToPt(req.paddingLeftMm) : marginPt,
      }}
    />
  )
  fs.writeFileSync(req.destFilePath, buffer)
}

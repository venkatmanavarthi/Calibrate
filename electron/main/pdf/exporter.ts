import { marked } from 'marked'
import type { PdfExportRequest } from '../../../src/types/models'
import { markdownToPdfmake } from './markdown-to-pdfmake'

const FONTS = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
  Times: {
    normal: 'Times-Roman',
    bold: 'Times-Bold',
    italics: 'Times-Italic',
    bolditalics: 'Times-BoldItalic',
  },
}

const FONT_MAP: Record<string, string> = {
  'Georgia': 'Times',
  'Garamond': 'Times',
  'Times New Roman': 'Times',
  'Arial': 'Helvetica',
  'Calibri': 'Helvetica',
  'Helvetica': 'Helvetica',
}

function mmToPt(mm: number): number {
  return (mm * 72) / 25.4
}

// Standard PDF font names that pdfkit resolves internally without loading files
const STANDARD_PDF_FONTS = new Set([
  'Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique',
  'Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic',
  'Courier', 'Courier-Bold', 'Courier-Oblique', 'Courier-BoldOblique',
  'Symbol', 'ZapfDingbats',
])

// Configure pdfmake singleton once at module load
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfmake = require('pdfmake')
pdfmake.addFonts(FONTS)
pdfmake.setUrlAccessPolicy(() => false)
// Allow only standard PDF font name resolution — no arbitrary local files
pdfmake.setLocalAccessPolicy((path: string) => STANDARD_PDF_FONTS.has(path))

export async function exportToPdf(req: PdfExportRequest): Promise<void> {
  console.log('[pdf:export] received:', { fontSize: req.fontSize, textAlign: req.textAlign, lineHeight: req.lineHeight, paddingTopMm: req.paddingTopMm, paddingRightMm: req.paddingRightMm, paddingBottomMm: req.paddingBottomMm, paddingLeftMm: req.paddingLeftMm })
  const bodyFont = FONT_MAP[req.font] ?? 'Times'
  const marginPt = mmToPt(req.marginMm)
  const topPt = req.paddingTopMm !== undefined ? mmToPt(req.paddingTopMm) : marginPt
  const rightPt = req.paddingRightMm !== undefined ? mmToPt(req.paddingRightMm) : marginPt
  const bottomPt = req.paddingBottomMm !== undefined ? mmToPt(req.paddingBottomMm) : marginPt
  const leftPt = req.paddingLeftMm !== undefined ? mmToPt(req.paddingLeftMm) : marginPt
  const pageWidthPt = req.pageSize === 'Letter' ? 612 : 595
  const usableWidth = pageWidthPt - leftPt - rightPt
  const fontSize = req.fontSize ?? 11
  const lineHeight = req.lineHeight ?? 1.4
  const alignment = req.textAlign ?? 'left'

  const tokens = Array.from(marked.lexer(req.markdownContent))
  const content = markdownToPdfmake(tokens, usableWidth)

  const docDef = {
    pageSize: req.pageSize,
    pageMargins: [leftPt, topPt, rightPt, bottomPt],
    info: { title: 'Resume', language: 'en' },
    defaultStyle: { font: bodyFont, fontSize, lineHeight, alignment },
    styles: {
      h1: {
        font: bodyFont,
        fontSize: Math.round(fontSize * 1.64),
        bold: true,
        margin: [0, 0, 0, 3],
      },
      h2: {
        font: bodyFont,
        fontSize: Math.round(fontSize * 1.18),
        bold: true,
        margin: [0, 10, 0, 0],
      },
      h3: {
        font: bodyFont,
        fontSize,
        bold: true,
        margin: [0, 6, 0, 1],
      },
      paragraph: {
        font: bodyFont,
        fontSize,
        lineHeight,
        margin: [0, 0, 0, 4],
      },
      list: {
        font: bodyFont,
        fontSize,
        lineHeight,
      },
    },
    content,
  }

  const doc = pdfmake.createPdf(docDef)
  await doc.write(req.destFilePath)
}

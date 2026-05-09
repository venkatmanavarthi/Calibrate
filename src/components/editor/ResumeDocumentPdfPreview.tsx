import { usePDF } from '@react-pdf/renderer'
import { ResumeDocumentPdf } from '@/components/pdf/ResumeDocumentPdf'
import type { ResumeDocument } from '@/types/resume-document'

interface Props {
  doc: ResumeDocument
  font: string
  pageSize: 'Letter' | 'A4'
  marginMm: number
  fontSize?: number
  lineHeight?: number
  paddingTopMm?: number
  paddingRightMm?: number
  paddingBottomMm?: number
  paddingLeftMm?: number
  zoom?: number
}

const FONT_MAP: Record<string, string> = {
  'Georgia': 'Times-Roman',
  'Garamond': 'Times-Roman',
  'Times New Roman': 'Times-Roman',
  'Arial': 'Helvetica',
  'Calibri': 'Helvetica',
  'Helvetica': 'Helvetica',
}

const PAGE_PX = { Letter: { w: 816, h: 1056 }, A4: { w: 794, h: 1123 } }

function mmToPt(mm: number): number {
  return (mm * 72) / 25.4
}

export default function ResumeDocumentPdfPreview({
  doc, font, pageSize, marginMm,
  fontSize = 11, lineHeight = 1.4,
  paddingTopMm, paddingRightMm, paddingBottomMm, paddingLeftMm,
  zoom = 1,
}: Props) {
  const marginPt = mmToPt(marginMm)
  const cfg = {
    font: FONT_MAP[font] ?? 'Times-Roman',
    fontSize,
    lineHeight,
    pageSize: (pageSize === 'Letter' ? 'LETTER' : 'A4') as 'LETTER' | 'A4',
    marginPt,
    paddingTopPt: paddingTopMm !== undefined ? mmToPt(paddingTopMm) : marginPt,
    paddingRightPt: paddingRightMm !== undefined ? mmToPt(paddingRightMm) : marginPt,
    paddingBottomPt: paddingBottomMm !== undefined ? mmToPt(paddingBottomMm) : marginPt,
    paddingLeftPt: paddingLeftMm !== undefined ? mmToPt(paddingLeftMm) : marginPt,
  }

  const [instance] = usePDF({ document: <ResumeDocumentPdf doc={doc} cfg={cfg} /> })

  const { w, h } = PAGE_PX[pageSize]

  if (instance.error) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        Failed to render PDF preview.
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-muted/40 flex justify-center py-6">
      <div style={{ width: w * zoom, height: h * zoom, flexShrink: 0 }}>
        <div
          className="shadow-lg"
          style={{ width: w, height: h, transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        >
          {instance.loading || !instance.url ? (
            <div
              className="bg-white flex items-center justify-center text-sm text-muted-foreground"
              style={{ width: w, height: h }}
            >
              Rendering…
            </div>
          ) : (
            <iframe
              key={instance.url}
              src={instance.url}
              style={{ width: w, height: h, border: 'none', display: 'block' }}
              title="PDF Preview"
            />
          )}
        </div>
      </div>
    </div>
  )
}

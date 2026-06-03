import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  LevelFormat, BorderStyle, TabStopType,
  ExternalHyperlink,
} from 'docx'
import type { PdfExportRequest } from '../../../src/types/models'
import type { ResumeDocument, ResumeDocumentSection } from '../../../src/types/resume-document'

const FONT = 'Calibri'

export interface DocxTemplate {
  id: string
  label: string
  margin: { top: number; right: number; bottom: number; left: number }
  sizes: { name: number; sectionHeader: number; body: number; entry: number }
  sectionHeader: {
    bold: boolean
    uppercase: boolean
    color: string
    border: boolean
    spacingBefore: number
    spacingAfter: number
  }
  linkColor: string
}

export const DOCX_TEMPLATES: DocxTemplate[] = [
  {
    id: 'classic',
    label: 'Classic',
    margin: { top: 720, right: 720, bottom: 720, left: 720 },
    sizes: { name: 36, sectionHeader: 24, body: 20, entry: 22 },
    sectionHeader: { bold: true, uppercase: true, color: '000000', border: true, spacingBefore: 240, spacingAfter: 80 },
    linkColor: '0563C1',
  },
  {
    id: 'modern',
    label: 'Modern',
    margin: { top: 720, right: 720, bottom: 720, left: 720 },
    sizes: { name: 36, sectionHeader: 22, body: 20, entry: 22 },
    sectionHeader: { bold: true, uppercase: true, color: '1F4E79', border: false, spacingBefore: 300, spacingAfter: 100 },
    linkColor: '1F4E79',
  },
  {
    id: 'compact',
    label: 'Compact',
    margin: { top: 576, right: 576, bottom: 576, left: 576 },
    sizes: { name: 32, sectionHeader: 22, body: 19, entry: 21 },
    sectionHeader: { bold: true, uppercase: true, color: '000000', border: true, spacingBefore: 160, spacingAfter: 60 },
    linkColor: '0563C1',
  },
]

function getTemplate(id: string): DocxTemplate {
  return DOCX_TEMPLATES.find((t) => t.id === id) ?? DOCX_TEMPLATES[0]
}

// Letter page size in twips
const PAGE_SIZE = { width: 12240, height: 15840 }

function textRun(text: string, size: number): TextRun[] {
  return [new TextRun({ text, size, font: FONT })]
}

function sectionHeader(text: string, t: DocxTemplate): Paragraph {
  const label = t.sectionHeader.uppercase ? text.toUpperCase() : text
  return new Paragraph({
    spacing: { before: t.sectionHeader.spacingBefore, after: t.sectionHeader.spacingAfter },
    border: t.sectionHeader.border
      ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 2 } }
      : {},
    children: [new TextRun({
      text: label,
      bold: t.sectionHeader.bold,
      size: t.sizes.sectionHeader,
      font: FONT,
      color: t.sectionHeader.color,
    })],
  })
}

function bullet(text: string, t: DocxTemplate): Paragraph {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 60 },
    children: textRun(text, t.sizes.body),
  })
}

function titleRightDate(left: string, right: string, t: DocxTemplate, contentWidth: number): Paragraph {
  return new Paragraph({
    spacing: { before: 120, after: 40 },
    tabStops: [{ type: TabStopType.RIGHT, position: contentWidth }],
    children: [
      new TextRun({ text: left, bold: true, size: t.sizes.entry, font: FONT }),
      new TextRun({ text: '\t' + right, size: t.sizes.entry, font: FONT, italics: true }),
    ],
  })
}

function subRoleLine(left: string, right: string | undefined, t: DocxTemplate, contentWidth: number): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    tabStops: [{ type: TabStopType.RIGHT, position: contentWidth }],
    children: [
      new TextRun({ text: left, italics: true, size: t.sizes.entry, font: FONT }),
      ...(right ? [new TextRun({ text: '\t' + right, italics: true, size: t.sizes.entry, font: FONT })] : []),
    ],
  })
}

function skillLine(label: string, value: string, t: DocxTemplate): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 40 },
    children: [
      new TextRun({ text: label + ': ', bold: true, size: t.sizes.body, font: FONT }),
      ...textRun(value, t.sizes.body),
    ],
  })
}

function buildContactParagraphs(doc: ResumeDocument, t: DocxTemplate): Paragraph[] {
  const paras: Paragraph[] = []

  paras.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    children: [new TextRun({ text: doc.contact.name, bold: true, size: t.sizes.name, font: FONT })],
  }))

  if (doc.contact.title) {
    paras.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: doc.contact.title, size: 24, font: FONT })],
    }))
  }

  const plainContact = [doc.contact.email, doc.contact.phone]
    .filter(Boolean) as string[]
  if (plainContact.length) {
    paras.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: plainContact.join(' | '), size: t.sizes.body, font: FONT })],
    }))
  }

  const linkItems: Array<{ label: string; url: string }> = []
  if (doc.contact.linkedin) linkItems.push({ label: doc.contact.linkedin.replace(/^https?:\/\//, ''), url: doc.contact.linkedin.startsWith('http') ? doc.contact.linkedin : `https://${doc.contact.linkedin}` })
  if (doc.contact.github) linkItems.push({ label: doc.contact.github.replace(/^https?:\/\//, ''), url: doc.contact.github.startsWith('http') ? doc.contact.github : `https://${doc.contact.github}` })
  if (doc.contact.website) linkItems.push({ label: doc.contact.website.replace(/^https?:\/\//, ''), url: doc.contact.website.startsWith('http') ? doc.contact.website : `https://${doc.contact.website}` })

  if (linkItems.length) {
    const children: (TextRun | ExternalHyperlink)[] = []
    linkItems.forEach((item, i) => {
      children.push(new ExternalHyperlink({
        link: item.url,
        children: [new TextRun({ text: item.label, size: t.sizes.body, font: FONT, color: t.linkColor, underline: {} })],
      }))
      if (i < linkItems.length - 1) children.push(new TextRun({ text: ' | ', size: t.sizes.body, font: FONT }))
    })
    paras.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children,
    }))
  }

  return paras
}

function buildSection(section: ResumeDocumentSection, t: DocxTemplate, contentWidth: number): Paragraph[] {
  const paras: Paragraph[] = [sectionHeader(section.title, t)]

  if (section.layout === 'summary' && section.text) {
    paras.push(new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 80 },
      children: textRun(section.text, t.sizes.body),
    }))
  }

  if (section.layout === 'skills' && section.skills?.length) {
    for (const skill of section.skills) {
      const colonIdx = skill.indexOf(': ')
      if (colonIdx !== -1) {
        paras.push(skillLine(skill.slice(0, colonIdx), skill.slice(colonIdx + 2), t))
      } else {
        paras.push(new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 40 },
          children: textRun(skill, t.sizes.body),
        }))
      }
    }
  }

  if (section.layout === 'entries' && section.entries?.length) {
    for (const entry of section.entries) {
      paras.push(titleRightDate(entry.left, entry.right ?? '', t, contentWidth))
      if (entry.subleft || entry.subright) paras.push(subRoleLine(entry.subleft ?? '', entry.subright, t, contentWidth))
      if (entry.body) {
        paras.push(new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 60 },
          children: textRun(entry.body, t.sizes.body),
        }))
      }
      for (const b of entry.bullets ?? []) paras.push(bullet(b, t))
    }
  }

  return paras
}

export async function resumeDocumentToDocx(req: PdfExportRequest): Promise<Buffer> {
  const doc = req.resumeDocument!
  const t = getTemplate(req.templateId)
  const contentWidth = PAGE_SIZE.width - t.margin.left - t.margin.right

  const children: Paragraph[] = [
    ...buildContactParagraphs(doc, t),
    ...doc.sections
      .filter((s) => !s.hidden)
      .flatMap((s) => buildSection(s, t, contentWidth)),
  ]

  const document = new Document({
    styles: {
      default: { document: { run: { font: FONT, size: t.sizes.body } } },
    },
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 200 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: PAGE_SIZE,
            margin: t.margin,
          },
        },
        children,
      },
    ],
  })

  return Packer.toBuffer(document) as Promise<Buffer>
}

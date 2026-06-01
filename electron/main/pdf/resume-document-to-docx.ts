import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  LevelFormat, BorderStyle, TabStopType,
  ExternalHyperlink,
} from 'docx'
import type { PdfExportRequest } from '../../../src/types/models'
import type { ResumeDocument, ResumeDocumentSection } from '../../../src/types/resume-document'

function textRun(text: string, size: number, font: string): TextRun[] {
  return [new TextRun({ text, size, font })]
}

// Page sizes in twips
const PAGE_SIZES = {
  Letter:  { width: 12240, height: 15840 },
}

function sectionHeader(text: string, font: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 2 } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 24, font })],
  })
}

function bullet(text: string, font: string): Paragraph {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 60 },
    children: textRun(text, 20, font),
  })
}

function titleRightDate(left: string, right: string, font: string, contentWidth: number): Paragraph {
  return new Paragraph({
    spacing: { before: 120, after: 40 },
    tabStops: [{ type: TabStopType.RIGHT, position: contentWidth }],
    children: [
      new TextRun({ text: left, bold: true, size: 22, font }),
      new TextRun({ text: '\t' + right, size: 22, font, italics: true }),
    ],
  })
}

function subRoleLine(left: string, right: string | undefined, font: string, contentWidth: number): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    tabStops: [{ type: TabStopType.RIGHT, position: contentWidth }],
    children: [
      new TextRun({ text: left, italics: true, size: 22, font }),
      ...(right ? [new TextRun({ text: '\t' + right, italics: true, size: 22, font })] : []),
    ],
  })
}

function skillLine(label: string, value: string, font: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 40 },
    children: [
      new TextRun({ text: label + ': ', bold: true, size: 20, font }),
      ...textRun(value, 20, font),
    ],
  })
}

function buildContactParagraphs(doc: ResumeDocument, font: string): Paragraph[] {
  const paras: Paragraph[] = []

  paras.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    children: [new TextRun({ text: doc.contact.name, bold: true, size: 36, font })],
  }))

  if (doc.contact.title) {
    paras.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: doc.contact.title, size: 24, font })],
    }))
  }

  const plainContact = [doc.contact.email, doc.contact.phone, doc.contact.location]
    .filter(Boolean) as string[]
  if (plainContact.length) {
    paras.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: plainContact.join(' | '), size: 20, font })],
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
        children: [new TextRun({ text: item.label, size: 20, font, color: '0563C1', underline: {} })],
      }))
      if (i < linkItems.length - 1) children.push(new TextRun({ text: ' | ', size: 20, font }))
    })
    paras.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children,
    }))
  }

  return paras
}

function buildSection(section: ResumeDocumentSection, font: string, contentWidth: number): Paragraph[] {
  const paras: Paragraph[] = [sectionHeader(section.title, font)]

  if (section.layout === 'summary' && section.text) {
    paras.push(new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 80 },
      children: textRun(section.text, 20, font),
    }))
  }

  if (section.layout === 'skills' && section.skills?.length) {
    for (const skill of section.skills) {
      const colonIdx = skill.indexOf(': ')
      if (colonIdx !== -1) {
        paras.push(skillLine(skill.slice(0, colonIdx), skill.slice(colonIdx + 2), font))
      } else {
        paras.push(new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 40 },
          children: textRun(skill, 20, font),
        }))
      }
    }
  }

  if (section.layout === 'entries' && section.entries?.length) {
    for (const entry of section.entries) {
      paras.push(titleRightDate(entry.left, entry.right ?? '', font, contentWidth))
      if (entry.subleft || entry.subright) paras.push(subRoleLine(entry.subleft ?? '', entry.subright, font, contentWidth))
      if (entry.body) {
        paras.push(new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 60 },
          children: textRun(entry.body, 20, font),
        }))
      }
      for (const b of entry.bullets ?? []) paras.push(bullet(b, font))
    }
  }

  return paras
}

export async function resumeDocumentToDocx(req: PdfExportRequest): Promise<Buffer> {
  const doc = req.resumeDocument!
  const font = 'Calibri'

  const marginTop = 720
  const marginRight = 720
  const marginBottom = 720
  const marginLeft = 720

  const pageSize = PAGE_SIZES.Letter
  const contentWidth = pageSize.width - marginLeft - marginRight

  const children: Paragraph[] = [
    ...buildContactParagraphs(doc, font),
    ...doc.sections
      .filter((s) => !s.hidden)
      .flatMap((s) => buildSection(s, font, contentWidth)),
  ]

  const document = new Document({
    styles: {
      default: { document: { run: { font, size: 20 } } },
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
            size: pageSize,
            margin: { top: marginTop, right: marginRight, bottom: marginBottom, left: marginLeft },
          },
        },
        children,
      },
    ],
  })

  return Packer.toBuffer(document) as Promise<Buffer>
}

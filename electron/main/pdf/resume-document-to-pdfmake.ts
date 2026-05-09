import type { ResumeDocument, ResumeDocumentSection } from '../../../src/types/resume-document'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfContent = any

interface FontStyles {
  bodyFont: string
  fontSize: number
  lineHeight: number
  alignment: string
}

function contactLinkRun(value: string): PdfContent {
  if (value.startsWith('mailto:') || value.includes('@')) {
    const href = value.startsWith('mailto:') ? value : `mailto:${value}`
    return { text: value.replace(/^mailto:/, ''), link: href, color: '#111111', decoration: undefined }
  }
  if (value.startsWith('tel:') || /^\+?[\d\s\-().]{7,}$/.test(value)) {
    const href = value.startsWith('tel:') ? value : `tel:${value.replace(/\s/g, '')}`
    return { text: value.replace(/^tel:/, ''), link: href, color: '#111111', decoration: undefined }
  }
  const href = /^https?:\/\//i.test(value) ? value : `https://${value}`
  return { text: value, link: href, color: '#111111', decoration: undefined }
}

function renderContactLine(parts: string[], _styles: FontStyles): PdfContent {
  if (!parts.length) return null
  const separator = { text: '  |  ', color: '#555555' }
  const runs: PdfContent[] = []
  parts.forEach((p, i) => {
    runs.push(contactLinkRun(p))
    if (i < parts.length - 1) runs.push(separator)
  })
  return {
    text: runs,
    style: 'contactLine',
    alignment: 'center',
    margin: [0, 0, 0, 2],
  }
}

function renderSection(section: ResumeDocumentSection, usableWidth: number, styles: FontStyles): PdfContent[] {
  const blocks: PdfContent[] = []

  blocks.push({
    text: section.title.toUpperCase(),
    style: 'sectionHeading',
  })
  blocks.push({
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: usableWidth, y2: 0, lineWidth: 0.5, lineColor: '#aaaaaa' }],
    margin: [0, 1, 0, 4],
  })

  if (section.layout === 'summary' && section.text) {
    blocks.push({ text: section.text, style: 'paragraph' })
  } else if (section.layout === 'skills' && section.skills?.length) {
    blocks.push({ text: section.skills.join('  ·  '), style: 'paragraph' })
  } else if (section.layout === 'entries' && section.entries?.length) {
    for (const entry of section.entries) {
      if (entry.right) {
        blocks.push({
          columns: [
            { text: entry.left, style: 'entryTitle', width: '*' },
            { text: entry.right, style: 'entryMeta', width: 'auto', alignment: 'right' },
          ],
          margin: [0, 4, 0, 0],
        })
      } else {
        blocks.push({ text: entry.left, style: 'entryTitle', margin: [0, 4, 0, 0] })
      }

      if (entry.subleft || entry.subright) {
        if (entry.subright) {
          blocks.push({
            columns: [
              { text: entry.subleft ?? '', style: 'entrySubtitle', width: '*' },
              { text: entry.subright, style: 'entryMeta', width: 'auto', alignment: 'right' },
            ],
            margin: [0, 1, 0, 0],
          })
        } else {
          blocks.push({ text: entry.subleft ?? '', style: 'entrySubtitle', margin: [0, 1, 0, 0] })
        }
      }

      if (entry.body) {
        blocks.push({ text: entry.body, style: 'paragraph', margin: [0, 2, 0, 0] })
      }

      if (entry.bullets?.length) {
        blocks.push({
          ul: entry.bullets.map(b => ({ text: b, margin: [0, 0, 0, 1] })),
          style: 'list',
          margin: [0, 2, 0, 4],
        })
      }
    }
  }

  return blocks
}

export function resumeDocumentToPdfmake(
  doc: ResumeDocument,
  usableWidth: number,
  styles: FontStyles,
): PdfContent[] {
  const content: PdfContent[] = []

  content.push({
    text: doc.contact.name,
    style: 'name',
    alignment: 'center',
  })

  const contactParts: string[] = []
  if (doc.contact.email) contactParts.push(doc.contact.email)
  if (doc.contact.phone) contactParts.push(doc.contact.phone)
  if (doc.contact.location) contactParts.push(doc.contact.location)
  if (doc.contact.linkedin) contactParts.push(doc.contact.linkedin)
  if (doc.contact.github) contactParts.push(doc.contact.github)
  if (doc.contact.website) contactParts.push(doc.contact.website)

  const contactLine = renderContactLine(contactParts, styles)
  if (contactLine) content.push(contactLine)

  for (const section of doc.sections) {
    content.push(...renderSection(section, usableWidth, styles))
  }

  return content
}

export function buildResumeDocumentStyles(bodyFont: string, fontSize: number, lineHeight: number) {
  return {
    name: {
      font: bodyFont,
      fontSize: Math.round(fontSize * 1.8),
      bold: true,
      margin: [0, 0, 0, 2],
    },
    contactLine: {
      font: bodyFont,
      fontSize: Math.round(fontSize * 0.9),
      color: '#444444',
    },
    sectionHeading: {
      font: bodyFont,
      fontSize: Math.round(fontSize * 1.0),
      bold: true,
      margin: [0, 10, 0, 0],
      color: '#222222',
    },
    entryTitle: {
      font: bodyFont,
      fontSize,
      bold: true,
    },
    entrySubtitle: {
      font: bodyFont,
      fontSize,
      italics: true,
    },
    entryMeta: {
      font: bodyFont,
      fontSize: Math.round(fontSize * 0.9),
      color: '#555555',
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
  }
}

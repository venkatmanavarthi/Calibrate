import type { ResumeDocument, ResumeDocumentSection } from '../types/resume-document'

function renderSection(section: ResumeDocumentSection): string {
  if (section.hidden) return ''

  const lines: string[] = [section.title]

  if (section.layout === 'summary' && section.text) {
    lines.push(section.text)
  }

  if (section.layout === 'skills') {
    lines.push(...(section.skills ?? []))
  }

  if (section.layout === 'entries') {
    for (const entry of section.entries ?? []) {
      const header = [entry.left, entry.right].filter(Boolean).join(' | ')
      const subheader = [entry.subleft, entry.subright].filter(Boolean).join(' | ')
      if (header) lines.push(header)
      if (subheader) lines.push(subheader)
      if (entry.body) lines.push(entry.body)
      for (const bullet of entry.bullets ?? []) lines.push(`- ${bullet}`)
    }
  }

  return lines.filter(Boolean).join('\n')
}

export function resumeDocumentToText(doc: ResumeDocument): string {
  const contact = [
    doc.contact.name,
    doc.contact.title,
    doc.contact.email,
    doc.contact.phone,
    doc.contact.location,
    doc.contact.linkedin,
    doc.contact.github,
    doc.contact.website,
  ].filter(Boolean).join('\n')

  const sections = doc.sections
    .map(renderSection)
    .filter(Boolean)
    .join('\n\n')

  return [contact, sections].filter(Boolean).join('\n\n')
}

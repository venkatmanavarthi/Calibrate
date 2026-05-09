import type { ResumeDocument, ResumeDocumentSection } from '../types/resume-document'

function renderSection(section: ResumeDocumentSection): string {
  const lines: string[] = []
  lines.push(`## ${section.title}`)

  if (section.layout === 'summary' && section.text) {
    lines.push('')
    lines.push(section.text)
  } else if (section.layout === 'skills' && section.skills?.length) {
    lines.push('')
    lines.push(section.skills.join(', '))
  } else if (section.layout === 'entries' && section.entries?.length) {
    for (const entry of section.entries) {
      lines.push('')
      const headerRight = entry.right ? `<span style="float:right">${entry.right}</span>` : ''
      lines.push(`### ${entry.left}${headerRight ? ' ' + headerRight : ''}`)

      if (entry.subleft || entry.subright) {
        const sub = entry.subleft ?? ''
        const subRight = entry.subright ? `<span style="float:right">${entry.subright}</span>` : ''
        if (sub || subRight) lines.push(`${sub}${subRight ? ' ' + subRight : ''}`)
      }

      if (entry.body) { lines.push(''); lines.push(entry.body) }
      if (entry.bullets?.length) {
        for (const bullet of entry.bullets) lines.push(`- ${bullet}`)
      }
    }
  }

  return lines.join('\n')
}

export function resumeDocumentToMarkdown(doc: ResumeDocument): string {
  const lines: string[] = []
  lines.push(`# ${doc.contact.name}`)
  lines.push('')

  const contactParts: string[] = []
  if (doc.contact.email) contactParts.push(doc.contact.email)
  if (doc.contact.phone) contactParts.push(doc.contact.phone)
  if (doc.contact.location) contactParts.push(doc.contact.location)
  if (doc.contact.linkedin) contactParts.push(doc.contact.linkedin)
  if (doc.contact.github) contactParts.push(doc.contact.github)
  if (doc.contact.website) contactParts.push(doc.contact.website)

  if (contactParts.length) { lines.push(contactParts.join(' | ')); lines.push('') }

  for (const section of doc.sections) { lines.push(renderSection(section)); lines.push('') }

  return lines.join('\n').trimEnd()
}

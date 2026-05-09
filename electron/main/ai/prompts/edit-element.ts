import type { ResumeDocument, ResumeDocumentContact, SelectionTarget } from '../../../../src/types/resume-document'
import type { Message } from '../types'

function extractElementText(doc: ResumeDocument, target: SelectionTarget): string {
  switch (target.type) {
    case 'contact':
      return String(doc.contact[target.field as keyof ResumeDocumentContact] ?? '')
    case 'summary':
      return doc.sections[target.sectionIndex]?.text ?? ''
    case 'section':
      return doc.sections[target.sectionIndex]?.title ?? ''
    case 'skills':
      return (doc.sections[target.sectionIndex]?.skills ?? []).join(', ')
    case 'entry': {
      const e = doc.sections[target.sectionIndex]?.entries?.[target.entryIndex]
      return e ? `${e.left}${e.right ? ` | ${e.right}` : ''}` : ''
    }
    case 'bullet':
      return doc.sections[target.sectionIndex]?.entries?.[target.entryIndex]?.bullets?.[target.bulletIndex] ?? ''
    case 'skill':
      return doc.sections[target.sectionIndex]?.skills?.[target.skillIndex] ?? ''
  }
}

function describeTarget(doc: ResumeDocument, target: SelectionTarget): string {
  const text = extractElementText(doc, target)
  switch (target.type) {
    case 'contact': return `the "${target.field}" contact field (current value: "${text}")`
    case 'summary': return `the professional summary`
    case 'section': return `the section title "${text}"`
    case 'skills': return `the entire skills section`
    case 'entry': return `the entry "${text}"`
    case 'bullet': return `the bullet point: "${text}"`
    case 'skill': return `the skill tag "${text}"`
  }
}

export function buildEditElementMessages(
  doc: ResumeDocument,
  target: SelectionTarget,
  instruction: string | undefined
): Message[] {
  const task = instruction
    ? `The user's instruction: "${instruction}"`
    : 'Rewrite to be more impactful, specific, and achievement-oriented. Use strong action verbs and quantify where possible.'

  const system = `You are a professional resume editor. You will receive a resume as JSON and edit one specific element.
Return ONLY the complete updated resume as valid JSON matching the exact same schema. Do not wrap in code fences. Make changes ONLY to the specified element unless the instruction explicitly asks otherwise.`

  const user = `Current resume JSON:
${JSON.stringify(doc, null, 2)}

Edit ${describeTarget(doc, target)}.
${task}

Return the full updated resume JSON.`

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

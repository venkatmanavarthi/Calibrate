export interface ResumeDocumentContact {
  name: string
  email?: string
  phone?: string
  location?: string
  linkedin?: string
  github?: string
  website?: string
}

export interface ResumeDocumentEntry {
  left: string
  right?: string
  subleft?: string
  subright?: string
  bullets?: string[]
  body?: string
}

export type ResumeSectionLayout = 'entries' | 'skills' | 'summary'

export interface ResumeDocumentSection {
  title: string
  layout: ResumeSectionLayout
  entries?: ResumeDocumentEntry[]
  text?: string
  skills?: string[]
  hidden?: boolean
}

export interface ResumeDocumentMetadata {
  primaryColor?: string
  metaColor?: string
  accentColor?: string
  font?: string
  fontSize?: number
  lineHeight?: number
}

export interface ResumeDocument {
  contact: ResumeDocumentContact
  sections: ResumeDocumentSection[]
  metadata?: ResumeDocumentMetadata
}

export type SelectionTarget =
  | { type: 'contact'; field: string }
  | { type: 'summary'; sectionIndex: number }
  | { type: 'skills'; sectionIndex: number }
  | { type: 'section'; sectionIndex: number }
  | { type: 'entry'; sectionIndex: number; entryIndex: number }
  | { type: 'bullet'; sectionIndex: number; entryIndex: number; bulletIndex: number }
  | { type: 'skill'; sectionIndex: number; skillIndex: number }

export function selectionTargetKey(t: SelectionTarget): string {
  return JSON.stringify(t)
}

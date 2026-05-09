import { useRef } from 'react'
import type { ResumeDocument, ResumeDocumentEntry, ResumeDocumentSection, SelectionTarget } from '@/types/resume-document'
export type { SelectionTarget } from '@/types/resume-document'

interface Props {
  doc: ResumeDocument
  selectedTarget?: SelectionTarget | null
  editingTarget?: SelectionTarget | null
  onSelect?: (target: SelectionTarget | null, rect: DOMRect) => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const URL_FIELDS = new Set(['linkedin', 'github', 'website'])

function displayValue(field: string, value: string): string {
  return URL_FIELDS.has(field) ? value.replace(/^https?:\/\//i, '') : value
}

function matchesTarget(a: SelectionTarget | null | undefined, b: SelectionTarget): boolean {
  if (!a) return false
  return JSON.stringify(a) === JSON.stringify(b)
}

// ─── Shared element wrapper ───────────────────────────────────────────────────

interface ElementProps {
  target: SelectionTarget
  selected: boolean
  editing: boolean
  onSelect: ((target: SelectionTarget | null, rect: DOMRect) => void) | undefined
  children: React.ReactNode
  className?: string
  inline?: boolean
}

function SelectableElement({ target, selected, editing, onSelect, children, className = '', inline = false }: ElementProps) {
  const ref = useRef<HTMLDivElement & HTMLSpanElement>(null)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onSelect || !ref.current) return
    onSelect(target, ref.current.getBoundingClientRect())
  }

  const baseClass = `
    transition-all duration-150 rounded cursor-pointer
    ${selected ? 'ring-2 ring-primary/60 bg-primary/5' : 'hover:bg-primary/5 hover:ring-1 hover:ring-primary/20'}
    ${editing ? 'animate-glow' : ''}
    ${className}
  `

  if (inline) {
    return (
      <span ref={ref as React.RefObject<HTMLSpanElement>} className={baseClass} onClick={handleClick}>
        {children}
      </span>
    )
  }

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className={baseClass} onClick={handleClick}>
      {children}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ContactSection({ doc, selected, editing, onSelect }: {
  doc: ResumeDocument
  selected: SelectionTarget | null | undefined
  editing: SelectionTarget | null | undefined
  onSelect: ((target: SelectionTarget | null, rect: DOMRect) => void) | undefined
}) {
  const contactParts: { field: string; value: string }[] = []
  const { contact } = doc
  if (contact.email) contactParts.push({ field: 'email', value: contact.email })
  if (contact.phone) contactParts.push({ field: 'phone', value: contact.phone })
  if (contact.location) contactParts.push({ field: 'location', value: contact.location })
  if (contact.linkedin) contactParts.push({ field: 'linkedin', value: contact.linkedin })
  if (contact.github) contactParts.push({ field: 'github', value: contact.github })
  if (contact.website) contactParts.push({ field: 'website', value: contact.website })

  return (
    <div className="text-center mb-3">
      <SelectableElement
        target={{ type: 'contact', field: 'name' }}
        selected={matchesTarget(selected, { type: 'contact', field: 'name' })}
        editing={matchesTarget(editing, { type: 'contact', field: 'name' })}
        onSelect={onSelect}
        className="inline-block px-1 py-0.5"
        inline
      >
        <span className="text-2xl font-bold">{contact.name}</span>
      </SelectableElement>

      {contactParts.length > 0 && (
        <div className="flex flex-wrap justify-center gap-x-1 mt-1 text-xs text-muted-foreground">
          {contactParts.map(({ field, value }, i) => (
            <span key={field} className="flex items-center gap-x-1">
              <SelectableElement
                target={{ type: 'contact', field }}
                selected={matchesTarget(selected, { type: 'contact', field })}
                editing={matchesTarget(editing, { type: 'contact', field })}
                onSelect={onSelect}
                className="px-1 py-0.5"
                inline
              >
                {displayValue(field, value)}
              </SelectableElement>
              {i < contactParts.length - 1 && <span className="text-muted-foreground/40">|</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function BulletItem({ bullet, target, selected, editing, onSelect }: {
  bullet: string
  target: SelectionTarget & { type: 'bullet' }
  selected: boolean
  editing: boolean
  onSelect: ((target: SelectionTarget | null, rect: DOMRect) => void) | undefined
}) {
  return (
    <SelectableElement
      target={target}
      selected={selected}
      editing={editing}
      onSelect={onSelect}
      className="flex gap-2 px-1 py-0.5 ml-2"
    >
      <span className="mt-0.5 shrink-0 text-muted-foreground">•</span>
      <span className="text-sm leading-relaxed">{bullet}</span>
    </SelectableElement>
  )
}

function EntryBlock({ entry, sectionIndex, entryIndex, selected, editing, onSelect }: {
  entry: ResumeDocumentEntry
  sectionIndex: number
  entryIndex: number
  selected: SelectionTarget | null | undefined
  editing: SelectionTarget | null | undefined
  onSelect: ((target: SelectionTarget | null, rect: DOMRect) => void) | undefined
}) {
  const entryTarget: SelectionTarget = { type: 'entry', sectionIndex, entryIndex }

  return (
    <SelectableElement
      target={entryTarget}
      selected={matchesTarget(selected, entryTarget)}
      editing={matchesTarget(editing, entryTarget)}
      onSelect={onSelect}
      className="px-2 py-1.5 mt-2"
    >
      <div className="flex justify-between items-baseline gap-4">
        <span className="font-semibold text-sm">{entry.left}</span>
        {entry.right && <span className="text-xs text-muted-foreground shrink-0">{entry.right}</span>}
      </div>
      {(entry.subleft || entry.subright) && (
        <div className="flex justify-between items-baseline gap-4">
          {entry.subleft && <span className="text-sm italic text-muted-foreground">{entry.subleft}</span>}
          {entry.subright && <span className="text-xs text-muted-foreground shrink-0">{entry.subright}</span>}
        </div>
      )}
      {entry.body && <p className="text-sm mt-1 leading-relaxed">{entry.body}</p>}
      {entry.bullets?.map((bullet, bulletIndex) => (
        <BulletItem
          key={bulletIndex}
          bullet={bullet}
          target={{ type: 'bullet', sectionIndex, entryIndex, bulletIndex }}
          selected={matchesTarget(selected, { type: 'bullet', sectionIndex, entryIndex, bulletIndex })}
          editing={matchesTarget(editing, { type: 'bullet', sectionIndex, entryIndex, bulletIndex })}
          onSelect={onSelect}
        />
      ))}
    </SelectableElement>
  )
}

function SectionBlock({ section, sectionIndex, selected, editing, onSelect }: {
  section: ResumeDocumentSection
  sectionIndex: number
  selected: SelectionTarget | null | undefined
  editing: SelectionTarget | null | undefined
  onSelect: ((target: SelectionTarget | null, rect: DOMRect) => void) | undefined
}) {
  const sectionTarget: SelectionTarget = { type: 'section', sectionIndex }

  return (
    <div className="mt-5">
      <SelectableElement
        target={sectionTarget}
        selected={matchesTarget(selected, sectionTarget)}
        editing={matchesTarget(editing, sectionTarget)}
        onSelect={onSelect}
        className="px-1 py-0.5"
      >
        <h2 className="text-xs font-bold uppercase tracking-wider">{section.title}</h2>
      </SelectableElement>
      {section.layout !== 'summary' && <div className="border-b border-border mt-0.5 mb-1" />}

      {section.layout === 'summary' && section.text && (
        <SelectableElement
          target={{ type: 'summary', sectionIndex }}
          selected={matchesTarget(selected, { type: 'summary', sectionIndex })}
          editing={matchesTarget(editing, { type: 'summary', sectionIndex })}
          onSelect={onSelect}
          className="px-1 py-1"
        >
          <p className="text-sm leading-relaxed">{section.text}</p>
        </SelectableElement>
      )}

      {section.layout === 'skills' && section.skills && (
        <div className="flex flex-wrap gap-1.5 mt-1 px-1">
          {section.skills.map((skill, skillIndex) => (
            <SelectableElement
              key={skillIndex}
              target={{ type: 'skill', sectionIndex, skillIndex }}
              selected={matchesTarget(selected, { type: 'skill', sectionIndex, skillIndex })}
              editing={matchesTarget(editing, { type: 'skill', sectionIndex, skillIndex })}
              onSelect={onSelect}
              className="px-1.5 py-0.5"
              inline
            >
              <span className="text-xs">{skill}</span>
            </SelectableElement>
          ))}
        </div>
      )}

      {section.layout === 'entries' && section.entries?.map((entry, entryIndex) => (
        <EntryBlock
          key={entryIndex}
          entry={entry}
          sectionIndex={sectionIndex}
          entryIndex={entryIndex}
          selected={selected}
          editing={editing}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ResumeDocumentEditor({ doc, selectedTarget, editingTarget, onSelect }: Props) {
  return (
    <div
      className="h-full overflow-auto bg-muted/40 flex justify-center py-6 px-4"
      onClick={() => onSelect?.(null, new DOMRect())}
    >
      <div
        className="bg-white shadow-lg w-full max-w-[816px] min-h-[1056px] px-[15mm] py-[15mm] relative"
        onClick={e => e.stopPropagation()}
      >
        <ContactSection
          doc={doc}
          selected={selectedTarget}
          editing={editingTarget}
          onSelect={onSelect}
        />

        <div className="border-b-2 border-foreground/60 my-2" />

        {doc.sections.map((section, sectionIndex) => (
          <SectionBlock
            key={sectionIndex}
            section={section}
            sectionIndex={sectionIndex}
            selected={selectedTarget}
            editing={editingTarget}
            onSelect={onSelect}
          />
        ))}
      </div>

      <style>{`
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 0 1px hsl(var(--primary) / 0.2), 0 0 8px hsl(var(--primary) / 0.12);
            background-color: hsl(var(--primary) / 0.04);
          }
          50% {
            box-shadow: 0 0 0 3px hsl(var(--primary) / 0.35), 0 0 16px hsl(var(--primary) / 0.22);
            background-color: hsl(var(--primary) / 0.09);
          }
        }
        .animate-glow { animation: glow 1.4s ease-in-out infinite; }
      `}</style>
    </div>
  )
}

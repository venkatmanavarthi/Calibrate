import { useRef, useState } from 'react'
import { Eye, EyeOff, GripVertical, Plus } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ResumeDocument, ResumeDocumentEntry, ResumeDocumentSection, SelectionTarget } from '@/types/resume-document'
export type { SelectionTarget } from '@/types/resume-document'

interface Props {
  doc: ResumeDocument
  selectedTarget?: SelectionTarget | null
  editingTarget?: SelectionTarget | null
  onSelect?: (target: SelectionTarget | null, rect: DOMRect) => void
  onToggleSection?: (sectionIndex: number) => void
  onReorderSections?: (fromIndex: number, toIndex: number) => void
  onAddSection?: (title: string, layout: import('@/types/resume-document').ResumeSectionLayout) => void
  onAddEntry?: (sectionIndex: number) => void
  onAddBullet?: (sectionIndex: number, entryIndex: number) => void
  missingKeywords?: string[]
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

// ─── Keyword highlighting ─────────────────────────────────────────────────────

function highlightMissing(text: string, missing: string[]): React.ReactNode {
  if (!missing.length) return text
  const escaped = missing.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(pattern)
  return parts.map((part, i) =>
    missing.some((k) => k.toLowerCase() === part.toLowerCase())
      ? <mark key={i} className="bg-yellow-200/80 rounded-sm px-0.5">{part}</mark>
      : part
  )
}

function renderInlineText(text: string, missingKeywords?: string[]): React.ReactNode {
  const missing = missingKeywords ?? []
  return text.split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, i) => {
      const isBold = part.startsWith('**') && part.endsWith('**')
      const content = isBold ? part.slice(2, -2) : part
      const rendered = missing.length ? highlightMissing(content, missing) : content
      return isBold ? <strong key={i}>{rendered}</strong> : <span key={i}>{rendered}</span>
    })
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

      {contact.title && (
        <div className="mt-0.5">
          <SelectableElement
            target={{ type: 'contact', field: 'title' }}
            selected={matchesTarget(selected, { type: 'contact', field: 'title' })}
            editing={matchesTarget(editing, { type: 'contact', field: 'title' })}
            onSelect={onSelect}
            className="inline-block px-1 py-0.5"
            inline
          >
            <span className="text-base text-muted-foreground">{contact.title}</span>
          </SelectableElement>
        </div>
      )}

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

function BulletItem({ bullet, target, selected, editing, onSelect, missingKeywords }: {
  bullet: string
  target: SelectionTarget & { type: 'bullet' }
  selected: boolean
  editing: boolean
  onSelect: ((target: SelectionTarget | null, rect: DOMRect) => void) | undefined
  missingKeywords?: string[]
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
      <span className="text-sm leading-relaxed">{renderInlineText(bullet, missingKeywords)}</span>
    </SelectableElement>
  )
}

function EntryBlock({ entry, sectionIndex, entryIndex, selected, editing, onSelect, onAddBullet, missingKeywords }: {
  entry: ResumeDocumentEntry
  sectionIndex: number
  entryIndex: number
  selected: SelectionTarget | null | undefined
  editing: SelectionTarget | null | undefined
  onSelect: ((target: SelectionTarget | null, rect: DOMRect) => void) | undefined
  onAddBullet: ((sectionIndex: number, entryIndex: number) => void) | undefined
  missingKeywords?: string[]
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
        <span className="font-semibold text-sm">{entry.left || <span className="text-muted-foreground/50 italic">Untitled entry</span>}</span>
        {entry.right && <span className="text-xs text-muted-foreground shrink-0">{entry.right}</span>}
      </div>
      {(entry.subleft || entry.subright) && (
        <div className="flex justify-between items-baseline gap-4">
          {entry.subleft && <span className="text-sm italic text-muted-foreground">{entry.subleft}</span>}
          {entry.subright && <span className="text-xs text-muted-foreground shrink-0">{entry.subright}</span>}
        </div>
      )}
      {entry.body && <p className="text-sm mt-1 leading-relaxed">{renderInlineText(entry.body, missingKeywords)}</p>}
      {entry.bullets?.map((bullet, bulletIndex) => (
        <BulletItem
          key={bulletIndex}
          bullet={bullet}
          target={{ type: 'bullet', sectionIndex, entryIndex, bulletIndex }}
          selected={matchesTarget(selected, { type: 'bullet', sectionIndex, entryIndex, bulletIndex })}
          editing={matchesTarget(editing, { type: 'bullet', sectionIndex, entryIndex, bulletIndex })}
          onSelect={onSelect}
          missingKeywords={missingKeywords}
        />
      ))}
      {onAddBullet && (
        <button
          onClick={(e) => { e.stopPropagation(); onAddBullet(sectionIndex, entryIndex) }}
          className="mt-1 ml-2 text-[10px] text-muted-foreground/50 hover:text-muted-foreground flex items-center gap-0.5 transition-colors"
        >
          <Plus size={9} /> Add bullet
        </button>
      )}
    </SelectableElement>
  )
}

function SectionBlock({ section, sectionIndex, selected, editing, onSelect, onToggleSection, onAddEntry, onAddBullet, missingKeywords }: {
  section: ResumeDocumentSection
  sectionIndex: number
  selected: SelectionTarget | null | undefined
  editing: SelectionTarget | null | undefined
  onSelect: ((target: SelectionTarget | null, rect: DOMRect) => void) | undefined
  onToggleSection: ((sectionIndex: number) => void) | undefined
  onAddEntry: ((sectionIndex: number) => void) | undefined
  onAddBullet: ((sectionIndex: number, entryIndex: number) => void) | undefined
  missingKeywords?: string[]
}) {
  const sectionTarget: SelectionTarget = { type: 'section', sectionIndex }
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sectionIndex,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={`mt-5 ${section.hidden ? 'opacity-40' : ''}`}>
      <div className="flex items-center gap-1">
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 p-1 rounded text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-colors cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical size={12} />
        </button>
        <div className="flex-1">
          <SelectableElement
            target={sectionTarget}
            selected={matchesTarget(selected, sectionTarget)}
            editing={matchesTarget(editing, sectionTarget)}
            onSelect={onSelect}
            className="px-1 py-0.5"
          >
            <h2 className="text-xs font-bold uppercase tracking-wider">{section.title}</h2>
          </SelectableElement>
        </div>
        {onToggleSection && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSection(sectionIndex) }}
            className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={section.hidden ? 'Show in PDF' : 'Hide from PDF'}
          >
            {section.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        )}
      </div>
      {section.layout !== 'summary' && <div className="border-b border-border mt-0.5 mb-1" />}

      {!section.hidden && section.layout === 'summary' && section.text && (
        <SelectableElement
          target={{ type: 'summary', sectionIndex }}
          selected={matchesTarget(selected, { type: 'summary', sectionIndex })}
          editing={matchesTarget(editing, { type: 'summary', sectionIndex })}
          onSelect={onSelect}
          className="px-1 py-1"
        >
          <p className="text-sm leading-relaxed">
            {renderInlineText(section.text, missingKeywords)}
          </p>
        </SelectableElement>
      )}

      {!section.hidden && section.layout === 'skills' && section.skills && (
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
              <span className="text-xs">{renderInlineText(skill)}</span>
            </SelectableElement>
          ))}
        </div>
      )}

      {!section.hidden && section.layout === 'entries' && (
        <>
          {section.entries?.map((entry, entryIndex) => (
            <EntryBlock
              key={entryIndex}
              entry={entry}
              sectionIndex={sectionIndex}
              entryIndex={entryIndex}
              selected={selected}
              editing={editing}
              onSelect={onSelect}
              onAddBullet={onAddBullet}
              missingKeywords={missingKeywords}
            />
          ))}
          {onAddEntry && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddEntry(sectionIndex) }}
              className="mt-2 text-[10px] text-muted-foreground/50 hover:text-muted-foreground flex items-center gap-0.5 px-2 transition-colors"
            >
              <Plus size={9} /> Add entry
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ResumeDocumentEditor({ doc, selectedTarget, editingTarget, onSelect, onToggleSection, onReorderSections, onAddSection, onAddEntry, onAddBullet, missingKeywords }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [newSectionLayout, setNewSectionLayout] = useState<import('@/types/resume-document').ResumeSectionLayout>('entries')
  const [showAddSection, setShowAddSection] = useState(false)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    onReorderSections?.(active.id as number, over.id as number)
  }

  const submitAddSection = (e: React.FormEvent) => {
    e.preventDefault()
    const title = newSectionTitle.trim()
    if (!title) return
    onAddSection?.(title, newSectionLayout)
    setNewSectionTitle('')
    setShowAddSection(false)
  }

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

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={doc.sections.map((_, i) => i)} strategy={verticalListSortingStrategy}>
            {doc.sections.map((section, sectionIndex) => (
              <SectionBlock
                key={sectionIndex}
                section={section}
                sectionIndex={sectionIndex}
                selected={selectedTarget}
                editing={editingTarget}
                onSelect={onSelect}
                onToggleSection={onToggleSection}
                onAddEntry={onAddEntry}
                onAddBullet={onAddBullet}
                missingKeywords={missingKeywords}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Add Section UI */}
        {onAddSection && (
          <div className="mt-6" onClick={e => e.stopPropagation()}>
            {showAddSection ? (
              <form onSubmit={submitAddSection} className="flex items-center gap-2 border border-dashed rounded-lg px-3 py-2">
                <input
                  autoFocus
                  type="text"
                  value={newSectionTitle}
                  onChange={e => setNewSectionTitle(e.target.value)}
                  placeholder="Section title…"
                  className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/50"
                  onKeyDown={e => { if (e.key === 'Escape') { setShowAddSection(false); setNewSectionTitle('') } }}
                />
                <select
                  value={newSectionLayout}
                  onChange={e => setNewSectionLayout(e.target.value as import('@/types/resume-document').ResumeSectionLayout)}
                  className="text-xs bg-muted border border-border rounded px-1 py-0.5 outline-none"
                >
                  <option value="entries">Entries</option>
                  <option value="skills">Skills</option>
                  <option value="summary">Summary</option>
                </select>
                <button type="submit" className="text-xs bg-primary text-primary-foreground rounded px-2 py-0.5 hover:bg-primary/90 transition-colors">Add</button>
                <button type="button" onClick={() => { setShowAddSection(false); setNewSectionTitle('') }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
              </form>
            ) : (
              <button
                onClick={() => setShowAddSection(true)}
                className="w-full text-xs text-muted-foreground/50 hover:text-muted-foreground border border-dashed rounded-lg py-2 flex items-center justify-center gap-1 transition-colors hover:border-muted-foreground/30"
              >
                <Plus size={11} /> Add section
              </button>
            )}
          </div>
        )}
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

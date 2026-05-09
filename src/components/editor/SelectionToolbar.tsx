import { useEffect, useRef, useState } from 'react'
import { Wand2, MessageSquare, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SelectionTarget } from './ResumeDocumentEditor'

interface Props {
  target: SelectionTarget
  anchorRect: DOMRect
  onRewrite: (target: SelectionTarget) => void
  onPromptAi: (target: SelectionTarget, prompt: string) => void
  onRemove: (target: SelectionTarget) => void
  onDismiss: () => void
}

function labelForTarget(target: SelectionTarget): string {
  switch (target.type) {
    case 'contact': return target.field.charAt(0).toUpperCase() + target.field.slice(1)
    case 'summary': return 'Summary'
    case 'section': return 'Section title'
    case 'entry': return 'Entry'
    case 'bullet': return 'Bullet'
    case 'skill': return 'Skill'
    case 'skills': return 'Skills'
  }
}

export default function SelectionToolbar({ target, anchorRect, onRewrite, onPromptAi, onRemove, onDismiss }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [promptOpen, setPromptOpen] = useState(false)
  const [promptText, setPromptText] = useState('')
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  // Position: above the anchor rect, centred horizontally, with viewport clamping
  const [style, setStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const toolbarH = el.offsetHeight || 40
    const toolbarW = el.offsetWidth || 220
    const GAP = 6

    let top = anchorRect.top - toolbarH - GAP
    if (top < 8) top = anchorRect.bottom + GAP

    let left = anchorRect.left + anchorRect.width / 2 - toolbarW / 2
    left = Math.max(8, Math.min(left, window.innerWidth - toolbarW - 8))

    setStyle({ top, left })
  }, [anchorRect])

  // Dismiss on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onDismiss()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onDismiss])

  const handlePromptSubmit = () => {
    if (promptText.trim()) {
      onPromptAi(target, promptText.trim())
      setPromptText('')
      setPromptOpen(false)
    }
  }

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', zIndex: 50, ...style }}
      className="bg-popover border border-border rounded-lg shadow-lg flex flex-col overflow-hidden"
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="flex items-center gap-0.5 px-1.5 py-1.5">
        <span className="text-[10px] font-medium text-muted-foreground px-1 mr-1 select-none">
          {labelForTarget(target)}
        </span>

        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 gap-1.5 text-xs"
          onClick={() => onRewrite(target)}
          title="Rewrite with AI"
        >
          <Wand2 size={12} /> Rewrite
        </Button>

        <Button
          size="sm"
          variant={promptOpen ? 'secondary' : 'ghost'}
          className="h-7 px-2 gap-1.5 text-xs"
          onClick={() => { setPromptOpen(v => !v); setPromptText('') }}
          title="Prompt AI"
        >
          <MessageSquare size={12} /> Prompt
        </Button>

        <Button
          size="sm"
          variant={confirmingRemove ? 'secondary' : 'ghost'}
          className="h-7 px-2 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => { setConfirmingRemove(true); setPromptOpen(false) }}
          title="Remove"
        >
          <Trash2 size={12} /> Remove
        </Button>
      </div>

      {confirmingRemove && (
        <div className="border-t px-2 pb-2 pt-1.5 flex items-center gap-2">
          <AlertTriangle size={12} className="text-destructive shrink-0" />
          <span className="text-xs text-muted-foreground flex-1">Remove {labelForTarget(target)}?</span>
          <Button
            size="sm"
            variant="destructive"
            className="h-6 px-2 text-xs"
            onClick={() => { onRemove(target); setConfirmingRemove(false) }}
          >
            Remove
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={() => setConfirmingRemove(false)}
          >
            Cancel
          </Button>
        </div>
      )}

      {promptOpen && (
        <div className="border-t px-2 pb-2 pt-1.5 flex gap-1.5">
          <input
            autoFocus
            className="flex-1 text-xs h-7 rounded border border-border bg-background px-2 focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Instructions for AI…"
            value={promptText}
            onChange={e => setPromptText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handlePromptSubmit()
              if (e.key === 'Escape') { setPromptOpen(false); setPromptText('') }
            }}
          />
          <Button
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={!promptText.trim()}
            onClick={handlePromptSubmit}
          >
            Go
          </Button>
        </div>
      )}
    </div>
  )
}

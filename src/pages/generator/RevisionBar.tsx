import { useRef } from 'react'
import { Wand2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useGeneratorStore } from '@/stores/generator.store'
import { cn } from '@/lib/utils'

interface Props {
  onRevise: (instruction: string) => void
}

export default function RevisionBar({ onRevise }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { selectionFrom, selectionTo, revisionInstruction, setRevisionInstruction, isRevising } = useGeneratorStore()

  const hasSelection = selectionFrom !== selectionTo

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 border-t bg-muted/40 transition-all duration-200',
        hasSelection ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      <Wand2 size={14} className="text-muted-foreground flex-shrink-0" />
      <span className="text-xs text-muted-foreground flex-shrink-0">Revise selection:</span>
      <Input
        ref={inputRef}
        value={revisionInstruction}
        onChange={(e) => setRevisionInstruction(e.target.value)}
        placeholder="e.g. Make this more leadership-focused"
        className="flex-1 h-7 text-sm"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && revisionInstruction.trim()) {
            onRevise(revisionInstruction.trim())
          }
        }}
      />
      <Button
        size="sm"
        className="h-7 px-3"
        disabled={!revisionInstruction.trim() || isRevising}
        onClick={() => onRevise(revisionInstruction.trim())}
      >
        {isRevising ? <Loader2 size={13} className="animate-spin" /> : 'Revise'}
      </Button>
    </div>
  )
}

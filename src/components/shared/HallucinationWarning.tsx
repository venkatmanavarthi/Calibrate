import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { HallucinationWarning } from '@/types/models'

interface Props {
  warnings: HallucinationWarning[]
  onDismiss: () => void
}

export default function HallucinationWarningBanner({ warnings, onDismiss }: Props) {
  if (warnings.length === 0) return null

  return (
    <div className="flex items-start gap-3 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900">
      <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-amber-600" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">Possible hallucinations detected</p>
        <p className="text-xs mt-0.5 text-amber-700">
          {warnings.slice(0, 3).map((w) => `"${w.suspectText}"`).join(', ')}
          {warnings.length > 3 && ` and ${warnings.length - 3} more`} — please verify against your profile.
        </p>
      </div>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-amber-700 hover:text-amber-900 hover:bg-amber-100" onClick={onDismiss}>
        <X size={14} />
      </Button>
    </div>
  )
}

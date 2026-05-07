import { useState, useEffect } from 'react'
import { Download, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { UpdateState, UpdateProgress } from '@/types/ipc'

export default function UpdateBanner() {
  const [state, setState] = useState<UpdateState>('idle')
  const [progress, setProgress] = useState<UpdateProgress | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const unsubStatus = window.api.onUpdatesStatus(({ state: s }) => {
      setState(s)
      if (s !== 'downloading') setProgress(null)
      if (s === 'available') setDismissed(false)
    })
    const unsubProgress = window.api.onUpdatesProgress((p) => setProgress(p))
    const unsubError = window.api.onUpdatesError(({ message }) => setErrorMsg(message))
    return () => {
      unsubStatus()
      unsubProgress()
      unsubError()
    }
  }, [])

  if (dismissed || state === 'idle' || state === 'checking' || state === 'not-available') {
    return null
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border-b border-blue-100 text-sm text-blue-900">
      {state === 'available' && (
        <>
          <span className="flex-1">A new version of Calibrate is available.</span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 border-blue-300 text-blue-800 hover:bg-blue-100"
            onClick={() => window.api.updatesDownload()}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download
          </Button>
          <button onClick={() => setDismissed(true)} className="text-blue-500 hover:text-blue-700">
            <X className="w-4 h-4" />
          </button>
        </>
      )}

      {state === 'downloading' && (
        <>
          <span className="flex-1">
            Downloading update{progress ? ` — ${Math.round(progress.percent)}%` : '…'}
          </span>
          {progress && (
            <div className="w-32 h-1.5 rounded-full bg-blue-200 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          )}
        </>
      )}

      {state === 'downloaded' && (
        <>
          <span className="flex-1">Update downloaded and ready to install.</span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 border-blue-300 text-blue-800 hover:bg-blue-100"
            onClick={() => window.api.updatesInstallAndRestart()}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Restart &amp; Install
          </Button>
        </>
      )}

      {state === 'error' && (
        <>
          <span className="flex-1 text-red-700">
            {errorMsg ?? 'Update check failed.'}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 border-red-300 text-red-700 hover:bg-red-50"
            onClick={() => { setErrorMsg(null); window.api.updatesCheck() }}
          >
            Retry
          </Button>
          <button onClick={() => setDismissed(true)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  )
}

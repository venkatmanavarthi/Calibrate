import { useEffect, useRef } from 'react'
import { useInterviewStore } from '@/stores/interview.store'
import { useSettingsStore } from '@/stores/settings.store'
import { useProfilesStore } from '@/stores/profiles.store'
import InterviewSetupPane from './InterviewSetupPane'
import InterviewChatPane from './InterviewChatPane'
import InterviewScorecard from './InterviewScorecard'

export default function InterviewPage() {
  const { status, _appendChunk, _onTurnComplete, _onError } = useInterviewStore()
  const { load: loadSettings } = useSettingsStore()
  const { load: loadProfiles } = useProfilesStore()
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      loadSettings()
      loadProfiles()
    }
  }, [loadSettings, loadProfiles])

  // Register streaming listeners once for the lifetime of this page
  useEffect(() => {
    const unlistenChunk = window.api.onAiChunk(({ requestId, delta }) => {
      _appendChunk(requestId, delta)
    })

    const unlistenDone = window.api.onAiDone(({ requestId, fullText }) => {
      _onTurnComplete(requestId, fullText)
    })

    const unlistenError = window.api.onAiError(({ requestId, message }) => {
      _onError(requestId, message)
    })

    return () => {
      unlistenChunk()
      unlistenDone()
      unlistenError()
    }
  }, [_appendChunk, _onTurnComplete, _onError])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {status === 'setup' && <InterviewSetupPane />}
      {(status === 'active' || status === 'time-up' || status === 'scoring') && <InterviewChatPane />}
      {status === 'complete' && <InterviewScorecard />}
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { generateId } from '@/lib/utils'
import { useGeneratorStore } from '@/stores/generator.store'
import JobInputPane from './JobInputPane'
import ResumeOutputPane from './ResumeOutputPane'

export default function GeneratorPage() {
  const {
    selectedProfileId, jobDescription,
    activeProvider, activeModel,
    setGenerating, setResumeDocument, setWarnings, clearWarnings,
    currentRequestId, setRating, setIsRating,
  } = useGeneratorStore()
  const [leftWidth, setLeftWidth] = useState(380)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newWidth = Math.min(Math.max(ev.clientX - rect.left, 240), 640)
      setLeftWidth(newWidth)
    }

    const onMouseUp = () => {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [])

  // Register streaming listeners once
  useEffect(() => {
    const unlistenDone = window.api.onAiDone(({ requestId, warnings, resumeDocument }) => {
      if (requestId === useGeneratorStore.getState().currentRequestId) {
        setResumeDocument(resumeDocument ?? null)
        setGenerating(false, null)
        setWarnings(warnings)
        if (resumeDocument) {
          // Auto-trigger rating if job description is available
          const { jobDescription: jd, activeProvider: provider, activeModel: model } = useGeneratorStore.getState()
          if (jd) {
            setIsRating(true)
            setRating(null)
            window.api.aiRateResume({
              resumeDocument,
              jobDescription: jd,
              provider,
              model,
            }).then((r) => setRating(r)).catch(() => {/* rating is best-effort */}).finally(() => setIsRating(false))
          }
        }
      }
    })

    const unlistenError = window.api.onAiError(({ requestId, message }) => {
      if (requestId === useGeneratorStore.getState().currentRequestId) {
        setGenerating(false, null)
        alert(`AI error: ${message}`)
      }
    })

    return () => {
      unlistenDone()
      unlistenError()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async () => {
    if (!selectedProfileId) return
    const requestId = generateId()
    setResumeDocument(null)
    clearWarnings()
    setGenerating(true, requestId)

    await window.api.aiGenerate({
      requestId,
      profileId: selectedProfileId,
      jobDescription,
      provider: activeProvider,
      model: activeModel
    })
  }

  const handleCancel = async () => {
    if (currentRequestId) {
      await window.api.aiCancel(currentRequestId)
    }
    setGenerating(false, null)
  }

  return (
    <div ref={containerRef} className="flex h-full overflow-hidden">
      <div style={{ width: leftWidth, flexShrink: 0 }} className="overflow-hidden">
        <JobInputPane onGenerate={handleGenerate} onCancel={handleCancel} />
      </div>

      <div
        className="w-1 flex-shrink-0 cursor-col-resize bg-border hover:bg-primary/40 active:bg-primary/60 transition-colors relative group"
        onMouseDown={handleDividerMouseDown}
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </div>

      <div className="flex-1 overflow-hidden min-w-0">
        <ResumeOutputPane />
      </div>
    </div>
  )
}

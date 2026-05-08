import { useCallback, useEffect, useRef, useState } from 'react'
import { generateId } from '@/lib/utils'
import { useGeneratorStore } from '@/stores/generator.store'
import { useProfilesStore } from '@/stores/profiles.store'
import JobInputPane from './JobInputPane'
import ResumeOutputPane from './ResumeOutputPane'
import type { MarkdownEditorHandle } from '@/components/editor/MarkdownEditor'

export default function GeneratorPage() {
  const {
    selectedProfileId, selectedTemplateId, jobDescription,
    activeProvider, activeModel,
    setGenerating, setRevising, setGeneratedMarkdown, appendChunk,
    setWarnings, clearWarnings, currentRequestId,
    selectionFrom, selectionTo, revisionInstruction, setRevisionInstruction,
    getProfileSubset, applyRevision
  } = useGeneratorStore()
  const profiles = useProfilesStore((s) => s.profiles)
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
    const unlistenChunk = window.api.onAiChunk(({ requestId, delta }) => {
      if (requestId === useGeneratorStore.getState().currentRequestId) {
        const state = useGeneratorStore.getState()
        if (state.isRevising) {
          // Revision: accumulate separately (handled in handleRevise closure)
          // We use a ref-based approach — see handleRevise
        } else {
          appendChunk(delta)
        }
      }
    })

    const unlistenDone = window.api.onAiDone(({ requestId, fullText, warnings }) => {
      if (requestId === useGeneratorStore.getState().currentRequestId) {
        const state = useGeneratorStore.getState()
        if (!state.isRevising) {
          setGeneratedMarkdown(fullText)
          setGenerating(false, null)
          setWarnings(warnings)
        }
      }
    })

    const unlistenError = window.api.onAiError(({ requestId, message }) => {
      if (requestId === useGeneratorStore.getState().currentRequestId) {
        setGenerating(false, null)
        setRevising(false)
        alert(`AI error: ${message}`)
      }
    })

    return () => {
      unlistenChunk()
      unlistenDone()
      unlistenError()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async () => {
    if (!selectedProfileId || !selectedTemplateId) return
    const requestId = generateId()
    setGeneratedMarkdown('')
    clearWarnings()
    setGenerating(true, requestId)

    await window.api.aiGenerate({
      requestId,
      profileId: selectedProfileId,
      templateId: selectedTemplateId,
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
    setRevising(false)
  }

  const handleRevise = async (instruction: string, editorHandle: MarkdownEditorHandle | null) => {
    if (!selectedProfileId) return
    const profile = profiles.find((p) => p.id === selectedProfileId)
    if (!profile) return

    const requestId = generateId()
    const { selectionFrom: from, selectionTo: to } = useGeneratorStore.getState()
    const md = useGeneratorStore.getState().generatedMarkdown
    const surroundingStart = Math.max(0, from - 200)
    const surroundingEnd = Math.min(md.length, to + 200)
    const surroundingContext = md.slice(surroundingStart, surroundingEnd)

    let revised = ''

    setRevising(true)
    // Override onAiChunk for revision mode: replace selection live
    const unlistenChunk = window.api.onAiChunk(({ requestId: rid, delta }) => {
      if (rid !== requestId) return
      revised += delta
      editorHandle?.replaceRange(from, from + revised.length - delta.length, revised)
    })
    const unlistenDone = window.api.onAiDone(({ requestId: rid, fullText }) => {
      if (rid !== requestId) return
      unlistenChunk()
      unlistenDone()
      unlistenError()
      applyRevision(from, to, fullText)
      setRevising(false)
      setRevisionInstruction('')
    })
    const unlistenError = window.api.onAiError(({ requestId: rid, message }) => {
      if (rid !== requestId) return
      unlistenChunk()
      unlistenDone()
      unlistenError()
      setRevising(false)
      alert(`Revision error: ${message}`)
    })

    await window.api.aiRevise({
      requestId,
      selectedText: md.slice(from, to),
      selectionStart: from,
      selectionEnd: to,
      surroundingContext,
      profileSubset: getProfileSubset(profile),
      instruction,
      provider: activeProvider,
      model: activeModel
    })
  }

  return (
    <div ref={containerRef} className="flex h-full overflow-hidden">
      {/* Left pane: job input */}
      <div style={{ width: leftWidth, flexShrink: 0 }} className="overflow-hidden">
        <JobInputPane onGenerate={handleGenerate} onCancel={handleCancel} />
      </div>

      {/* Resize divider */}
      <div
        className="w-1 flex-shrink-0 cursor-col-resize bg-border hover:bg-primary/40 active:bg-primary/60 transition-colors relative group"
        onMouseDown={handleDividerMouseDown}
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </div>

      {/* Right pane: resume output */}
      <div className="flex-1 overflow-hidden min-w-0">
        <ResumeOutputPane onRevise={handleRevise} />
      </div>
    </div>
  )
}

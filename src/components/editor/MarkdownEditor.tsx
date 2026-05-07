import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { cn } from '@/lib/utils'

interface MarkdownEditorProps {
  value: string
  onChange?: (value: string) => void
  onSelectionChange?: (from: number, to: number) => void
  className?: string
  readOnly?: boolean
}

export interface MarkdownEditorHandle {
  replaceRange: (from: number, to: number, text: string) => void
  getValue: () => string
}

const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  ({ value, onChange, onSelectionChange, className, readOnly = false }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const viewRef = useRef<EditorView | null>(null)
    const isInternalChange = useRef(false)

    useImperativeHandle(ref, () => ({
      replaceRange(from, to, text) {
        const view = viewRef.current
        if (!view) return
        view.dispatch({
          changes: { from, to, insert: text },
          selection: { anchor: from + text.length }
        })
      },
      getValue() {
        return viewRef.current?.state.doc.toString() ?? ''
      }
    }))

    useEffect(() => {
      if (!containerRef.current) return

      const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged && !isInternalChange.current) {
          onChange?.(update.state.doc.toString())
        }
        if (update.selectionSet && onSelectionChange) {
          const { from, to } = update.state.selection.main
          onSelectionChange(from, to)
        }
      })

      const state = EditorState.create({
        doc: value,
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          markdown(),
          oneDark,
          lineNumbers(),
          updateListener,
          EditorView.lineWrapping,
          EditorState.readOnly.of(readOnly)
        ]
      })

      const view = new EditorView({ state, parent: containerRef.current })
      viewRef.current = view

      return () => {
        view.destroy()
        viewRef.current = null
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Sync external value changes
    useEffect(() => {
      const view = viewRef.current
      if (!view) return
      const current = view.state.doc.toString()
      if (current !== value) {
        isInternalChange.current = true
        view.dispatch({
          changes: { from: 0, to: current.length, insert: value }
        })
        isInternalChange.current = false
      }
    }, [value])

    return (
      <div
        ref={containerRef}
        className={cn('h-full overflow-auto text-sm [&_.cm-editor]:h-full [&_.cm-scroller]:overflow-auto', className)}
      />
    )
  }
)

MarkdownEditor.displayName = 'MarkdownEditor'
export default MarkdownEditor

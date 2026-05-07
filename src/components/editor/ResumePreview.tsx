import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface ResumePreviewProps {
  markdown: string
  className?: string
}

export default function ResumePreview({ markdown, className }: ResumePreviewProps) {
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none h-full overflow-auto p-6',
        'prose-headings:font-bold prose-h1:text-2xl prose-h2:text-lg prose-h2:border-b prose-h2:pb-1',
        'prose-ul:list-disc prose-li:my-0.5',
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown || '*No resume generated yet.*'}</ReactMarkdown>
    </div>
  )
}

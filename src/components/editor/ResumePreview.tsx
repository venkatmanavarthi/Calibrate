import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { cn } from '@/lib/utils'

// 1mm ≈ 3.7795px at 96dpi
const MM_TO_PX = 3.7795

interface ResumePreviewProps {
  markdown: string
  className?: string
  fontSize?: number
  textAlign?: 'left' | 'center' | 'right' | 'justify'
  lineHeight?: number
  paddingTopMm?: number
  paddingRightMm?: number
  paddingBottomMm?: number
  paddingLeftMm?: number
}

export default function ResumePreview({
  markdown, className,
  fontSize = 14, textAlign = 'left', lineHeight = 1.6,
  paddingTopMm = 15, paddingRightMm = 15, paddingBottomMm = 15, paddingLeftMm = 15,
}: ResumePreviewProps) {
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none h-full overflow-auto',
        'prose-headings:font-bold prose-h2:border-b prose-h2:pb-1',
        'prose-ul:list-disc prose-li:my-0.5',
        '[&_p]:overflow-hidden [&_p]:mt-0 [&_p]:mb-1',
        className
      )}
      style={{
        fontSize: `${fontSize}px`,
        textAlign,
        lineHeight,
        paddingTop: `${paddingTopMm * MM_TO_PX}px`,
        paddingRight: `${paddingRightMm * MM_TO_PX}px`,
        paddingBottom: `${paddingBottomMm * MM_TO_PX}px`,
        paddingLeft: `${paddingLeftMm * MM_TO_PX}px`,
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{markdown || '*No resume generated yet.*'}</ReactMarkdown>
    </div>
  )
}

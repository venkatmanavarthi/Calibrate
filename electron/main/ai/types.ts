export type Role = 'system' | 'user' | 'assistant'

export type TextPart  = { type: 'text'; text: string }
export type ImagePart = { type: 'image'; base64: string; mimeType: string }
export type MessageContent = string | Array<TextPart | ImagePart>

export function flattenContent(content: MessageContent): string {
  if (typeof content === 'string') return content
  return content.filter((p): p is TextPart => p.type === 'text').map(p => p.text).join('\n')
}

export interface Message {
  role: Role
  content: MessageContent
}

export interface GenerateOptions {
  model: string
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

export type StreamChunkCallback = (delta: string) => void

export interface LLMProvider {
  readonly providerName: string
  readonly supportedModels: string[]
  generate(messages: Message[], opts: GenerateOptions, onChunk: StreamChunkCallback): Promise<string>
  listModels(): Promise<string[]>
  supportsVision(): boolean
  isVisionModel(model: string): boolean
}

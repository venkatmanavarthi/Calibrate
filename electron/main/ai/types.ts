export type Role = 'system' | 'user' | 'assistant'

export interface Message {
  role: Role
  content: string
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
}

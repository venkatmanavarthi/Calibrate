import Anthropic from '@anthropic-ai/sdk'
import type { LLMProvider, Message, GenerateOptions, StreamChunkCallback, MessageContent } from '../types'
import { flattenContent } from '../types'

const VISION_MODELS = new Set(['claude-sonnet-4-5', 'claude-haiku-4-5-20251001', 'claude-opus-4-7'])

type AnthropicContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'; data: string } }

function toAnthropicContent(content: MessageContent): string | AnthropicContentPart[] {
  if (typeof content === 'string') return content
  return content.map(part =>
    part.type === 'text'
      ? { type: 'text' as const, text: part.text }
      : { type: 'image' as const, source: { type: 'base64' as const, media_type: part.mimeType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp', data: part.base64 } }
  )
}

export class AnthropicProvider implements LLMProvider {
  readonly providerName = 'anthropic'
  readonly supportedModels = ['claude-sonnet-4-5', 'claude-haiku-4-5-20251001', 'claude-opus-4-7']

  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  supportsVision(): boolean { return true }
  isVisionModel(model: string): boolean { return VISION_MODELS.has(model) }

  async generate(messages: Message[], opts: GenerateOptions, onChunk: StreamChunkCallback): Promise<string> {
    const systemMsg = messages.find((m) => m.role === 'system')
    const system = systemMsg ? flattenContent(systemMsg.content) : ''
    const userMessages = messages.filter((m) => m.role !== 'system')

    let fullText = ''
    const stream = this.client.messages.stream({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature ?? 0.2,
      system,
      messages: userMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: toAnthropicContent(m.content)
      }))
    })

    for await (const chunk of stream) {
      if (opts.signal?.aborted) break
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        fullText += chunk.delta.text
        onChunk(chunk.delta.text)
      }
    }
    return fullText
  }

  async listModels(): Promise<string[]> {
    return this.supportedModels
  }
}

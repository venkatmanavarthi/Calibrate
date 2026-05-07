import Anthropic from '@anthropic-ai/sdk'
import type { LLMProvider, Message, GenerateOptions, StreamChunkCallback } from '../types'

export class AnthropicProvider implements LLMProvider {
  readonly providerName = 'anthropic'
  readonly supportedModels = ['claude-sonnet-4-5', 'claude-haiku-4-5-20251001', 'claude-opus-4-7']

  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async generate(messages: Message[], opts: GenerateOptions, onChunk: StreamChunkCallback): Promise<string> {
    const system = messages.find((m) => m.role === 'system')?.content ?? ''
    const userMessages = messages.filter((m) => m.role !== 'system')

    let fullText = ''
    const stream = this.client.messages.stream({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature ?? 0.2,
      system,
      messages: userMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
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

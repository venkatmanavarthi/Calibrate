import OpenAI from 'openai'
import type { LLMProvider, Message, GenerateOptions, StreamChunkCallback } from '../types'

export class OpenAICompatibleProvider implements LLMProvider {
  readonly providerName: string
  readonly supportedModels: string[]

  private client: OpenAI

  constructor(
    providerName: string,
    supportedModels: string[],
    apiKey: string,
    baseURL?: string
  ) {
    this.providerName = providerName
    this.supportedModels = supportedModels
    this.client = new OpenAI({ apiKey: apiKey || 'lm-studio', baseURL })
  }

  async generate(messages: Message[], opts: GenerateOptions, onChunk: StreamChunkCallback): Promise<string> {
    let fullText = ''
    const isLegacyModel = opts.model.startsWith('gpt-4o')
    const tokenParam = isLegacyModel
      ? { max_tokens: opts.maxTokens ?? 4096 }
      : { max_completion_tokens: opts.maxTokens ?? 4096 }
    const temperatureParam = isLegacyModel ? { temperature: opts.temperature ?? 0.2 } : {}
    const stream = await this.client.chat.completions.create({
      model: opts.model,
      ...temperatureParam,
      ...tokenParam,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true
    })

    for await (const chunk of stream) {
      if (opts.signal?.aborted) break
      const delta = chunk.choices[0]?.delta?.content ?? ''
      fullText += delta
      if (delta) onChunk(delta)
    }
    return fullText
  }

  async listModels(): Promise<string[]> {
    try {
      const models = await this.client.models.list()
      return models.data.map((m) => m.id)
    } catch {
      return this.supportedModels
    }
  }
}

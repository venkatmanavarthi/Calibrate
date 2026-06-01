import OpenAI from 'openai'
import type { LLMProvider, Message, GenerateOptions, StreamChunkCallback, MessageContent } from '../types'
import { flattenContent } from '../types'

const VISION_MODEL_PREFIXES = ['gpt-4o', 'gpt-5']

interface OpenAICompatibleOptions {
  visionEnabled?: boolean
  useMaxCompletionTokens?: boolean
  supportsTemperature?: boolean
  unsupportedTemperatureModelPrefixes?: string[]
}

function toOpenAIContent(content: MessageContent, visionEnabled: boolean): string | OpenAI.Chat.ChatCompletionContentPart[] {
  if (typeof content === 'string') return content
  if (!visionEnabled) return flattenContent(content)
  return content.map(part =>
    part.type === 'text'
      ? { type: 'text' as const, text: part.text }
      : { type: 'image_url' as const, image_url: { url: `data:${part.mimeType};base64,${part.base64}` } }
  )
}

export class OpenAICompatibleProvider implements LLMProvider {
  readonly providerName: string
  readonly supportedModels: string[]

  private client: OpenAI
  private visionEnabled: boolean
  private useMaxCompletionTokens: boolean
  private supportsTemperature: boolean
  private unsupportedTemperatureModelPrefixes: string[]

  constructor(
    providerName: string,
    supportedModels: string[],
    apiKey: string,
    baseURL?: string,
    options: OpenAICompatibleOptions | boolean = {}
  ) {
    this.providerName = providerName
    this.supportedModels = supportedModels
    this.client = new OpenAI({ apiKey: apiKey || 'lm-studio', baseURL })
    const resolvedOptions = typeof options === 'boolean'
      ? { visionEnabled: options }
      : options
    this.visionEnabled = resolvedOptions.visionEnabled ?? true
    this.useMaxCompletionTokens = resolvedOptions.useMaxCompletionTokens ?? true
    this.supportsTemperature = resolvedOptions.supportsTemperature ?? true
    this.unsupportedTemperatureModelPrefixes = resolvedOptions.unsupportedTemperatureModelPrefixes ?? []
  }

  supportsVision(): boolean { return this.visionEnabled }
  isVisionModel(model: string): boolean {
    return this.visionEnabled && VISION_MODEL_PREFIXES.some(p => model.startsWith(p))
  }

  async generate(messages: Message[], opts: GenerateOptions, onChunk: StreamChunkCallback): Promise<string> {
    let fullText = ''
    const useMaxTokens = !this.useMaxCompletionTokens || opts.model.startsWith('gpt-4o')
    const tokenParam = useMaxTokens
      ? { max_tokens: opts.maxTokens ?? 4096 }
      : { max_completion_tokens: opts.maxTokens ?? 4096 }
    const supportsTemperatureForModel = this.supportsTemperature
      && !this.unsupportedTemperatureModelPrefixes.some(prefix => opts.model.startsWith(prefix))
    const temperatureParam = supportsTemperatureForModel ? { temperature: opts.temperature ?? 0.2 } : {}
    const stream = await this.client.chat.completions.create({
      model: opts.model,
      ...temperatureParam,
      ...tokenParam,
      // Vision content (image arrays) is only valid for user messages in the OpenAI API
      messages: messages.map((m) => ({
        role: m.role,
        content: m.role === 'user'
          ? toOpenAIContent(m.content, this.visionEnabled)
          : flattenContent(m.content)
      })) as OpenAI.Chat.ChatCompletionMessageParam[],
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

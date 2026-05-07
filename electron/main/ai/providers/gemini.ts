import { GoogleGenerativeAI } from '@google/generative-ai'
import type { LLMProvider, Message, GenerateOptions, StreamChunkCallback } from '../types'

export class GeminiProvider implements LLMProvider {
  readonly providerName = 'gemini'
  readonly supportedModels = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash']

  private genAI: GoogleGenerativeAI

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey)
  }

  async generate(messages: Message[], opts: GenerateOptions, onChunk: StreamChunkCallback): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: opts.model,
      generationConfig: {
        temperature: opts.temperature ?? 0.2,
        maxOutputTokens: opts.maxTokens ?? 4096
      }
    })

    const systemMsg = messages.find((m) => m.role === 'system')?.content ?? ''
    const userMessages = messages.filter((m) => m.role !== 'system')

    const history = userMessages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

    const lastMessage = userMessages[userMessages.length - 1]
    const chat = model.startChat({
      history,
      systemInstruction: systemMsg
    })

    const result = await chat.sendMessageStream(lastMessage?.content ?? '')
    let fullText = ''
    for await (const chunk of result.stream) {
      if (opts.signal?.aborted) break
      const text = chunk.text()
      fullText += text
      if (text) onChunk(text)
    }
    return fullText
  }

  async listModels(): Promise<string[]> {
    return this.supportedModels
  }
}

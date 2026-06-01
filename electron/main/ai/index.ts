import type { AIProvider, AppSettings } from '../../../src/types/models'
import type { LLMProvider } from './types'
import { AnthropicProvider } from './providers/anthropic'
import { OpenAICompatibleProvider } from './providers/openai'
import { GeminiProvider } from './providers/gemini'
import { getKey } from '../security/keystore'

export async function buildProvider(provider: AIProvider, settings: AppSettings): Promise<LLMProvider> {
  const key = await getKey(provider)

  switch (provider) {
    case 'anthropic':
      return new AnthropicProvider(key ?? '')

    case 'openai':
      return new OpenAICompatibleProvider(
        'openai',
        ['gpt-5.5', 'gpt-5.4-mini', 'gpt-4o'],
        key ?? '',
        undefined,
        { unsupportedTemperatureModelPrefixes: ['gpt-5'] }
      )

    case 'groq':
      return new OpenAICompatibleProvider(
        'groq',
        ['llama3-70b-8192', 'llama3-8b-8192', 'mixtral-8x7b-32768'],
        key ?? '',
        'https://api.groq.com/openai/v1',
        { visionEnabled: false, useMaxCompletionTokens: false }
      )

    case 'deepseek':
      return new OpenAICompatibleProvider(
        'deepseek',
        ['deepseek-v4-flash', 'deepseek-v4-pro'],
        key ?? '',
        'https://api.deepseek.com',
        { visionEnabled: false, useMaxCompletionTokens: false }
      )

    case 'lmstudio':
      return new OpenAICompatibleProvider(
        'lmstudio',
        [settings.lmStudioConfig.modelName],
        '',
        settings.lmStudioConfig.baseUrl,
        { visionEnabled: false, useMaxCompletionTokens: false }
      )

    case 'gemini':
      return new GeminiProvider(key ?? '')
  }
}

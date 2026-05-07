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
      return new OpenAICompatibleProvider('openai', ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'], key ?? '')

    case 'groq':
      return new OpenAICompatibleProvider(
        'groq',
        ['llama3-70b-8192', 'llama3-8b-8192', 'mixtral-8x7b-32768'],
        key ?? '',
        'https://api.groq.com/openai/v1'
      )

    case 'lmstudio':
      return new OpenAICompatibleProvider(
        'lmstudio',
        [settings.lmStudioConfig.modelName],
        '',
        settings.lmStudioConfig.baseUrl
      )

    case 'gemini':
      return new GeminiProvider(key ?? '')
  }
}

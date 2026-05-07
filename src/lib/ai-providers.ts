import type { AIProvider } from '@/types/models'

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI (GPT)',
  gemini: 'Google (Gemini)',
  groq: 'Groq',
  lmstudio: 'LM Studio (local)'
}

export const PROVIDER_MODELS: Record<AIProvider, string[]> = {
  anthropic: ['claude-sonnet-4-5', 'claude-haiku-4-5-20251001', 'claude-opus-4-7'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  gemini: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'],
  groq: ['llama3-70b-8192', 'llama3-8b-8192', 'mixtral-8x7b-32768'],
  lmstudio: ['local-model']
}

export const ALL_PROVIDERS: AIProvider[] = ['anthropic', 'openai', 'gemini', 'groq', 'lmstudio']

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
  openai: ['gpt-5.5', 'gpt-5.4-mini', 'gpt-4o'],
  gemini: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'],
  groq: ['llama3-70b-8192', 'llama3-8b-8192', 'mixtral-8x7b-32768'],
  lmstudio: ['local-model']
}

export const ALL_PROVIDERS: AIProvider[] = ['anthropic', 'openai', 'gemini', 'groq', 'lmstudio']

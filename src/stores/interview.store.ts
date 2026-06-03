import { create } from 'zustand'
import { generateId } from '@/lib/utils'
import type {
  InterviewConfig,
  InterviewMessage,
  InterviewScore,
  InterviewStatus,
  InterviewType,
  AIProvider
} from '@/types/models'

const DEFAULT_CONFIG: InterviewConfig = {
  type: 'job-fit',
  durationMinutes: 30,
  topics: [],
  profileId: undefined,
  jobDescription: '',
  provider: 'anthropic',
  model: 'claude-sonnet-4-5'
}

interface InterviewState {
  config: InterviewConfig
  status: InterviewStatus
  messages: InterviewMessage[]
  streamingContent: string
  isStreaming: boolean
  currentRequestId: string | null
  turnNumber: number
  startedAt: number | null
  score: InterviewScore | null
  error: string | null

  setConfigField: <K extends keyof InterviewConfig>(key: K, value: InterviewConfig[K]) => void
  setType: (type: InterviewType) => void
  setProvider: (provider: AIProvider) => void
  setModel: (model: string) => void

  startInterview: () => Promise<void>
  submitAnswer: (answer: string) => Promise<void>
  markTimeUp: () => void
  scoreInterview: () => Promise<void>
  reset: () => void

  _appendChunk: (requestId: string, delta: string) => void
  _onTurnComplete: (requestId: string, fullText: string) => void
  _onError: (requestId: string, message: string) => void
}

export const useInterviewStore = create<InterviewState>((set, get) => ({
  config: { ...DEFAULT_CONFIG },
  status: 'setup',
  messages: [],
  streamingContent: '',
  isStreaming: false,
  currentRequestId: null,
  turnNumber: 1,
  startedAt: null,
  score: null,
  error: null,

  setConfigField: (key, value) => set(state => ({ config: { ...state.config, [key]: value } })),
  setType: (type) => set(state => ({ config: { ...state.config, type } })),
  setProvider: (provider) => set(state => ({ config: { ...state.config, provider } })),
  setModel: (model) => set(state => ({ config: { ...state.config, model } })),

  startInterview: async () => {
    const { config } = get()
    const requestId = generateId()

    set({
      status: 'active',
      messages: [],
      streamingContent: '',
      isStreaming: true,
      currentRequestId: requestId,
      turnNumber: 1,
      startedAt: Date.now(),
      score: null,
      error: null
    })

    await window.api.interviewSendMessage({
      requestId,
      config,
      messages: [],
      turnNumber: 1,
      provider: config.provider,
      model: config.model
    })
  },

  submitAnswer: async (answer: string) => {
    const { config, messages, turnNumber } = get()
    const requestId = generateId()

    const userMessage: InterviewMessage = {
      id: generateId(),
      role: 'interviewee',
      content: answer,
      timestamp: Date.now()
    }

    const updatedMessages = [...messages, userMessage]

    set({
      messages: updatedMessages,
      streamingContent: '',
      isStreaming: true,
      currentRequestId: requestId
    })

    await window.api.interviewSendMessage({
      requestId,
      config,
      messages: updatedMessages,
      turnNumber,
      provider: config.provider,
      model: config.model
    })
  },

  markTimeUp: () => set({ status: 'time-up' }),

  scoreInterview: async () => {
    const { config, messages } = get()
    set({ status: 'scoring', error: null })

    try {
      const score = await window.api.interviewGetScore({
        config,
        messages,
        provider: config.provider,
        model: config.model
      })
      set({ score, status: 'complete' })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to score interview',
        status: 'time-up'
      })
    }
  },

  reset: () => set({
    config: { ...DEFAULT_CONFIG },
    status: 'setup',
    messages: [],
    streamingContent: '',
    isStreaming: false,
    currentRequestId: null,
    turnNumber: 1,
    startedAt: null,
    score: null,
    error: null
  }),

  _appendChunk: (requestId, delta) => {
    if (requestId !== get().currentRequestId) return
    set(state => ({ streamingContent: state.streamingContent + delta }))
  },

  _onTurnComplete: (requestId, fullText) => {
    if (requestId !== get().currentRequestId) return

    const newMessage: InterviewMessage = {
      id: generateId(),
      role: 'interviewer',
      content: fullText,
      timestamp: Date.now()
    }

    set(state => ({
      messages: [...state.messages, newMessage],
      streamingContent: '',
      isStreaming: false,
      currentRequestId: null,
      turnNumber: state.turnNumber + 1
    }))
  },

  _onError: (requestId, message) => {
    if (requestId !== get().currentRequestId) return
    set({ error: message, isStreaming: false, streamingContent: '', currentRequestId: null })
  }
}))

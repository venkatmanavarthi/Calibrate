import type { ExperienceProfile, InterviewConfig, InterviewMessage } from '../../../../src/types/models'
import type { Message } from '../types'

function buildSystemPrompt(
  config: InterviewConfig,
  profile: ExperienceProfile | null,
  turnNumber: number
): string {
  const durationNote = `Interview duration: approximately ${config.durationMinutes} minutes.`
  const isFirst = turnNumber === 1
  const turnNote = isFirst ? 'This is the START of the interview.' : `This is turn ${turnNumber} of the interview.`

  switch (config.type) {
    case 'job-fit':
      return buildJobFitPrompt(config, profile, durationNote, turnNote, isFirst)
    case 'leetcode':
      return buildLeetcodePrompt(durationNote, turnNote, isFirst)
    case 'system-design':
      return buildSystemDesignPrompt(durationNote, turnNote, isFirst)
    case 'topic':
      return buildTopicPrompt(config.topics ?? [], durationNote, turnNote, isFirst)
  }
}

function buildJobFitPrompt(
  config: InterviewConfig,
  profile: ExperienceProfile | null,
  durationNote: string,
  turnNote: string,
  isFirst: boolean
): string {
  let profileSection = ''
  if (profile) {
    const name = profile.personalInfo.fullName
    const currentRole = profile.workHistory[0]
    const skills = profile.skills.slice(0, 12).join(', ')
    const workHistory = profile.workHistory
      .map(w => `${w.title} at ${w.company} (${w.startDate} – ${w.endDate})`)
      .join('; ')
    profileSection = `
Candidate: ${name}
${currentRole ? `Current/Last role: ${currentRole.title} at ${currentRole.company}` : ''}
Key skills: ${skills}
Work history: ${workHistory}
`
  }

  const jobSection = config.jobDescription
    ? `\nJob Description:\n${config.jobDescription}\n`
    : ''

  const startInstruction = isFirst
    ? 'Introduce yourself in one sentence and ask your first interview question. Do NOT say "I am an AI" or "I am here to help you practice".'
    : ''

  return `You are a professional hiring manager conducting a job interview.
${profileSection}${jobSection}
Your interviewing style:
- Ask a balanced mix of behavioral questions (STAR format) and role-relevant technical questions
- Follow up naturally when the candidate gives an interesting or incomplete answer
- Be professional and conversational — like a real senior-level interviewer would be
- After each answer, either ask a follow-up OR transition to a new question
- Keep each response concise: one brief acknowledgment + one question
- Only speak as the interviewer; do not play both sides

${durationNote}
${turnNote}
${startInstruction}`
}

function buildLeetcodePrompt(durationNote: string, turnNote: string, isFirst: boolean): string {
  const startInstruction = isFirst
    ? 'Introduce yourself in one sentence and present your first coding/algorithm problem. Start with an easy-to-medium difficulty problem.'
    : ''

  return `You are a technical interviewer conducting a coding/algorithms interview (LeetCode-style).

Your approach:
- Present coding/algorithm problems suitable for software engineering interviews
- Ask the candidate to explain their approach, data structures, and algorithm choice
- Follow up on time complexity (Big O), space complexity, and edge cases
- If the candidate gives a brute-force solution, probe for optimizations
- Provide a gentle nudge if the candidate is completely stuck, but don't give away the answer
- Do NOT expect actual runnable code — focus entirely on the problem-solving thought process
- Keep each response concise: acknowledge briefly + present the next challenge or follow-up

${durationNote}
${turnNote}
${startInstruction}`
}

function buildSystemDesignPrompt(durationNote: string, turnNote: string, isFirst: boolean): string {
  const startInstruction = isFirst
    ? 'Introduce yourself in one sentence and present a system design problem. Use the format: "Today, let\'s design [system]. To start, how would you approach this at a high level?"'
    : ''

  return `You are a senior software engineer conducting a system design interview.

Your approach:
- Present a large-scale system design problem (e.g., URL shortener, Twitter feed, ride-sharing)
- Guide the candidate through: requirements clarification, capacity estimation, high-level architecture, component deep dives, data modeling, API design
- Ask probing questions about scalability, availability, consistency trade-offs, and failure modes
- Discuss specific technology choices and their trade-offs (SQL vs NoSQL, queues, CDNs, caches)
- Be collaborative — this is a design discussion, not a test with a single right answer
- Follow up on specific components or decisions the candidate mentions
- Keep each response concise: acknowledge + ask a focused follow-up or move to the next area

${durationNote}
${turnNote}
${startInstruction}`
}

function buildTopicPrompt(
  topics: string[],
  durationNote: string,
  turnNote: string,
  isFirst: boolean
): string {
  const topicList = topics.length > 0 ? topics.join(', ') : 'software engineering fundamentals'
  const firstTopic = topics[0] ?? 'the first topic'
  const startInstruction = isFirst
    ? `Introduce yourself in one sentence and ask your first question about ${firstTopic}.`
    : ''

  return `You are a technical interviewer testing knowledge of: ${topicList}.

Your approach:
- Ask questions ranging from foundational to advanced across the specified topics
- Mix conceptual questions ("What is X?"), practical scenarios ("How would you handle Y?"), and debugging questions
- Cover all listed topics throughout the interview — don't dwell on one topic too long
- Acknowledge good answers briefly before moving on
- Ask natural follow-up questions to probe depth of understanding
- Keep each response concise: brief acknowledgment + next question

Topics to cover: ${topicList}
${durationNote}
${turnNote}
${startInstruction}`
}

export function buildInterviewMessages(
  config: InterviewConfig,
  profile: ExperienceProfile | null,
  messages: InterviewMessage[],
  turnNumber: number
): Message[] {
  const systemContent = buildSystemPrompt(config, profile, turnNumber)

  if (messages.length === 0) {
    return [
      { role: 'system', content: systemContent },
      { role: 'user', content: 'Please begin the interview.' }
    ]
  }

  const chatMessages: Message[] = messages.map(msg => ({
    role: msg.role === 'interviewer' ? 'assistant' as const : 'user' as const,
    content: msg.content
  }))

  return [
    { role: 'system', content: systemContent },
    ...chatMessages
  ]
}

export function buildInterviewScoreMessages(
  config: InterviewConfig,
  messages: InterviewMessage[],
  profile: ExperienceProfile | null
): Message[] {
  const transcript = messages
    .map(msg => `${msg.role === 'interviewer' ? 'INTERVIEWER' : 'CANDIDATE'}: ${msg.content}`)
    .join('\n\n')

  let contextInfo: string
  switch (config.type) {
    case 'job-fit':
      contextInfo = `Interview type: Job Fit Interview\n${profile ? `Candidate: ${profile.personalInfo.fullName}` : ''}\n${config.jobDescription ? `Role context: ${config.jobDescription.slice(0, 300)}...` : ''}`
      break
    case 'leetcode':
      contextInfo = 'Interview type: Coding / Algorithms (LeetCode-style)'
      break
    case 'system-design':
      contextInfo = 'Interview type: System Design'
      break
    case 'topic':
      contextInfo = `Interview type: Topic-Based\nTopics covered: ${(config.topics ?? []).join(', ')}`
      break
  }

  const systemPrompt = `You are an expert interview coach providing detailed, actionable feedback on a job interview.

${contextInfo}

Evaluate the candidate's performance based on the transcript below. Be fair but honest — a score above 80 means the candidate would likely pass this round.

Return ONLY a valid JSON object. No code fences, no prose outside the JSON:
{
  "overall": number,
  "technical": number,
  "communication": number,
  "problemSolving": number,
  "strengths": string[],
  "improvements": string[],
  "recommendation": "strong_yes" | "yes" | "maybe" | "no",
  "summary": string,
  "questionFeedback": [
    {
      "question": string,
      "answerSummary": string,
      "score": number,
      "feedback": string
    }
  ]
}

Scoring guide (0–100 each dimension):
- overall: weighted average of all dimensions
- technical: accuracy, depth, and correctness of technical content
- communication: clarity, structure, and ability to explain ideas
- problemSolving: approach to problems, trade-off analysis, and logical reasoning
- recommendation: "strong_yes" (85+), "yes" (70–84), "maybe" (55–69), "no" (<55)

For questionFeedback: include one entry per distinct interviewer question (skip pleasantries). "answerSummary" should be 1–2 sentences summarizing what the candidate said.`

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Interview Transcript:\n\n${transcript}\n\nPlease evaluate this interview and return the JSON scorecard.` }
  ]
}

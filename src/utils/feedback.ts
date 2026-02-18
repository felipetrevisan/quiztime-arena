export type FeedbackTone = 'info' | 'success' | 'error'

export interface FeedbackEvent {
  message: string
  tone?: FeedbackTone
  durationMs?: number
}

type FeedbackListener = (event: Required<FeedbackEvent>) => void

const listeners = new Set<FeedbackListener>()

export const subscribeFeedback = (listener: FeedbackListener): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const pushFeedback = ({ message, tone = 'info', durationMs = 3600 }: FeedbackEvent) => {
  const trimmedMessage = message.trim()
  if (!trimmedMessage) {
    return
  }

  const payload: Required<FeedbackEvent> = {
    message: trimmedMessage,
    tone,
    durationMs: Math.max(1200, durationMs),
  }

  for (const listener of listeners) {
    listener(payload)
  }
}

export const notifySuccess = (message: string, durationMs?: number) =>
  pushFeedback({ message, tone: 'success', durationMs })

export const notifyError = (message: string, durationMs?: number) =>
  pushFeedback({ message, tone: 'error', durationMs })

export const notifyInfo = (message: string, durationMs?: number) =>
  pushFeedback({ message, tone: 'info', durationMs })

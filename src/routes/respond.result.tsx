import { useQuizApp } from '@/context/quiz-app-context'
import { RespondResultScreen } from '@/pages/RespondResultScreen'
import { createFileRoute } from '@tanstack/react-router'
import { useCallback } from 'react'

export const Route = createFileRoute('/respond/result')({
  component: RespondResultRoute,
})

function RespondResultRoute() {
  const { handleSubmitResponderResult, responderName, sharedQuiz, sharedResult } = useQuizApp()

  const submitResult = useCallback(async () => {
    return handleSubmitResponderResult()
  }, [handleSubmitResponderResult])

  if (!sharedQuiz || !sharedResult) {
    return null
  }

  return (
    <RespondResultScreen
      score={sharedResult.score}
      total={sharedResult.total}
      levelTitle={sharedQuiz.level.title}
      responderName={responderName}
      onSubmitResult={submitResult}
      onOpenRanking={() => {
        window.location.assign(`/ranking?ranking=${encodeURIComponent(sharedQuiz.quizId)}`)
      }}
    />
  )
}

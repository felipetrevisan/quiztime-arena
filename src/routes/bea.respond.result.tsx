import { useQuizApp } from '@/context/quiz-app-context'
import { RespondResultScreen } from '@/pages/RespondResultScreen'
import { createFileRoute } from '@tanstack/react-router'
import { useCallback } from 'react'

export const Route = createFileRoute('/bea/respond/result')({
  component: BeaRespondResultRoute,
})

function BeaRespondResultRoute() {
  const { goHome, goPlay, handleSubmitResponderResult, responderName, sharedQuiz, sharedResult } =
    useQuizApp()

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
      points={sharedResult.points}
      durationMs={sharedResult.durationMs}
      playMode={sharedResult.playMode}
      levelTitle={sharedQuiz.level.title}
      responderName={responderName}
      onSubmitResult={submitResult}
      onOpenRanking={() => {
        void handleSubmitResponderResult().finally(() => {
          window.location.assign(`/bea/ranking?ranking=${encodeURIComponent(sharedQuiz.quizId)}`)
        })
      }}
      onOpenPlay={goPlay}
      onOpenHome={goHome}
    />
  )
}

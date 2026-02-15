import { useQuizApp } from '@/context/quiz-app-context'
import { RespondResultScreen } from '@/pages/RespondResultScreen'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/respond/result')({
  component: RespondResultRoute,
})

function RespondResultRoute() {
  const {
    handleBuildSubmissionLink,
    handleResponderAvatarUpload,
    responderAvatarDataUrl,
    responderName,
    setResponderName,
    sharedQuiz,
    sharedResult,
  } = useQuizApp()

  if (!sharedQuiz || !sharedResult) {
    return null
  }

  return (
    <RespondResultScreen
      score={sharedResult.score}
      total={sharedResult.total}
      levelTitle={sharedQuiz.level.title}
      responderName={responderName}
      responderAvatarDataUrl={responderAvatarDataUrl}
      onResponderNameChange={setResponderName}
      onResponderAvatarUpload={(file) => {
        void handleResponderAvatarUpload(file)
      }}
      onBuildSubmissionLink={handleBuildSubmissionLink}
    />
  )
}

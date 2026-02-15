import { useQuizApp } from '@/context/quiz-app-context'
import { CategoriesScreen } from '@/pages/CategoriesScreen'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/categories')({
  component: CategoriesRoute,
})

function CategoriesRoute() {
  const { categories, goHome, goLevels, setSelectedCategoryId, setSelectedLevelId, setSharedQuiz } =
    useQuizApp()

  return (
    <CategoriesScreen
      categories={categories}
      onBack={goHome}
      onSelect={(categoryId) => {
        setSharedQuiz(null)
        setSelectedCategoryId(categoryId)
        setSelectedLevelId('')
        goLevels(categoryId)
      }}
    />
  )
}

import { useQuizApp } from '@/context/quiz-app-context'
import { CategoriesScreen } from '@/pages/CategoriesScreen'
import { Outlet, createFileRoute, useMatchRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/bea/categories')({
  component: BeaCategoriesRoute,
})

function BeaCategoriesRoute() {
  const matchRoute = useMatchRoute()
  const { categories, goHome, goLevels, setSelectedCategoryId, setSelectedLevelId, setSharedQuiz } =
    useQuizApp()
  const isCategoriesIndex = Boolean(
    matchRoute({
      to: '/bea/categories',
      fuzzy: false,
    }),
  )

  if (!isCategoriesIndex) {
    return <Outlet />
  }

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

import { useQuizApp } from '@/context/quiz-app-context'
import { LevelsScreen } from '@/pages/LevelsScreen'
import { Outlet, createFileRoute, useMatchRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/categories/$categoryId/levels')({
  component: LevelsRoute,
})

function LevelsRoute() {
  const { categoryId } = Route.useParams()
  const matchRoute = useMatchRoute()
  const {
    categories,
    goCategories,
    openLevel,
    records,
    rankingPreviewLinks,
    selectedCategory,
    selectedCategoryId,
    setSelectedCategoryId,
    shareLinks,
    shortLinks,
    handleCopyShareLink,
    handleGenerateShareLink,
    handleShareRankingPreview,
    handleShortenShareLink,
  } = useQuizApp()

  const isLevelsIndex = Boolean(
    matchRoute({
      to: '/categories/$categoryId/levels',
      params: { categoryId },
      fuzzy: false,
    }),
  )

  useEffect(() => {
    if (selectedCategoryId !== categoryId) {
      setSelectedCategoryId(categoryId)
    }
  }, [categoryId, selectedCategoryId, setSelectedCategoryId])

  if (!isLevelsIndex) {
    return <Outlet />
  }

  const category = categories.find((item) => item.id === categoryId) ?? selectedCategory
  if (!category) {
    return null
  }

  return (
    <LevelsScreen
      category={category}
      records={records}
      shareLinks={shareLinks}
      rankingPreviewLinks={rankingPreviewLinks}
      shortLinks={shortLinks}
      onBack={goCategories}
      onSelectLevel={(levelId) => openLevel(category.id, levelId)}
      onShareLevel={handleGenerateShareLink}
      onCopyShareLink={handleCopyShareLink}
      onShareRankingPreview={handleShareRankingPreview}
      onShortenShareLink={handleShortenShareLink}
    />
  )
}

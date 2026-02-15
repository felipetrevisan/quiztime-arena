import { useQuizApp } from '@/context/quiz-app-context'
import { LevelsScreen } from '@/pages/LevelsScreen'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/categories/$categoryId/levels')({
  component: LevelsRoute,
})

function LevelsRoute() {
  const { categoryId } = Route.useParams()
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

  useEffect(() => {
    if (selectedCategoryId !== categoryId) {
      setSelectedCategoryId(categoryId)
    }
  }, [categoryId, selectedCategoryId, setSelectedCategoryId])

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

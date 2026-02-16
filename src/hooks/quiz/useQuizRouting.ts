import { useLocation, useNavigate } from '@tanstack/react-router'
import { useCallback, useMemo } from 'react'

import { getScreenFromPath } from './shared'

const appRoutes = {
  home: '/',
  builder: '/builder',
  categories: '/categories',
  levels: '/categories/$categoryId/levels',
  quiz: '/categories/$categoryId/levels/$levelId/quiz',
  levelResult: '/categories/$categoryId/levels/$levelId/result',
  final: '/final',
  ranking: '/ranking',
  myQuizzes: '/my-quizzes',
  respondResult: '/respond/result',
} as const

export const screenVariants = {
  initial: { opacity: 0, x: 42 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -42 },
}

export const useQuizRouting = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const pathState = useMemo(() => getScreenFromPath(location.pathname), [location.pathname])
  const screen = pathState.screen

  const goHome = useCallback(() => {
    void navigate({ to: appRoutes.home })
  }, [navigate])

  const goBuilder = useCallback(() => {
    void navigate({ to: appRoutes.builder })
  }, [navigate])

  const goCategories = useCallback(() => {
    void navigate({ to: appRoutes.categories })
  }, [navigate])

  const goLevels = useCallback(
    (categoryId: string) => {
      void navigate({
        to: appRoutes.levels,
        params: { categoryId },
      })
    },
    [navigate],
  )

  const goQuiz = useCallback(
    (categoryId: string, levelId: string) => {
      void navigate({
        to: appRoutes.quiz,
        params: { categoryId, levelId },
      })
    },
    [navigate],
  )

  const goLevelResult = useCallback(
    (categoryId: string, levelId: string) => {
      void navigate({
        to: appRoutes.levelResult,
        params: { categoryId, levelId },
      })
    },
    [navigate],
  )

  const goFinal = useCallback(() => {
    void navigate({ to: appRoutes.final })
  }, [navigate])

  const goRanking = useCallback(() => {
    void navigate({ to: appRoutes.ranking })
  }, [navigate])

  const goMyQuizzes = useCallback(() => {
    void navigate({ to: appRoutes.myQuizzes })
  }, [navigate])

  const goRespondResult = useCallback(() => {
    void navigate({ to: appRoutes.respondResult })
  }, [navigate])

  return {
    location,
    pathState,
    routeKey: location.pathname,
    screen,
    goHome,
    goBuilder,
    goCategories,
    goLevels,
    goQuiz,
    goLevelResult,
    goFinal,
    goRanking,
    goMyQuizzes,
    goRespondResult,
  }
}

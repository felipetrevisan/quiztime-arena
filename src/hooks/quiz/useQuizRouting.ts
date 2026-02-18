import { useLocation, useNavigate } from '@tanstack/react-router'
import { useCallback, useMemo } from 'react'

import { getScreenFromPath } from './shared'

const appRoutes = {
  home: '/',
  builder: '/builder',
  categories: '/categories',
  play: '/play',
  levels: '/categories/$categoryId/levels',
  quiz: '/categories/$categoryId/levels/$levelId/quiz',
  levelResult: '/categories/$categoryId/levels/$levelId/result',
  final: '/final',
  ranking: '/ranking',
  myQuizzes: '/my-quizzes',
  respondResult: '/respond/result',
} as const

const beaRoutes = {
  home: '/bea',
  builder: '/bea/builder',
  categories: '/bea/categories',
  play: '/bea/play',
  levels: '/bea/categories/$categoryId/levels',
  quiz: '/bea/categories/$categoryId/levels/$levelId/quiz',
  levelResult: '/bea/categories/$categoryId/levels/$levelId/result',
  final: '/bea/final',
  ranking: '/bea/ranking',
  myQuizzes: '/bea/my-quizzes',
  respondResult: '/bea/respond/result',
} as const

export const screenVariants = {
  initial: { opacity: 0, x: 42 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -42 },
}

export const useQuizRouting = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const isBeaScoped = location.pathname === '/bea' || location.pathname.startsWith('/bea/')
  const routes = isBeaScoped ? beaRoutes : appRoutes

  const pathState = useMemo(() => getScreenFromPath(location.pathname), [location.pathname])
  const screen = pathState.screen

  const goHome = useCallback(() => {
    void navigate({ to: routes.home })
  }, [navigate, routes.home])

  const goBuilder = useCallback(() => {
    void navigate({ to: routes.builder })
  }, [navigate, routes.builder])

  const goCategories = useCallback(() => {
    void navigate({ to: routes.categories })
  }, [navigate, routes.categories])

  const goPlay = useCallback(() => {
    void navigate({ to: routes.play })
  }, [navigate, routes.play])

  const goLevels = useCallback(
    (categoryId: string) => {
      void navigate({
        to: routes.levels,
        params: { categoryId },
      })
    },
    [navigate, routes.levels],
  )

  const goQuiz = useCallback(
    (categoryId: string, levelId: string) => {
      void navigate({
        to: routes.quiz,
        params: { categoryId, levelId },
      })
    },
    [navigate, routes.quiz],
  )

  const goLevelResult = useCallback(
    (categoryId: string, levelId: string) => {
      void navigate({
        to: routes.levelResult,
        params: { categoryId, levelId },
      })
    },
    [navigate, routes.levelResult],
  )

  const goFinal = useCallback(() => {
    void navigate({ to: routes.final })
  }, [navigate, routes.final])

  const goRanking = useCallback(() => {
    void navigate({ to: routes.ranking })
  }, [navigate, routes.ranking])

  const goMyQuizzes = useCallback(() => {
    void navigate({ to: routes.myQuizzes })
  }, [navigate, routes.myQuizzes])

  const goRespondResult = useCallback(() => {
    void navigate({ to: routes.respondResult })
  }, [navigate, routes.respondResult])

  return {
    location,
    pathState,
    routeKey: location.pathname,
    screen,
    goHome,
    goBuilder,
    goCategories,
    goPlay,
    goLevels,
    goQuiz,
    goLevelResult,
    goFinal,
    goRanking,
    goMyQuizzes,
    goRespondResult,
  }
}

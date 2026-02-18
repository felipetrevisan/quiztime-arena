import { useQuizApp } from '@/context/quiz-app-context'
import { HomeScreen } from '@/pages/HomeScreen'
import { setActivePersonaAlias } from '@/utils/persona'
import { Outlet, createFileRoute, useMatchRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/bea')({
  component: BeaAliasRoute,
})

function BeaAliasRoute() {
  const matchRoute = useMatchRoute()
  const { goBuilder, goCategories, goMyQuizzes, goPlay, goRanking, hasSession, isAdmin } =
    useQuizApp()
  const isBeaHome = Boolean(
    matchRoute({
      to: '/bea',
      fuzzy: false,
    }),
  )

  useEffect(() => {
    setActivePersonaAlias('bea')
  }, [])

  if (!isBeaHome) {
    return <Outlet />
  }

  return (
    <HomeScreen
      isAdmin={isAdmin}
      canOpenPlay={hasSession}
      onStart={goCategories}
      onOpenPlay={goPlay}
      onOpenBuilder={goBuilder}
      onOpenRanking={goRanking}
      onOpenMyQuizzes={goMyQuizzes}
      canOpenMyQuizzes={hasSession}
    />
  )
}

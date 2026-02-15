import { AnswerSheet } from '@/components/AnswerSheet'
import { Frame } from '@/components/Frame'
import { Header } from '@/components/Header'
import { QuizAppProvider } from '@/context/quiz-app-context'
import { screenVariants, useQuizAppController } from '@/hooks/useQuizAppController'
import { AccessDeniedScreen } from '@/pages/AccessDeniedScreen'
import { AuthScreen } from '@/pages/AuthScreen'
import { Outlet } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'

function App() {
  const {
    contextValue,
    routeKey,
    centerMainContent,
    canAccessMode,
    requiresAuth,
    authLoading,
    hasSession,
    isAdmin,
    accessMode,
    session,
    handleGoogleLogin,
    handleSignOut,
    activeTheme,
    frameImage,
    headerTitle,
    headerSubtitle,
    selectedLevel,
    activeRecord,
    answers,
    results,
    uploadedImages,
    isResponderMode,
    isRankingPreviewMode,
    config,
    showSignOutButton,
  } = useQuizAppController()

  const protectedContent = (() => {
    if (!requiresAuth) {
      return <Outlet />
    }

    if (authLoading) {
      return (
        <section className="mt-6 flex flex-1 items-center justify-center">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white/75">
            Carregando login...
          </p>
        </section>
      )
    }

    if (!hasSession) {
      return <AuthScreen mode={accessMode} onGoogleLogin={() => void handleGoogleLogin()} />
    }

    if (accessMode === 'admin' && !isAdmin) {
      return (
        <AccessDeniedScreen email={session?.user.email} onSignOut={() => void handleSignOut()} />
      )
    }

    return <Outlet />
  })()

  return (
    <QuizAppProvider value={contextValue}>
      <div
        className={`min-h-screen bg-[#080915] px-3 py-4 sm:px-6 ${
          centerMainContent ? 'flex items-center justify-center' : ''
        }`}
      >
        <div className="mx-auto flex w-full max-w-[460px] flex-col gap-4">
          {showSignOutButton && (
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="rounded-xl border border-white/25 bg-black/30 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/80"
            >
              Sair ({session?.user.email})
            </button>
          )}

          <Frame
            frameRef={contextValue.frameRef}
            theme={activeTheme}
            backgroundImage={isResponderMode ? null : frameImage}
          >
            <Header
              title={headerTitle}
              subtitle={headerSubtitle}
              headerColor={activeTheme.headerColor}
            />
            <AnimatePresence mode="wait">
              <motion.div
                key={routeKey}
                variants={screenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="min-h-0 flex-1 overflow-hidden"
              >
                {protectedContent}
              </motion.div>
            </AnimatePresence>
          </Frame>
        </div>

        {!isResponderMode && !isRankingPreviewMode && canAccessMode && selectedLevel && (
          <div className="pointer-events-none fixed -left-[99999px] top-0">
            <div ref={contextValue.sheetRef}>
              <AnswerSheet
                theme={activeTheme}
                title={config.title}
                subtitle={config.subtitle}
                level={selectedLevel}
                answers={activeRecord?.answers ?? answers}
                results={activeRecord?.results ?? results}
                imageOverrides={uploadedImages}
              />
            </div>
          </div>
        )}
      </div>
    </QuizAppProvider>
  )
}

export default App

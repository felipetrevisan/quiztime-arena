import type { ThemeOption } from '@/types/quiz'
import { motion } from 'motion/react'
import type { CSSProperties, PropsWithChildren, RefObject } from 'react'

interface FrameProps extends PropsWithChildren {
  frameRef?: RefObject<HTMLDivElement>
  theme: ThemeOption
  backgroundImage: string | null
}

export const Frame = ({ frameRef, theme, backgroundImage, children }: FrameProps) => {
  const style: CSSProperties = {
    backgroundImage: backgroundImage
      ? `linear-gradient(140deg, rgba(0,0,0,0.66), rgba(0,0,0,0.35)), url(${backgroundImage}), linear-gradient(140deg, ${theme.gradientFrom}, ${theme.gradientVia}, ${theme.gradientTo})`
      : `linear-gradient(140deg, ${theme.gradientFrom}, ${theme.gradientVia}, ${theme.gradientTo})`,
    color: theme.textColor,
  }

  return (
    <motion.div
      ref={frameRef}
      initial={{ opacity: 0, scale: 0.97, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="relative mx-auto w-full max-w-[460px] overflow-hidden rounded-[2.2rem] border border-white/20 shadow-glow"
      style={style}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(${theme.patternDot} 1.5px, transparent 1.5px)`,
          backgroundSize: '14px 14px',
          opacity: 0.75,
        }}
      />

      <div className="relative aspect-[9/16] w-full overflow-hidden">
        <div className="absolute inset-0 backdrop-blur-[1.8px]" />
        <div className="relative z-10 flex h-full flex-col px-4 py-5 sm:px-5 sm:py-6">
          {children}
        </div>
      </div>
    </motion.div>
  )
}

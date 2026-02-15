import { motion } from 'motion/react'

interface ProgressBarProps {
  value: number
  accentColor: string
}

export const ProgressBar = ({ value, accentColor }: ProgressBarProps) => {
  const safeValue = Math.max(0, Math.min(100, value))

  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-black/35">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: accentColor }}
        initial={{ width: 0 }}
        animate={{ width: `${safeValue}%` }}
        transition={{ type: 'spring', stiffness: 110, damping: 20 }}
      />
    </div>
  )
}

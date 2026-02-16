export const getBadge = (percent: number): string => {
  if (percent >= 90) return 'Lendaria'
  if (percent >= 70) return 'Boa demais'
  if (percent >= 45) return 'Quase la'
  return 'KKK a gente tenta'
}

export const getComment = (percent: number): string => {
  if (percent >= 90) return 'Voce destruiu o quiz. O trofeu ficou pequeno pra voce.'
  if (percent >= 70) return 'Mandou muito bem! Nivel protagonista desbloqueado.'
  if (percent >= 45) return 'Foi por pouco. Mais uma rodada e vira lenda.'
  return 'A energia ta boa. Bora pra revanche com cafe e foco.'
}

export const calculateSpeedrunPoints = (
  score: number,
  total: number,
  durationMs: number,
): number => {
  const safeTotal = Math.max(total, 1)
  const safeDurationMs = Math.max(durationMs, 1000)
  const accuracyPoints = score * 100
  const maxTimeBonus = safeTotal * 50
  const durationSeconds = Math.round(safeDurationMs / 1000)
  const timePenalty = durationSeconds * 2
  const speedBonus = Math.max(0, maxTimeBonus - timePenalty)
  return accuracyPoints + speedBonus
}

export const formatDuration = (durationMs: number): string => {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

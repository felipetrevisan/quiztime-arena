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

import { toPng } from 'html-to-image'
import { type RefObject, useState } from 'react'

interface ExportButtonProps {
  targetRef: RefObject<HTMLElement>
  fileName: string
  label: string
  className?: string
}

export const ExportButton = ({ targetRef, fileName, label, className = '' }: ExportButtonProps) => {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (!targetRef.current || isExporting) {
      return
    }

    setIsExporting(true)

    try {
      const dataUrl = await toPng(targetRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      })

      const anchor = document.createElement('a')
      anchor.href = dataUrl
      anchor.download = fileName
      anchor.click()
    } catch (error) {
      console.error('Erro ao exportar imagem', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isExporting}
      className={`rounded-xl border border-white/30 bg-black/35 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] transition hover:bg-black/50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {isExporting ? 'Exportando...' : label}
    </button>
  )
}

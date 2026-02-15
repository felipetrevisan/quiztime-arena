import { ThemePicker } from '@/components/ThemePicker'
import type { ThemeId, ThemeOption } from '@/types/quiz'
import type { ChangeEvent } from 'react'

interface ConfigPanelProps {
  title: string
  subtitle: string
  themeId: ThemeId
  themes: ThemeOption[]
  onTitleChange: (value: string) => void
  onSubtitleChange: (value: string) => void
  onThemeChange: (themeId: ThemeId) => void
  onBackgroundUpload: (event: ChangeEvent<HTMLInputElement>) => void
}

export const ConfigPanel = ({
  title,
  subtitle,
  themeId,
  themes,
  onTitleChange,
  onSubtitleChange,
  onThemeChange,
  onBackgroundUpload,
}: ConfigPanelProps) => {
  return (
    <aside className="space-y-3 rounded-3xl border border-white/20 bg-black/35 p-4 text-white shadow-xl backdrop-blur-sm">
      <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-white">
        Config
      </h2>

      <div className="space-y-2">
        <label
          htmlFor="cfg-title"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80"
        >
          Titulo
        </label>
        <input
          id="cfg-title"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          className="w-full rounded-xl border border-white/30 bg-black/35 px-3 py-2 text-sm outline-none transition focus:border-white"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="cfg-subtitle"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80"
        >
          Subtitulo
        </label>
        <input
          id="cfg-subtitle"
          value={subtitle}
          onChange={(event) => onSubtitleChange(event.target.value)}
          className="w-full rounded-xl border border-white/30 bg-black/35 px-3 py-2 text-sm outline-none transition focus:border-white"
        />
      </div>

      <ThemePicker themes={themes} value={themeId} onChange={onThemeChange} />

      <div className="space-y-2">
        <label
          htmlFor="cfg-background"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80"
        >
          Fundo custom
        </label>
        <input
          id="cfg-background"
          type="file"
          accept="image/*"
          onChange={onBackgroundUpload}
          className="block w-full text-xs text-white/90 file:mr-3 file:rounded-lg file:border-0 file:bg-white/85 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-900 hover:file:bg-white"
        />
      </div>
    </aside>
  )
}

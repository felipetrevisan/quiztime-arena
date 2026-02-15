import type { ThemeId, ThemeOption } from '@/types/quiz'

interface ThemePickerProps {
  themes: ThemeOption[]
  value: ThemeId
  onChange: (themeId: ThemeId) => void
}

export const ThemePicker = ({ themes, value, onChange }: ThemePickerProps) => {
  return (
    <div className="space-y-2">
      <label
        htmlFor="theme-picker"
        className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80"
      >
        Tema
      </label>
      <select
        id="theme-picker"
        value={value}
        onChange={(event) => onChange(event.target.value as ThemeId)}
        className="w-full rounded-xl border border-white/30 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-white"
      >
        {themes.map((theme) => (
          <option key={theme.id} value={theme.id} className="bg-slate-900">
            {theme.label}
          </option>
        ))}
      </select>
    </div>
  )
}

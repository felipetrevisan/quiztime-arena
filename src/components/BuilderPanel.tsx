import type { Category, LevelMode } from '@/types/quiz'
import { useMemo, useState } from 'react'

interface BuilderPanelProps {
  categories: Category[]
  onAddCategory: (category: Category) => void
  onAddLevel: (
    categoryId: string,
    levelTitle: string,
    levelDescription: string,
    mode: LevelMode,
  ) => void
}

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')

export const BuilderPanel = ({ categories, onAddCategory, onAddLevel }: BuilderPanelProps) => {
  const [categoryTitle, setCategoryTitle] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  const [levelTitle, setLevelTitle] = useState('')
  const [levelDescription, setLevelDescription] = useState('')
  const [levelMode, setLevelMode] = useState<LevelMode>('quiz')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ id: category.id, label: category.title })),
    [categories],
  )

  return (
    <aside className="space-y-3 rounded-3xl border border-white/20 bg-black/35 p-4 text-white shadow-xl backdrop-blur-sm">
      <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em]">Builder</h2>
      <p className="text-xs text-white/75">
        Crie niveis com perguntas ou em branco com 8 alternativas.
      </p>

      <div className="space-y-2 rounded-xl border border-white/15 bg-black/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
          Nova categoria
        </p>
        <input
          value={categoryTitle}
          onChange={(event) => setCategoryTitle(event.target.value)}
          placeholder="Titulo"
          className="w-full rounded-lg border border-white/25 bg-black/30 px-2 py-2 text-sm"
        />
        <input
          value={categoryDescription}
          onChange={(event) => setCategoryDescription(event.target.value)}
          placeholder="Descricao"
          className="w-full rounded-lg border border-white/25 bg-black/30 px-2 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            if (!categoryTitle.trim()) return

            const id = slugify(categoryTitle)
            onAddCategory({
              id,
              title: categoryTitle.trim(),
              subtitle: 'Personalizada',
              description: categoryDescription.trim() || 'Categoria criada no builder.',
              coverImage: '/assets/covers/builder.svg',
              levels: [],
            })
            setCategoryTitle('')
            setCategoryDescription('')
            setCategoryId(id)
          }}
          className="w-full rounded-lg border border-white/25 bg-white/90 px-2 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-900"
        >
          Adicionar categoria
        </button>
      </div>

      <div className="space-y-2 rounded-xl border border-white/15 bg-black/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Novo nivel</p>
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="w-full rounded-lg border border-white/25 bg-black/30 px-2 py-2 text-sm"
        >
          {categoryOptions.map((option) => (
            <option key={option.id} value={option.id} className="bg-slate-900">
              {option.label}
            </option>
          ))}
        </select>
        <input
          value={levelTitle}
          onChange={(event) => setLevelTitle(event.target.value)}
          placeholder="Titulo do nivel"
          className="w-full rounded-lg border border-white/25 bg-black/30 px-2 py-2 text-sm"
        />
        <input
          value={levelDescription}
          onChange={(event) => setLevelDescription(event.target.value)}
          placeholder="Descricao"
          className="w-full rounded-lg border border-white/25 bg-black/30 px-2 py-2 text-sm"
        />
        <select
          value={levelMode}
          onChange={(event) => setLevelMode(event.target.value as LevelMode)}
          className="w-full rounded-lg border border-white/25 bg-black/30 px-2 py-2 text-sm"
          aria-label="Tipo de nivel"
        >
          <option value="quiz" className="bg-slate-900">
            Quiz com perguntas
          </option>
          <option value="blank" className="bg-slate-900">
            Quiz em branco (8 alternativas)
          </option>
        </select>
        <button
          type="button"
          onClick={() => {
            if (!categoryId || !levelTitle.trim()) return
            onAddLevel(
              categoryId,
              levelTitle.trim(),
              levelDescription.trim() || 'Novo nivel criado no builder.',
              levelMode,
            )
            setLevelTitle('')
            setLevelDescription('')
          }}
          className="w-full rounded-lg border border-white/25 bg-white/90 px-2 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-900"
        >
          Adicionar nivel
        </button>
      </div>
    </aside>
  )
}

import type { Category } from '@/types/quiz'
import { motion } from 'motion/react'

interface CategoriesScreenProps {
  categories: Category[]
  onBack: () => void
  onSelect: (categoryId: string) => void
}

export const CategoriesScreen = ({ categories, onBack, onSelect }: CategoriesScreenProps) => {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold uppercase tracking-[0.2em] text-white">
          Categorias
        </h2>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-white/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/80"
        >
          Voltar
        </button>
      </div>

      <motion.div
        variants={{
          hidden: {},
          show: {
            transition: {
              staggerChildren: 0.08,
            },
          },
        }}
        initial="hidden"
        animate="show"
        className="grid gap-3 overflow-auto pr-1"
      >
        {categories.map((category) => (
          <motion.button
            key={category.id}
            variants={{
              hidden: { opacity: 0, y: 16 },
              show: { opacity: 1, y: 0 },
            }}
            onClick={() => onSelect(category.id)}
            className="group flex items-center gap-3 rounded-2xl border border-white/25 bg-black/35 p-3 text-left transition hover:bg-black/45"
          >
            <img
              src={category.coverImage}
              alt={category.title}
              className="h-14 w-14 rounded-xl border border-white/25 object-cover"
            />
            <div className="min-w-0">
              <h3 className="truncate font-display text-sm font-bold uppercase tracking-[0.14em] text-white">
                {category.title}
              </h3>
              <p className="text-xs text-white/75">{category.subtitle}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-white/80">
                {category.levels.length} niveis
              </p>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </section>
  )
}

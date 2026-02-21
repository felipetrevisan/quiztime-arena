import { BuilderPanel, type BuilderPanelSection } from '@/components/BuilderPanel'
import { ConfigPanel } from '@/components/ConfigPanel'
import type {
  AnswerMode,
  Category,
  LevelMode,
  QuestionImageSuggestion,
  ThemeId,
  ThemeOption,
  TimingMode,
} from '@/types/quiz'
import type { ChangeEvent } from 'react'
import { useState } from 'react'

type BuilderTab = 'config' | BuilderPanelSection

interface BuilderScreenProps {
  title: string
  subtitle: string
  themeId: ThemeId
  themes: ThemeOption[]
  categories: Category[]
  onTitleChange: (value: string) => void
  onSubtitleChange: (value: string) => void
  onThemeChange: (themeId: ThemeId) => void
  onBackgroundUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onAddCategory: (category: Category) => void | Promise<void>
  onUpdateCategory: (
    categoryId: string,
    categoryTitle: string,
    categoryDescription: string,
  ) => Promise<boolean>
  onAddLevel: (
    categoryId: string,
    levelTitle: string,
    levelDescription: string,
    mode: LevelMode,
    timingMode: TimingMode,
    answerMode: AnswerMode,
    hideDefaultQuestionImage: boolean,
  ) => void | Promise<void>
  onGenerateLevelQuestions: (payload: {
    categoryId: string
    levelId: string
    themeHint: string
    difficulty: 'facil' | 'medio' | 'dificil' | 'insano'
    questionCount: number
  }) => Promise<number | null>
  onImportLevelQuestions: (payload: {
    categoryId: string
    levelId: string
    rawJson: string
  }) => Promise<number | null>
  onUpdateLevel: (
    categoryId: string,
    levelId: string,
    levelTitle: string,
    levelDescription: string,
    hideDefaultQuestionImage: boolean,
  ) => Promise<boolean>
  onUpdateQuestion: (payload: {
    categoryId: string
    levelId: string
    questionId: string
    prompt: string
    imagePath: string
    imageHint: string
    options: string[]
    correctIndex: number
    correctAnswerDisplay: string
    acceptedAnswers: string[]
  }) => void | Promise<void>
  onGenerateQuestionChoices: (payload: {
    categoryId: string
    levelId: string
    questionId: string
    prompt: string
    imagePath: string
    imageHint: string
    correctAnswerDisplay: string
    acceptedAnswers: string[]
  }) => Promise<string[] | null>
  onSuggestQuestionImages: (payload: {
    categoryId: string
    levelId: string
    questionId: string
    prompt: string
    imagePath: string
    imageHint: string
  }) => Promise<QuestionImageSuggestion[] | null>
  onUploadQuestionImage: (payload: {
    categoryId: string
    levelId: string
    questionId: string
    file: File
  }) => void | Promise<void>
  onBack: () => void
}

const tabs: Array<{ id: BuilderTab; label: string }> = [
  { id: 'config', label: 'Visual' },
  { id: 'category', label: 'Categorias' },
  { id: 'level', label: 'Niveis' },
  { id: 'answer', label: 'Gabarito' },
]

export const BuilderScreen = ({
  title,
  subtitle,
  themeId,
  themes,
  categories,
  onTitleChange,
  onSubtitleChange,
  onThemeChange,
  onBackgroundUpload,
  onAddCategory,
  onUpdateCategory,
  onAddLevel,
  onGenerateLevelQuestions,
  onImportLevelQuestions,
  onUpdateLevel,
  onUpdateQuestion,
  onGenerateQuestionChoices,
  onSuggestQuestionImages,
  onUploadQuestionImage,
  onBack,
}: BuilderScreenProps) => {
  const [activeTab, setActiveTab] = useState<BuilderTab>('config')

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0d1222]/85 p-4 backdrop-blur-sm lg:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/75">
            Painel admin
          </p>
          <h2 className="font-display text-lg font-bold uppercase tracking-[0.16em] text-white">
            Builder
          </h2>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-white/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/80"
        >
          Voltar
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/15 bg-black/25 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
            Categorias
          </p>
          <p className="mt-1 text-lg font-black text-white">{categories.length}</p>
        </div>
        <div className="rounded-xl border border-white/15 bg-black/25 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
            Niveis
          </p>
          <p className="mt-1 text-lg font-black text-white">
            {categories.reduce((count, category) => count + category.levels.length, 0)}
          </p>
        </div>
        <div className="rounded-xl border border-white/15 bg-black/25 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
            Perguntas
          </p>
          <p className="mt-1 text-lg font-black text-white">
            {categories.reduce(
              (count, category) =>
                count + category.levels.reduce((total, level) => total + level.questions.length, 0),
              0,
            )}
          </p>
        </div>
        <div className="rounded-xl border border-white/15 bg-black/25 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
            Publicados
          </p>
          <p className="mt-1 text-lg font-black text-white">
            {categories.reduce(
              (count, category) =>
                count + category.levels.filter((level) => Boolean(level.isPublished)).length,
              0,
            )}
          </p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-white/15 bg-black/25 p-2">
          <div className="space-y-2">
            {tabs.map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-xs font-bold uppercase tracking-[0.12em] transition ${
                    active
                      ? 'border-white/40 bg-white/90 text-slate-900'
                      : 'border-white/20 bg-black/25 text-white/80 hover:bg-black/35'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </aside>

        <div className="min-h-0 overflow-y-auto pr-1">
          {activeTab === 'config' ? (
            <ConfigPanel
              title={title}
              subtitle={subtitle}
              themeId={themeId}
              themes={themes}
              onTitleChange={onTitleChange}
              onSubtitleChange={onSubtitleChange}
              onThemeChange={onThemeChange}
              onBackgroundUpload={onBackgroundUpload}
            />
          ) : (
            <BuilderPanel
              categories={categories}
              section={activeTab}
              onAddCategory={onAddCategory}
              onUpdateCategory={onUpdateCategory}
              onAddLevel={onAddLevel}
              onGenerateLevelQuestions={onGenerateLevelQuestions}
              onImportLevelQuestions={onImportLevelQuestions}
              onUpdateLevel={onUpdateLevel}
              onUpdateQuestion={onUpdateQuestion}
              onGenerateQuestionChoices={onGenerateQuestionChoices}
              onSuggestQuestionImages={onSuggestQuestionImages}
              onUploadQuestionImage={onUploadQuestionImage}
            />
          )}
        </div>
      </div>
    </section>
  )
}

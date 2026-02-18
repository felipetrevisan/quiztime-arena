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
  onAddLevel: (
    categoryId: string,
    levelTitle: string,
    levelDescription: string,
    mode: LevelMode,
    timingMode: TimingMode,
    answerMode: AnswerMode,
  ) => void | Promise<void>
  onUpdateLevel: (
    categoryId: string,
    levelId: string,
    levelTitle: string,
    levelDescription: string,
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
  onAddLevel,
  onUpdateLevel,
  onUpdateQuestion,
  onGenerateQuestionChoices,
  onSuggestQuestionImages,
  onUploadQuestionImage,
  onBack,
}: BuilderScreenProps) => {
  const [activeTab, setActiveTab] = useState<BuilderTab>('config')

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-3 flex items-center justify-between gap-2">
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

      <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] transition ${
                active
                  ? 'border-white/40 bg-white/90 text-slate-900'
                  : 'border-white/25 bg-black/30 text-white/80'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
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
            onAddLevel={onAddLevel}
            onUpdateLevel={onUpdateLevel}
            onUpdateQuestion={onUpdateQuestion}
            onGenerateQuestionChoices={onGenerateQuestionChoices}
            onSuggestQuestionImages={onSuggestQuestionImages}
            onUploadQuestionImage={onUploadQuestionImage}
          />
        )}
      </div>
    </section>
  )
}

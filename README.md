# QuizTime Arena

App de quiz em formato vertical (9:16), com categorias e niveis, animacoes, exportacao PNG, compartilhamento por link, modo respondente e ranking.

## Stack

- Vite + React + TypeScript
- TailwindCSS
- Motion (`motion/react`)
- html-to-image
- vite-plugin-pwa
- Biome (lint + format)
- Bun

## Requisitos

- Bun instalado (`bun --version`)
- (Opcional) Projeto Supabase para persistencia remota

## Instalar dependencias

```bash
bun install
```

## Rodar em desenvolvimento

```bash
bun run dev
```

## PWA (instalavel e offline)

O app esta configurado como PWA com:

- `manifest.webmanifest` gerado automaticamente no build
- service worker com `autoUpdate`
- cache de assets locais (incluindo imagens de `public/assets`)
- icones em `public/pwa`

Para validar:

1. Rode `bun run build`.
2. Rode `bun run preview`.
3. Abra no navegador e instale (`Adicionar a tela inicial` no mobile ou `Install` no desktop).
4. Depois de abrir uma vez online, ele funciona offline com o conteudo cacheado.

## Supabase (persistencia + login social)

O app funciona sem backend, mas se voce configurar Supabase ele passa a salvar e carregar:

- categorias
- niveis
- perguntas
- ranking
- fotos/avatares (Storage)
- sessao/login (Google)

### 1) Criar variaveis de ambiente

Crie um `.env.local` baseado em `.env.example`:

```bash
cp .env.example .env.local
```

Preencha:

```env
VITE_SUPABASE_PROJECT_ID=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_ADMIN_EMAILS=seu-email@exemplo.com
```

### 2) Aplicar schema no Supabase

No SQL Editor do Supabase, execute:

- `supabase/schema.sql`

Esse arquivo cria:

- tabelas (`categories`, `levels`, `questions`, `rankings`, `admin_users`)
- bucket `quiz-assets`
- policies com auth:
  - leitura para usuarios autenticados
  - escrita somente admin

Depois, adicione seu email como admin:

```sql
insert into public.admin_users (email) values ('seu-email@exemplo.com')
on conflict (email) do nothing;
```

### 3) Configurar OAuth no Supabase Auth

No painel do Supabase:

1. `Authentication -> Providers -> Google` (habilitar e configurar client ID/secret).
2. Em `URL Configuration`, adicionar sua URL local e de producao como redirect.

Obs: TikTok nao e provider nativo no Supabase Auth. Para TikTok, use `OIDC` customizado.

### 4) Subir com fallback local

- Se as variaveis de Supabase estiverem definidas: usa banco/storage remoto.
- Se nao estiverem: continua usando localStorage.

## Build de producao

```bash
bun run build
bun run preview
```

## Lint

```bash
bun run lint
bun run lint:fix
```

## Como usar (modo admin)

1. Faça login com Google.
2. Use uma conta autorizada em `VITE_ADMIN_EMAILS` + `admin_users`.
3. Abra o app e clique em `Comecar`.
4. Escolha uma categoria.
5. Escolha um nivel.
6. Preencha respostas e clique em `Corrigir`.
7. Finalize o nivel para salvar pontuacao.
8. Use `Gerar link` para criar link de resposta para outra pessoa.
9. Use `Copiar link` para copiar rapidamente.
10. Use `Encurtar` para tentar gerar link curto automaticamente por API.
11. Use `Copiar ranking` para compartilhar o preview do ranking daquele quiz.

## Como usar (modo respondente)

1. Abra o link recebido (`?respond=...`).
2. Faça login com Google.
3. Nome e avatar sao preenchidos automaticamente (pode ajustar se quiser).
4. Responda as perguntas.
5. Clique em `Corrigir` e depois finalize.
6. Gere o `link de envio` do resultado.
7. Envie esse link para o criador do quiz.

## Ranking

- O criador abre o link de importacao (`?import=...`).
- O resultado e salvo no ranking local e, com Supabase ativo, tambem no banco remoto.
- O ranking mostra nome, avatar e pontuacao.
- Preview publico autenticado por quiz: `?ranking=<quizId>`.

## Tema e layout

- Tema, titulo e subtitulo sao editaveis no painel `Config`.
- O frame de quiz e 9:16 e responsivo.
- O modo respondente exibe apenas o card principal centralizado.

## Dados e conteudo

Arquivo principal de conteudo:

- `src/data/levels.ts`

Estrutura:

- `categories -> levels -> questions`

Cada pergunta suporta:

- `prompt`
- `imagePath`
- `acceptedAnswers`
- `correctAnswerDisplay`

## Upload de imagens

- Admin: pode fazer upload de imagem por alternativa/pergunta no modo que exibe foto.
- Respondente: pode fazer upload de avatar para aparecer no ranking.

## Exportacao PNG

- Resultado do nivel: `quiztime-nivel-<n>.png`
- Gabarito: `quiztime-gabarito-nivel-<n>.png`
- Resultado final: `quiztime-resultado-final.png`

## Persistencia

Salvo em `localStorage`:

- configuracao visual
- progresso por nivel
- rascunho do quiz
- ranking importado

Com Supabase ativo, esses dados tambem ficam persistidos remotamente.

## Observacoes

- Compartilhamento e importacao sao feitos por links codificados.
- Encurtamento tenta API automatica; se indisponivel, copia o link original.
- Sem `VITE_SUPABASE_PROJECT_ID` + `VITE_SUPABASE_PUBLISHABLE_KEY`, o app cai em modo local (sem login social).

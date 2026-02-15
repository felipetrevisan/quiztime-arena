# QuizTime Arena

App de quiz em formato vertical (9:16), com categorias e niveis, animacoes, exportacao PNG, compartilhamento por link, modo respondente e ranking local.

## Stack

- Vite + React + TypeScript
- TailwindCSS
- Motion (`motion/react`)
- html-to-image
- Biome (lint + format)
- Bun

## Requisitos

- Bun instalado (`bun --version`)

## Instalar dependencias

```bash
bun install
```

## Rodar em desenvolvimento

```bash
bun run dev
```

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

1. Abra o app e clique em `Comecar`.
2. Escolha uma categoria.
3. Escolha um nivel.
4. Preencha respostas e clique em `Corrigir`.
5. Finalize o nivel para salvar pontuacao.
6. Use `Gerar link` para criar link de resposta para outra pessoa.
7. Use `Copiar link` para copiar rapidamente.
8. Use `Encurtar` para tentar gerar link curto automaticamente por API.

## Como usar (modo respondente)

1. Abra o link recebido (`?respond=...`).
2. Preencha nome e avatar (opcional) do jogador.
3. Responda as perguntas.
4. Clique em `Corrigir` e depois finalize.
5. Gere o `link de envio` do resultado.
6. Envie esse link para o criador do quiz.

## Ranking

- O criador abre o link de importacao (`?import=...`).
- O resultado e salvo no ranking local (localStorage).
- O ranking mostra nome, avatar e pontuacao.

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

## Observacoes

- App sem backend.
- Compartilhamento e importacao feitos por links codificados.
- Encurtamento tenta API automatica; se indisponivel, o link original continua funcionando.

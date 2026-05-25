# Fluxus - Contexto do Software

Ultima atualizacao: 2026-05-25

## Visao geral

Fluxus e um SaaS academico independente para instituicoes de ensino.

Stack atual:
- Frontend: React, Tailwind CSS, lucide-react em `agenda-frontend`.
- Backend: Node.js, Express, Prisma e PostgreSQL em `agenda-backend`.
- Auth: JWT existente.
- Perfis: `admin`, `secretaria`, `coordenador`.

## Funcionalidades principais existentes

- Identidade visual Fluxus aplicada nas telas de autenticacao e no layout interno.
- Temas light/dark refinados com estetica SaaS premium.
- Sidebar interna com wordmark Fluxus, categorias recolhiveis e logout com confirmacao.
- Calendario academico com layout refinado e painel lateral dinamico.
- CRUD de compromissos com escopo por usuario/coordenador.
- Fluxo de aprovacoes para compromissos.
- Perfil do usuario com edicao de dados, senha e avatar com crop/zoom.
- Integracao Google Calendar para coordenadores.
- Notificacoes persistentes no backend com sino existente no frontend.
- Estados globais de loading/error no frontend.
- Fase 1 de estabilidade iniciada com erro padronizado, validacoes, paginacao opt-in, indices e auditoria minima.

## Regras importantes

- Coordenador so deve ver dados vinculados diretamente a ele.
- Secretaria e admin podem ver compromissos amplos conforme regra existente.
- Google Calendar e notificacoes nao devem expor dados entre coordenadores.
- Tokens sensiveis nao devem ir para o frontend.
- Toda mudanca futura deve atualizar este arquivo.

## Atualizacao - Auth motion premium

Data: 2026-05-25

Objetivo: refinar as animacoes da area visual/preview das telas de autenticacao sem alterar layout, identidade, rotas ou API.

Implementado:
- Corrigido o loop da barra `Status semanal` no preview do login.
- A barra passou a animar com `transform: scaleX` e `transform-origin: left`, evitando layout shift.
- Adicionada camada de brilho suave passando pela barra de progresso.
- Criadas classes CSS reutilizaveis para motion auth:
  - `auth-float-soft`
  - `auth-card-breathe`
  - `auth-timeline-loop`
  - `auth-progress-loop`
  - `auth-progress-shine`
  - `auth-icon-pulse`
  - `auth-stagger-1`
  - `auth-stagger-2`
  - `auth-stagger-3`
- Adicionadas microinteracoes discretas em loop:
  - floating vertical nos cards de agenda
  - fade/slide alternado nos itens da timeline
  - pulse sutil nos icones
  - variacao leve de profundidade/opacidade no preview
- Adicionado suporte a `prefers-reduced-motion: reduce`, removendo animacoes continuas para usuarios que preferem menos movimento.

Arquivos alterados:
- `agenda-frontend/src/pages/Login.jsx`
- `agenda-frontend/src/index.css`
- `CONTEXT.md`

Validacao obrigatoria:
- `cd agenda-frontend && npm run build`

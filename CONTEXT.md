# Fluxus - Contexto do Software

## FASE 2 - Correcoes criticas do calendario

Data: 2026-06-07

### Objetivo

Corrigir pontos criticos do calendario principal sem alterar identidade visual, autenticacao, regras de escopo, Google Calendar ou notificacoes existentes.

### Implementado

- O modal de criacao/edicao de compromisso em `agenda-frontend/src/pages/Calendario.jsx` passou a ter campos explicitos para:
  - data inicial;
  - hora inicial;
  - data final;
  - hora final.
- O botao de novo compromisso abre o modal com valores seguros para preenchimento manual.
- O clique em uma data/horario no FullCalendar continua funcionando e preenche automaticamente os mesmos campos do modal.
- O frontend valida:
  - titulo obrigatorio;
  - data/hora inicial obrigatorias;
  - data/hora final obrigatorias;
  - fim posterior ao inicio;
  - coordenador obrigatorio quando secretaria cria compromisso;
  - campo "Repetir ate" obrigatorio quando houver recorrencia.
- A edicao permanece limitada a uma ocorrencia individual. Edicao em massa de serie recorrente nao foi implementada nesta fase.
- A duplicacao cria uma copia simples do compromisso, sem gerar nova serie recorrente automaticamente.

### Recorrencia simples

- Foram adicionadas as opcoes no modal:
  - Nao repetir;
  - Diariamente;
  - Semanalmente;
  - Mensalmente.
- Quando a repeticao e diferente de "Nao repetir", o modal exibe o campo "Repetir ate".
- O backend em `agenda-backend/index.js` gera ocorrencias individuais no `POST /api/compromissos`.
- O limite maximo e de 60 ocorrencias por criacao recorrente.
- Cada ocorrencia individual preserva:
  - titulo;
  - descricao;
  - categoria;
  - coordenador;
  - curso;
  - status conforme regra de perfil;
  - usuario criador;
  - horario correspondente.
- A recorrencia diaria exigiu adicionar o valor `diaria` ao enum Prisma `Repeticao`.

### Google Calendar

- Compromissos simples continuam usando o fluxo existente.
- Para recorrencias aprovadas, cada ocorrencia criada tenta sincronizar com Google Calendar usando o helper seguro existente.
- Erros de Google Calendar continuam isolados pelo fluxo seguro e nao impedem a criacao local do compromisso.

### Banco e Prisma

- `agenda-backend/prisma/schema.prisma` foi atualizado para incluir `diaria` no enum `Repeticao`.
- `agenda-backend/schema.sql` foi atualizado para refletir o novo valor permitido.
- Migration criada:
  - `agenda-backend/prisma/migrations/20260607120000_add_daily_recurrence/migration.sql`
- A migration usa:
  - `ALTER TYPE "Repeticao" ADD VALUE IF NOT EXISTS 'diaria';`

### Arquivos alterados

- `agenda-frontend/src/pages/Calendario.jsx`
- `agenda-backend/index.js`
- `agenda-backend/prisma/schema.prisma`
- `agenda-backend/schema.sql`
- `agenda-backend/prisma/migrations/20260607120000_add_daily_recurrence/migration.sql`
- `CONTEXT.md`

### Validacoes executadas

- `cd agenda-backend && node --check index.js`
  - Resultado: passou.
- `cd agenda-backend && npx prisma validate`
  - Resultado: passou.
- `cd agenda-backend && npx prisma generate`
  - Resultado: passou.
- `cd agenda-frontend && npm run build`
  - Resultado: passou.
  - Observacao: manteve o warning conhecido do Vite sobre chunk acima de 500 kB.
- `cd agenda-backend && npx prisma migrate dev`
  - Resultado: falhou antes de aplicar a migration nova por causa da migration anterior `20260521120000_fase_1_scalability_base` no shadow database.
  - Erro reportado pelo Prisma: `P3006`, `column "status" does not exist`.

### Pontos de atencao

- A migration nova foi criada, mas `migrate dev` nao conseguiu concluir por drift/problema previo em migration anterior no shadow database.
- Para aplicar em ambiente remoto, sera necessario resolver o estado das migrations Prisma/Supabase ou aplicar a migration SQL segura manualmente no banco controlado.
- Nao foi implementada edicao em massa de series recorrentes.
- Nao foram implementadas excecoes de recorrencia.

## FASE 3 - Perfis Aluno e Professor

Data: 2026-06-07

### Objetivo

Adicionar as roles `aluno` e `professor` ao Fluxus com as mesmas permissoes nesta fase.

### Permissoes implementadas

- Login permitido para usuarios `aluno` e `professor` ativos.
- Visualizacao do calendario.
- Visualizacao da listagem de compromissos.
- Visualizacao de detalhes dos eventos aprovados.
- Recebimento de notificacoes quando compromissos aprovados sao publicados, alterados ou cancelados.

### Restricoes implementadas

- `aluno` e `professor` nao podem criar compromissos.
- `aluno` e `professor` nao podem editar compromissos.
- `aluno` e `professor` nao podem excluir compromissos.
- `aluno` e `professor` nao podem aprovar ou recusar compromissos.
- `aluno` e `professor` nao acessam gerenciamento de usuarios.
- `aluno` e `professor` nao acessam configuracoes de Google Calendar.
- `aluno` e `professor` nao acessam telas administrativas.

### Backend

- O enum Prisma `Role` foi atualizado com:
  - `aluno`;
  - `professor`.
- Migration criada:
  - `agenda-backend/prisma/migrations/20260607133000_add_student_professor_roles/migration.sql`
- O backend passou a usar constantes de roles:
  - `ROLE_VALUES`;
  - `AGENDA_WRITE_ROLES`;
  - `ACADEMIC_VIEWER_ROLES`.
- `GET /api/compromissos` retorna para `aluno` e `professor` apenas compromissos com `status = aprovado`.
- `GET /api/compromissos/pendentes` permanece restrito a `coordenador`, `admin` e `secretaria`.
- `POST /api/compromissos`, `PUT /api/compromissos/:id` e `DELETE /api/compromissos/:id` bloqueiam `aluno` e `professor` com erro `403`.
- Rotas de aprovacao/recusa continuam restritas a `coordenador` e `admin`.
- Rotas de Google Calendar continuam restritas a `coordenador`.
- Rotas administrativas de usuarios continuam restritas a `admin`.

### Notificacoes

- Usuarios ativos com role `aluno` ou `professor` recebem notificacoes quando:
  - compromisso aprovado e publicado na agenda academica;
  - compromisso aprovado e atualizado;
  - compromisso aprovado e cancelado/removido.
- Eventos pendentes e recusados nao geram notificacoes para `aluno` e `professor`.

### Frontend

- O menu lateral mostra apenas paginas permitidas para `aluno` e `professor`:
  - Calendario;
  - Compromissos;
  - Perfil.
- O botao global "Novo evento" fica oculto para `aluno` e `professor`.
- A rota `/aprovacoes` redireciona `aluno` e `professor` para o calendario.
- O calendario permite abrir detalhes dos eventos, mas sem botoes de salvar, duplicar ou excluir.
- O card Google Calendar continua visivel apenas para coordenadores.
- A listagem de compromissos mantem botoes de acao apenas para `admin` e `coordenador`.
- O cadastro e o painel administrativo permitem selecionar `Aluno` e `Professor`.
- A copia frontend da raiz `src/` foi mantida em paridade com `agenda-frontend/src/` para evitar divergencia de deploy.

### Como criar usuarios aluno/professor para testes

- Via tela de cadastro:
  - abrir `/register`;
  - selecionar `Aluno` ou `Professor`;
  - aguardar aprovacao do admin.
- Via painel admin:
  - acessar `/admin/usuarios`;
  - alterar o perfil do usuario para `Aluno` ou `Professor`;
  - manter status `Ativo`.
- Via API administrativa:
  - `POST /api/users` com `role: "aluno"` ou `role: "professor"`.

### Arquivos alterados

- `agenda-backend/index.js`
- `agenda-backend/prisma/schema.prisma`
- `agenda-backend/schema.sql`
- `agenda-backend/prisma/migrations/20260607133000_add_student_professor_roles/migration.sql`
- `agenda-frontend/src/App.jsx`
- `agenda-frontend/src/components/Layout.jsx`
- `agenda-frontend/src/pages/AdminUsers.jsx`
- `agenda-frontend/src/pages/Calendario.jsx`
- `agenda-frontend/src/pages/Perfil.jsx`
- `agenda-frontend/src/pages/Register.jsx`
- `src/App.jsx`
- `src/components/Layout.jsx`
- `src/pages/AdminUsers.jsx`
- `src/pages/Calendario.jsx`
- `src/pages/Perfil.jsx`
- `src/pages/Register.jsx`
- `CONTEXT.md`

### Pontos de atencao

- A migration nova adiciona valores ao enum `Role`, mas nao altera dados existentes.
- Aluno/professor visualizam todos os compromissos aprovados retornados por `/api/compromissos` nesta fase.
- Escopo por curso para aluno/professor nao foi implementado nesta fase.

## FASE 3.5 - Autenticacao academica por matricula/e-mail

Data: 2026-06-08

### Objetivo

Finalizar a logica academica de cadastro e login por perfil:

- `aluno` usa `matricula + senha`.
- `professor`, `coordenador`, `secretaria` e `admin` usam `e-mail institucional + senha`.
- Usuarios antigos com e-mail continuam compativeis.

### Banco e Prisma

- O model `Usuario` passou a ter `email` opcional e `matricula` opcional unica.
- O campo `email` foi mantido para os demais perfis e continua unico quando existir.
- Migration criada:
  - `agenda-backend/prisma/migrations/20260608100000_add_student_registration_login/migration.sql`
- A migration:
  - remove `NOT NULL` de `usuarios.email`;
  - adiciona `usuarios.matricula`;
  - cria indice unico para `matricula`;
  - cria indice auxiliar para consultas por `matricula`.

### Backend

- `POST /api/auth/register` agora valida o identificador de acordo com o perfil:
  - aluno exige `matricula`;
  - demais perfis exigem e-mail valido.
- `POST /api/auth/login` agora aceita um campo unico `identificador`:
  - se tiver formato de e-mail, busca por `email`;
  - caso contrario, busca por `matricula`.
- O JWT passa a incluir `matricula` quando existir, preservando `id`, `nome`, `email`, `role` e `curso_id`.
- O painel admin em `/api/users` permite criar e editar:
  - alunos com matricula;
  - demais perfis com e-mail.
- A resposta publica do usuario passou a incluir `matricula`.

### Frontend

- `Login.jsx` passou a exibir o campo unico "E-mail ou matricula".
- `Register.jsx` alterna entre:
  - campo "Matricula" para aluno;
  - campo "E-mail institucional" para os demais perfis.
- `AdminUsers.jsx` exibe e edita matricula para aluno e e-mail para os demais perfis.
- `Perfil.jsx` mostra matricula para aluno e e-mail para os demais cargos.
- `ForgotPassword.jsx` mantem recuperacao por e-mail e informa que recuperacao por matricula fica como ponto futuro/fluxo de secretaria nesta fase.
- A copia raiz `src/pages/*` foi mantida em paridade com `agenda-frontend/src/pages/*`.

### Limitacoes

- Recuperacao de senha por matricula nao foi implementada nesta fase.
- Alunos sem e-mail dependem de atendimento administrativo/secretaria para recuperacao de acesso.
- A migration foi criada como SQL seguro, sem `migrate reset`.

### Validacoes executadas

- `cd agenda-backend && node --check index.js`
  - Resultado: passou.
- `cd agenda-backend && npx prisma validate`
  - Resultado: passou.
  - Observacao: Prisma manteve o warning sobre `package.json#prisma` deprecated para Prisma 7.
- `cd agenda-backend && npx prisma generate`
  - Resultado: passou.
  - Observacao: Prisma manteve o warning sobre `package.json#prisma` deprecated para Prisma 7.
- `cd agenda-frontend && npm run build`
  - Resultado: passou.
  - Observacao: manteve o warning conhecido do Vite sobre chunk acima de 500 kB.

### Arquivos alterados

- `agenda-backend/index.js`
- `agenda-backend/prisma/schema.prisma`
- `agenda-backend/schema.sql`
- `agenda-backend/prisma/migrations/20260608100000_add_student_registration_login/migration.sql`
- `agenda-frontend/src/pages/Login.jsx`
- `agenda-frontend/src/pages/Register.jsx`
- `agenda-frontend/src/pages/AdminUsers.jsx`
- `agenda-frontend/src/pages/Perfil.jsx`
- `agenda-frontend/src/pages/ForgotPassword.jsx`
- `src/pages/Login.jsx`
- `src/pages/Register.jsx`
- `src/pages/AdminUsers.jsx`
- `src/pages/Perfil.jsx`
- `src/pages/ForgotPassword.jsx`
- `CONTEXT.md`

## FASE 4.1 - Notificacoes Operacionais por E-mail

Data: 2026-06-08

### Objetivo

Complementar as notificacoes internas do sino com avisos por e-mail para participantes do fluxo operacional, sem enviar e-mails para `aluno` ou `professor` nesta fase.

### Eventos com envio de e-mail

- Secretaria cria compromisso pendente para coordenador:
  - destinatario: coordenador responsavel;
  - assunto: `[Fluxus] Nova solicitacao aguardando aprovacao`.
- Coordenador/admin aprova solicitacao criada pela secretaria:
  - destinatario: secretaria solicitante;
  - assunto: `[Fluxus] Solicitacao aprovada`.
- Coordenador/admin recusa solicitacao criada pela secretaria:
  - destinatario: secretaria solicitante;
  - assunto: `[Fluxus] Solicitacao recusada`.
- Compromisso aprovado e alterado:
  - destinatario: coordenador responsavel;
  - assunto: `[Fluxus] Compromisso atualizado`.
- Compromisso aprovado e cancelado/removido:
  - destinatarios: coordenador responsavel e secretaria solicitante, quando existir;
  - assunto: `[Fluxus] Compromisso cancelado`.

### Funcoes criadas no servico de e-mail

- `sendPendingApprovalEmail()`
- `sendApprovalEmail()`
- `sendRejectionEmail()`
- `sendUpdatedCommitmentEmail()`
- `sendCancelledCommitmentEmail()`

### Regras de seguranca operacional

- Falha de SMTP nao bloqueia criacao, aprovacao, recusa, edicao ou cancelamento.
- Os envios operacionais passam por `sendOperationalEmailSafe()`, que captura erro e registra log.
- Logs de sucesso adicionados:
  - `[E-MAIL] Pending approval sent`
  - `[E-MAIL] Approval sent`
  - `[E-MAIL] Rejection sent`
  - `[E-MAIL] Update sent`
  - `[E-MAIL] Cancellation sent`
- Logs de falha seguem o padrao `[E-MAIL] <fluxo> failed`.

### Infraestrutura

- `emailService.js` continua exportando `sendReminder()` para manter compatibilidade com recuperacao de senha.
- Se `SMTP_HOST` estiver configurado, o servico usa as variaveis SMTP:
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_SECURE`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `EMAIL_FROM` ou `SMTP_FROM`
- Sem SMTP configurado, o fallback permanece Ethereal para teste local.
- O link para acesso ao Fluxus usa `FRONTEND_URL`, com fallback para `http://localhost:5173`.

### Arquivos alterados

- `agenda-backend/emailService.js`
- `agenda-backend/index.js`
- `CONTEXT.md`

### Validacoes executadas

- `cd agenda-backend && node --check index.js`
  - Resultado: passou.
- `cd agenda-backend && node --check emailService.js`
  - Resultado: passou.

### Pontos de atencao

- Nao foram implementadas preferencias de notificacao.
- Nao foi implementada fila de e-mails.
- Nao foram enviados e-mails para alunos ou professores.
- Os corpos de e-mail sao simples nesta fase, sem templates HTML complexos.
- Diagnostico pos-deploy: o Nodemailer instalado mantinha `family: 4` no objeto do transporter, mas o caminho interno `smtp-connection` nao repassava `this.options.family` para `shared.resolveHostname`.
- Para evitar `ENETUNREACH` por IPv6 no Render com `smtp.gmail.com`, o transporter passou a resolver IPv4 explicitamente com `dns.resolve4(SMTP_HOST)`, usar o IPv4 como `host` e preservar `tls.servername` com o host original para TLS/SNI.
- Foi adicionado log temporario `[E-MAIL] SMTP config` com `SMTP_HOST`, `SMTP_PORT` e `SMTP_SECURE`, alem de log `[E-MAIL] SMTP IPv4 resolved`.

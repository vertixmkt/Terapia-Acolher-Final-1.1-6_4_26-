# ROADMAP 2.0 — Cérebro Terapia Acolher
> Documento canônico do estado atual do projeto — atualizado em 03/04/2026

---

## O que é

Sistema de gestão e matching automático para a plataforma "Terapia Acolher". Backend Node.js + Express + MySQL + Drizzle ORM, integrado com ManyChat (WhatsApp) e Kiwify (pagamentos). Cliente: Rodrigo Mendes.

---

## ✅ Backend — `backend/src/`

Servidor completo construído do zero. 9 módulos de rotas, schema com 10 tabelas, integração completa com ManyChat e Kiwify.

### Rotas implementadas

| Módulo | Arquivo | Endpoints-chave |
|---|---|---|
| Dashboard | `routes/dashboard.ts` | `GET /api/dashboard/stats` |
| Terapeutas | `routes/therapists.ts` | CRUD + `/authorize` + cadastro público |
| Pacientes | `routes/patients.ts` | CRUD + `/archive` |
| Atribuições | `routes/assignments.ts` | lista + reposições |
| Matching | `routes/matching.ts` | modo, run, suggest, assign, log |
| Webhooks Kiwify | `routes/webhooks-kiwify.ts` | `POST /api/webhooks/kiwify` |
| Webhooks ManyChat | `routes/webhooks-manychat.ts` | received, sent, retry |
| Config ManyChat | `routes/manychat-config.ts` | CRUD da config + subscriber lookup |
| Portal Terapeuta | `routes/therapist-portal.ts` | login, me, assignments, balance, replenishment |
| Auth Admin | `routes/auth.ts` | `POST /api/auth/admin/login` |
| Alias legado | — | `POST /api/receber-paciente` |

### Integrações

**ManyChat:** `setCustomField` + `addTag` + delay 2s com IDs exatos do sistema original. Config gerenciada via banco/UI (sem reiniciar servidor). Tabela `manychat_subscribers` para lookup WhatsApp → Subscriber ID.

**Kiwify:** 5 fallbacks de identificação + mapeamento de 20+ ofertas → leads. Verificação de autenticidade via `timingSafeEqual` no query param `?token=`.

---

## ✅ Schema do banco — `backend/src/db/schema.ts`

10 tabelas:

| Tabela | Descrição |
|---|---|
| `therapists` | Dados completos: gênero, abordagem, especialidades, público atendido, turnos, saldo, ManyChat subscriber ID, reposições |
| `patients` | Dados completos: gênero, preferência, turno, motivo, tipo de terapia, dados infantil/terceiros, ManyChat subscriber ID |
| `assignments` | Atribuições com score de compatibilidade e status de notificação |
| `matching_config` | Modo (auto/semi/manual/pausado) + pesos dos critérios |
| `matching_log` | Histórico de todas as decisões de matching |
| `manychat_config` | API key, flow namespaces, tag IDs, custom field IDs (gerenciável via UI) |
| `manychat_subscribers` | Lookup WhatsApp → Subscriber ID |
| `webhooks_kiwify` | Registro de todos os webhooks Kiwify recebidos (P6) |
| `webhooks_manychat_received` | Registro de webhooks ManyChat recebidos (P4) |
| `webhooks_manychat_sent` | Registro de webhooks ManyChat enviados (P5) |
| `lead_replenishments` | Solicitações de reposição de leads (P3) |

---

## ✅ Algoritmo de Matching v2.0 — `backend/src/services/matching.ts`

Documentação completa: `MATCHING_DETALHADO_2_0.md`
Fluxograma visual: `FLUXOGRAMA_MATCHING_2_0.html`

### Passo 1 — Verificação de elegibilidade do paciente

- Status = `pendente` (não atribuído, não arquivado)
- Motivo preenchido (obrigatório para score de compatibilidade)
- WhatsApp válido (obrigatório para notificação)

### Passo 2 — Filtros eliminatórios BIDIRECIONAIS

- Corta terapeuta inativo
- Corta terapeuta com saldo zero
- Corta por gênero do paciente → terapeuta (paciente quer mulher → corta homens)
- Corta por gênero do terapeuta → paciente (terapeuta só atende mulheres → corta homens pacientes) **(BIDIRECIONAL — v2.0)**
- Corta por turno (paciente quer manhã → corta quem não atende de manhã)
- Corta por público especial (casal/infantil)

### Passo 3 — Taxa proporcional de distribuição

Limite diário calculado dinamicamente:

```
limite_diario = max(1, arredondar_pra_cima(saldo / TARGET_DAYS))
```

`TARGET_DAYS = 20` (dias úteis, ~1 mês). Terapeutas que atingiram o limite diário são pulados.

| Pacote | Leads | R$ | Leads/dia | Entrega em |
|--------|-------|----|-----------|------------|
| Acolher Light | 3 | 97 | 1 | 3 dias |
| Acolher Regular | 10 | 250 | 1 | 10 dias |
| Acolher Mais | 15 | 350 | 1 | 15 dias |
| Acolher Máximo | 20 | 410 | 1 | 20 dias |
| 30 Contatos | 30 | 600 | 2 | 15 dias |
| 60 Contatos | 60 | 1.170 | 3 | 20 dias |

### Passo 4 — Score de compatibilidade por keywords (12 categorias)

Combina motivo do paciente + abordagem + especialidades do terapeuta em texto único. Busca keywords de 12 categorias:

`ansiedade` · `depressão` · `relacionamento` · `trauma` · `infantil` · `comportamento` · `psicanalítica` · `humanista` · `cognitiva` · `estresse` · `luto` · `alimentar`

**Score = 50 (base) + 10 por categoria encontrada, máximo 100**

### Passo 5 — Cascata de compatibilidade (85 → 75 → 65)

| Nível | Threshold | Ação |
|-------|-----------|------|
| 1 | ≥ 85% | Atribui (excelente match) |
| 2 | ≥ 75% | Atribui (bom match) |
| 3 | ≥ 65% | Atribui (match aceitável) |
| Nenhum | < 65% | Não atribui — paciente fica pendente para admin |

### Passo 6 — Distribuição de carga

Dentro do nível da cascata: prioriza quem não recebeu paciente há mais tempo. Desempate: maior score. Saldo nunca fica negativo (`GREATEST(0, saldo - 1)` via SQL).

### Matching automático em todas as vias de entrada

- **Paciente via ManyChat** → `runAutoMatching()` dispara automaticamente
- **Paciente criado pelo admin** → `runAutoMatching()` dispara automaticamente
- **Terapeuta aprovado pelo admin** → `matchPendingPatients()` processa fila de pendentes
- **Terapeuta recebe saldo via Kiwify** → `matchPendingPatients()` processa fila de pendentes
- **Terapeuta se cadastra com Kiwify vinculado** → `matchPendingPatients()` processa fila de pendentes
- Modos **manual** e **pausado** bloqueiam matching automático
- Botão "Executar matching manual" no dashboard continua disponível

---

## ✅ Mapeamento de pacotes Kiwify

### Pacotes atuais

| Oferta | Leads | Preço |
|--------|-------|-------|
| Acolher Light | 3 | R$ 97 |
| Acolher Regular | 10 | R$ 250 |
| Acolher Mais | 15 | R$ 350 |
| Acolher Máximo | 20 | R$ 410 |
| Acolher 30 Contatos | 30 | R$ 600 |
| Acolher 60 Contatos | 60 | R$ 1.170 |

### Pacotes legados (mantidos para retrocompatibilidade)

| Oferta | Leads |
|--------|-------|
| +5 Contatos | 5 |
| De Volta | 12 |
| Infinity | 25 |
| Infinity Top | 28 |
| DIA DAS MULHERES | 8 |

---

## ✅ Frontend — `frontend-novo/src/`

React 19 + Vite + TailwindCSS 4 + TypeScript strict mode.

### Área Admin (7 páginas)

| Página | Arquivo | Status |
|---|---|---|
| Dashboard | `pages/admin/Dashboard.tsx` | Completa |
| Autorização de Cadastros | `pages/admin/Authorization.tsx` | Completa |
| Cadastro Rápido | `pages/admin/QuickCreate.tsx` | Completa |
| Pacientes | `pages/admin/Patients.tsx` | Completa |
| Terapeutas | `pages/admin/Therapists.tsx` | Completa |
| Atribuições | `pages/admin/Assignments.tsx` | Completa — botão "Reenviar notificações" sem `onClick` |
| Matching | `pages/admin/Matching.tsx` | Completa — botão "Salvar pesos" sem `onClick` |
| Compras Kiwify | — | **Não implementada** (placeholder em `App.tsx`) |
| Configurações | — | **Não implementada** (placeholder em `App.tsx`) |

### Portal do Terapeuta (3 páginas)

| Página | Arquivo | Status |
|---|---|---|
| Meu Perfil | `pages/therapist/MyProfile.tsx` | Completa — campo `approach` somente-leitura em edição; especialidades não editáveis |
| Minhas Atribuições | `pages/therapist/MyAssignments.tsx` | Completa |
| Meu Saldo | `pages/therapist/MyBalance.tsx` | Parcial — preços hardcoded; histórico de compras é placeholder |

### Componentes

- `AdminLayout` — login screen JWT + sidebar + logout
- `TherapistLayout` — login screen por e-mail/WhatsApp + nav + logout
- `api/client.ts` — API client completo com auto-logout em 401/403

---

## ✅ Segurança e Hardening (v2.0) — 31/03/2026

### CRÍTICO

#### 1. Admin secret removido do bundle JavaScript
**Arquivos:** `AdminLayout.tsx`, `client.ts`

`VITE_ADMIN_SECRET` era embutido no JavaScript compilado — visível via `view-source`. Substituído por:
- Endpoint `POST /api/auth/admin/login` retorna JWT de 8h
- Tela de login no `AdminLayout` — admin digita senha manualmente
- JWT em `sessionStorage` (limpo ao fechar a aba)
- Bundle JS não contém nenhum segredo

#### 2. Token de terapeuta base64 substituído por JWT assinado
**Arquivo:** `backend/src/middleware/auth.ts`

`base64("therapistId:timestamp")` era forgeable por qualquer um com o ID do terapeuta. Substituído por:
- `jose` (Web Crypto JWT, zero dependências nativas)
- `generateTherapistToken(id)` → JWT HS256, `{ sub: id, aud: "therapist" }`, 30 dias, assinado com `JWT_SECRET`
- `therapistAuth` verifica assinatura criptográfica e audience

#### 3. Verificação de autenticidade nos webhooks Kiwify
**Arquivo:** `backend/src/routes/webhooks-kiwify.ts`

`POST /api/webhooks/kiwify` aceitava qualquer payload. Substituído por:
- Token Kiwify verificado via `timingSafeEqual` no query param `?token=`
- Resistente a timing attacks
- 401 imediato + log de warning se token inválido
- URL do webhook deve incluir `?token=<KIWIFY_WEBHOOK_TOKEN>`

#### 4. Arquivo `.env` protegido no frontend
**Arquivo:** `frontend-novo/.gitignore`

`.env` estava versionado com IP do servidor e admin secret. Corrigido:
- `.env` e `.env.local` adicionados ao `.gitignore`
- `frontend-novo/.env.example` criado com placeholders
- `VITE_ADMIN_SECRET` removido — arquivo contém apenas `VITE_API_URL`

---

### ALTO

#### 5. Rate limiting em todos os endpoints sensíveis
**Arquivo:** `backend/src/index.ts`

`express-rate-limit` configurado em três camadas:

| Limiter | Endpoints | Limite |
|---|---|---|
| `authLimiter` | `/api/auth/*`, `/api/therapist/login` | 5 req/min por IP |
| `webhookLimiter` | `/api/webhooks/*`, `/api/receber-paciente` | 200 req/min por IP |
| `adminLimiter` | Todas as rotas admin | 120 req/min por IP |

#### 6. Validação Zod em todas as rotas admin
**Arquivos:** `therapists.ts`, `patients.ts`, `assignments.ts`, `matching.ts`, `manychat-config.ts`, `therapist-portal.ts`

Schemas Zod completos em todos os endpoints de escrita. Retornam `400` com `details` estruturado quando a validação falha.

#### 7. Security headers HTTP com Helmet
**Arquivo:** `backend/src/index.ts`

`helmet()` adicionado como primeiro middleware — cobre CSP, X-Frame-Options, Referrer-Policy e demais vetores HTTP.

#### 8. CORS restrito ao domínio configurado
**Arquivo:** `backend/src/index.ts`

`origin: '*'` removido. CORS usa `process.env.FRONTEND_URL` sem fallback. Se ausente, app falha no boot. `allowedHeaders` explícito.

#### 9. Token de terapeuta migrado de `localStorage` para `sessionStorage`
**Arquivos:** `TherapistLayout.tsx`, `client.ts`

`localStorage` persiste indefinidamente e é acessível via XSS. `sessionStorage` limpa ao fechar a aba. Tokens de deep link (`?token=xxx`) também migram para `sessionStorage`.

---

### MÉDIO

#### 10. Validação de variáveis de ambiente no boot
**Arquivo:** `backend/src/index.ts`

Schema Zod validado antes de qualquer import de rota. Falha com `process.exit(1)` se ausentes:

```
DATABASE_URL      — obrigatório
JWT_SECRET        — obrigatório, mínimo 32 caracteres
ADMIN_PASSWORD    — obrigatório, mínimo 8 caracteres
FRONTEND_URL      — obrigatório, URL válida
KIWIFY_WEBHOOK_TOKEN — opcional (alerta no log se ausente)
LOG_LEVEL         — opcional (padrão: info)
```

#### 11. Health check com ping real no banco
**Arquivo:** `backend/src/index.ts`

```
GET /health → executa SELECT 1 no banco
  → banco OK:      200 { status: 'ok', timestamp: '...' }
  → banco offline: 503 { status: 'error', error: 'Database unavailable' }
```

#### 12. Logging estruturado com pino
**Arquivos:** `backend/src/lib/logger.ts` + todas as rotas e services

`console.log/error/warn` substituídos por `logger.info/error/warn` com contexto estruturado. `requestId` (UUID v4) propagado em todos os logs. Stack traces não vazam em produção.

#### 13. Retry de notificação ManyChat implementado
**Arquivo:** `backend/src/routes/webhooks-manychat.ts`

`POST /api/webhooks/manychat/sent/:id/retry` implementado (antes retornava 501):
- `notify_therapist`: reconstrói params via joins, chama `notifyTherapist()`
- `notify_patient`: reconstrói params via joins, chama `notifyPatient()`
- Cada retry gera novos registros em `webhooksManychatSent` para auditoria

#### 14. Dependência `openai` removida
`openai` nunca foi usada. Removida para reduzir bundle e superfície de ataque.

---

## ✅ Correções históricas

### 24/03/2026
- **Conexão MySQL morrendo após inatividade** — trocado `createConnection` por `createPool` com keepAlive em `db/index.ts`
- **Matching automático incompleto** — adicionado matching em todas as vias de entrada (antes só funcionava via ManyChat webhook)
- **Threshold de score 30% → 70%** — pacientes sem match de qualidade ficam pendentes para admin (pedido do Rodrigo)
- **Score recalibrado** — base reduzida de 50 para 30, keywords ampliadas (vício, jogatina, obesidade, burnout, etc.)

### 25/03/2026
- **Página Autorização de Cadastros** — nova tela admin para revisar, aprovar ou rejeitar cadastros de terapeutas pendentes
- **Página Cadastro Rápido** — nova tela admin com formulários inline de paciente e terapeuta
- **Bug crítico: `insertId` undefined no Drizzle ORM** — `db.insert()` com mysql2 retorna `[ResultSetHeader, null]`. Corrigido `(result as any).insertId` → `(result as any)[0].insertId` em 7 arquivos
- **API client: `patients.create()`** — método que faltava adicionado ao client.ts
- **Sidebar atualizada** — links para Autorização e Cadastro Rápido adicionados
- **Botão "+ Novo terapeuta" removido** — cadastro centralizado na página Cadastro Rápido
- **Portal do Terapeuta — login por e-mail/WhatsApp** — login sem token manual; busca por `email`, `whatsapp` e `phone`. Deep link `?token=xxx` mantido para retrocompatibilidade
- **Portal do Terapeuta — toggle Ativo/Inativo** — banner interativo: terapeuta pode pausar recebimento de pacientes (férias, agenda cheia). Matching respeita o filtro de status

### 26/03/2026
- **Matching v2.0** — filtro bidirecional de gênero, score por 12 categorias, cascata 85→75→65, distribuição por tempo de espera, documentação completa (`MATCHING_DETALHADO_2_0.md` + `FLUXOGRAMA_MATCHING_2_0.html`)
- **Mapeamento Kiwify atualizado** — 6 pacotes atuais + legados mantidos para retrocompatibilidade

---

## ✅ Novos arquivos criados (v2.0)

| Arquivo | Descrição |
|---|---|
| `backend/src/middleware/auth.ts` | Reescrito: JWT admin + JWT terapeuta via `jose` |
| `backend/src/routes/auth.ts` | `POST /api/auth/admin/login` — emite JWT de admin |
| `backend/src/lib/logger.ts` | Instância pino estruturado |
| `backend/src/types/express.d.ts` | Augmentation: `req.therapistId`, `req.requestId` tipados |
| `frontend-novo/.env.example` | Template sem segredos |

---

## ✅ Dependências

### Backend
| Pacote | Motivo |
|---|---|
| `express` | Framework HTTP |
| `drizzle-orm` | ORM type-safe para MySQL |
| `mysql2` | Driver MySQL |
| `jose` | JWT HS256 — tokens admin e terapeuta |
| `express-rate-limit` | Rate limiting por IP |
| `helmet` | Security headers HTTP |
| `pino` + `pino-http` | Logging estruturado JSON |
| `zod` | Validação de schemas e env vars |

### Frontend
| Pacote | Motivo |
|---|---|
| `react` 19 + `react-dom` | UI |
| `react-router-dom` 7 | Roteamento |
| `tailwindcss` 4 | Estilização |
| `lucide-react` | Ícones |
| `vite` 8 | Build |

### Removidas
| Pacote | Motivo |
|---|---|
| `openai` | Nunca usado — dead dependency |

---

## ✅ Frontend — Completo (31/03/2026)

Todas as páginas e funcionalidades pendentes foram implementadas.

### Páginas criadas

| Prioridade | Arquivo | Rota | Status |
|---|---|---|---|
| P4 | `WebhooksManychatReceived.tsx` | `/admin/webhooks-recebidos` | ✅ Implementado |
| P5 | `WebhooksManychatSent.tsx` | `/admin/webhooks-enviados` | ✅ Implementado |
| P6 | `PurchasesKiwify.tsx` | `/admin/compras` | ✅ Implementado |
| — | `Config.tsx` | `/admin/config` | ✅ Implementado |

### Funcionalidades completadas

| Arquivo | Item | Status |
|---|---|---|
| `MyBalance.tsx` | P3 — Formulário de reposição (protocolo 0h/24h/72h/15d) | ✅ Implementado |
| `MyBalance.tsx` | Histórico de compras via API + pacotes reais Kiwify | ✅ Implementado |
| `Matching.tsx` | Salvar pesos com persistência no backend | ✅ Implementado |
| `Assignments.tsx` | Botão Reenviar com retry via webhook | ✅ Implementado |
| `MyProfile.tsx` | Editar approach + especialidades | ✅ Implementado |

---

## ✅ Deploy em Produção (03/04/2026)

### Infraestrutura

| Item | Detalhe |
|---|---|
| Servidor | VPS `76.13.70.229` — Ubuntu 24.04 |
| Node.js | v20 (PM2 — `terapia-acolher-api`, restart automático) |
| Banco | MySQL 8.0 — banco `terapia_acolher`, usuário `acolher` |
| Proxy | Nginx 1.24 — serve frontend estático + proxy `/api/*` → Node porta 3000 |
| SSL | Let's Encrypt (Certbot) — renovação automática |
| Paths | Backend: `/opt/terapia-acolher/backend` · Frontend: `/opt/terapia-acolher/frontend` |

### URLs de produção

| Portal | URL |
|---|---|
| Admin | `https://admin.terapiaacolher.com.br` |
| Terapeuta | `https://terapeuta.terapiaacolher.com.br` |
| Health check | `https://admin.terapiaacolher.com.br/health` |

### Webhook Kiwify (produção)
```
POST https://admin.terapiaacolher.com.br/api/webhooks/kiwify
```

### Webhook ManyChat — receber paciente (produção)
```
POST https://admin.terapiaacolher.com.br/api/webhooks/manychat/patient
```

---

## ✅ Funcionalidades implementadas em 03/04/2026

### Fluxo de cadastro automático de terapeuta via Kiwify
- Webhook Kiwify: quando terapeuta não existe no banco → criado automaticamente com nome, email e WhatsApp da compra
- Saldo creditado imediatamente
- Status inicial: `pendente` (aguardando onboarding)
- Se terapeuta já existe: saldo incrementado normalmente

### Fluxo de onboarding do terapeuta (portal)
Novo fluxo de 3 etapas ao primeiro acesso:

1. **Login** — email ou WhatsApp (mesmo da compra Kiwify)
2. **Criar senha** — mínimo 8 caracteres, confirmação, hash `scrypt` com salt (nativo Node.js, sem dependências)
3. **Onboarding** — formulário de seleção por tags: gênero, abordagem, especialidades, turnos, público atendido, formação
4. **Auto-aprovação** — ao submeter perfil completo (abordagem + especialidade + turno), status muda de `pendente` → `ativo` automaticamente e terapeuta entra na fila de matching

### Autenticação com senha no portal do terapeuta
- **Primeiro acesso**: digita email/WhatsApp → campo de senha aparece dinamicamente → redireciona para tela de criação de senha
- **Acessos seguintes**: email/WhatsApp + senha
- Hash via `crypto.scrypt` + salt aleatório (nativo Node.js — sem bcrypt)
- Endpoint `POST /api/therapist/me/password` (autenticado)

### Seletores de tag no perfil do terapeuta
- **Abordagem** e **Especialidades** agora são seletores de tag no modo de edição (igual ao onboarding) — sem campo de texto livre

### Fixes
- **Bug VITE_API_URL** — `|| 'http://localhost:3000'` em `AdminLayout.tsx` e `client.ts` causava "Erro de conexão" em produção. Corrigido para `?? ''` (URL relativa → Nginx faz proxy)
- **Bug toggles deslocados** — `translate-x-5` (20px) ultrapassava o trilho `w-11` (44px). Corrigido para `translate-x-[22px]` em `Config.tsx` e `Therapists.tsx`
- **Card "Controle de Matching"** removido do Dashboard (não era necessário)
- **CORS multi-origem** — `FRONTEND_URL` agora aceita lista separada por vírgula; backend faz lookup dinâmico
- **Coluna `has_formation`** adicionada ao banco (migration manual + schema Drizzle atualizado)
- **Coluna `password_hash`** adicionada ao banco (migration manual + schema Drizzle atualizado)

---

## ❌ Ainda não feito

- **Recuperação de senha por email** — tela "Esqueci minha senha" implementada no frontend, backend pendente. Requer definição do provedor SMTP (Gmail, Brevo, Resend etc.) e configuração das variáveis `SMTP_*` no servidor
- Integração ManyChat — configurar API Key, Flow NS, Tag IDs e Custom Field IDs na tela de Configurações
- Notificação do terapeuta via **Telegram** (substituir ManyChat para terapeutas)
- **Gerente de Operações (LLM + Telegram Bot)** — agente autônomo que monitora o sistema e se comunica via Telegram. Notificações proativas (pacientes pendentes, falhas, resumo diário) + respostas sob demanda. Stack: Telegram Bot API + Claude API (Sonnet). Módulo: `backend/src/services/operations-manager.ts`
- Painel de relatórios e métricas avançadas
- App mobile (portal do terapeuta)

---

## Resumo de severidades resolvidas (v2.0)

| Severidade | Antes | Depois |
|---|---|---|
| CRÍTICO | 4 | 0 |
| ALTO | 5 | 0 |
| MÉDIO | 6 | 0 |
| BAIXO | 3 | 3 (documentados, não bloqueadores) |

**Status atual:** Sistema completo — backend + frontend 100% implementados nas 6 prioridades originais. Design auditado e corrigido. Produção-ready.

---

## ✅ Design Audit (31/03/2026)

Auditoria `/hm-designer` aplicada. 8 fixes:

| Severidade | Fix | Arquivo(s) |
|---|---|---|
| CRÍTICO | Inter carregada via Google Fonts + `lang="pt-BR"` | `index.html` |
| CRÍTICO | Labels P4/P5/P6 removidos da UI | `WebhooksManychatReceived`, `Sent`, `PurchasesKiwify` |
| ALTO | `tracking-tight` em todos os h1 | 11 páginas |
| ALTO | Pesos do matching no Dashboard agora dinâmicos (API) | `Dashboard.tsx` |
| ALTO | Moeda BRL formatada com decimais (`R$ 250,00`) | `Dashboard.tsx` |
| MÉDIO | Badge border-radius `rounded` → `rounded-md` | `Badge.tsx` |
| MÉDIO | Empty states contextuais: filtro ativo vs. base vazia | 6 páginas de tabela |

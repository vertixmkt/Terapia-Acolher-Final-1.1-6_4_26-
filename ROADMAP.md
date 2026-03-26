# ROADMAP — App CÉREBRO Terapia Acolher

## O que é
Sistema de gestão e matching automático para a plataforma "Terapia Acolher". Backend Node.js + Express + MySQL + Drizzle ORM, integrado com ManyChat (WhatsApp) e Kiwify (pagamentos). Cliente: Rodrigo Mendes.

---

## ✅ Já feito (atualizado em 26/03/2026)

### Deploy e Infraestrutura
- VPS Hostinger em produção (IP: `76.13.70.229`)
- Backend rodando via PM2 (`terapia-acolher-api`) com MySQL local
- Frontend servido via Nginx na mesma VPS
- Conexão MySQL via **pool** com keepAlive (corrigido problema de conexão morta após inatividade)

### Backend (Node.js + Express + MySQL + Drizzle) — `backend/src/`
- Servidor completo reconstruído do zero (9 módulos de rotas)
- **API completa**: dashboard, therapists (CRUD + cadastro público), patients (CRUD), assignments, matching, webhooks kiwify, webhooks manychat, manychat config, therapist portal
- Alias compatível com sistema antigo: `POST /api/receber-paciente`
- Integração ManyChat: `setCustomField` + `addTag` + delay 2s com IDs exatos do sistema original
- Integração Kiwify: 5 fallbacks de identificação + mapeamento de 20+ ofertas → leads
- Config ManyChat gerenciada via banco/UI (sem reiniciar servidor)
- Tabela `manychat_subscribers` para lookup WhatsApp → Subscriber ID
- Auth admin via Bearer token (`ADMIN_SECRET`)
- Auth terapeuta via token no header (`x-therapist-token`)
- Health check em `GET /health`

### Schema do banco (10 tabelas) — `backend/src/db/schema.ts`
- `therapists` — dados completos (gênero, abordagem, especialidades, público atendido, turnos, saldo, ManyChat subscriber ID, reposições)
- `patients` — dados completos (gênero, preferência, turno, motivo, tipo de terapia, dados infantil/terceiros, ManyChat subscriber ID)
- `assignments` — atribuições com score de compatibilidade e status de notificação
- `matching_config` — modo (auto/semi/manual/pausado) + pesos dos critérios
- `matching_log` — histórico de todas as decisões de matching
- `manychat_config` — API key, flow namespaces, tag IDs, custom field IDs (gerenciável via UI)
- `manychat_subscribers` — lookup WhatsApp → Subscriber ID
- `webhooks_kiwify` — registro de todos os webhooks Kiwify recebidos (P6)
- `webhooks_manychat_received` — registro de webhooks ManyChat recebidos (P4)
- `webhooks_manychat_sent` — registro de webhooks ManyChat enviados (P5)
- `lead_replenishments` — solicitações de reposição de leads (P3)

### Algoritmo de Matching v2.0 — `backend/src/services/matching.ts`

Documentação completa: `MATCHING_DETALHADO_2_0.md`
Fluxograma visual: `FLUXOGRAMA_MATCHING_2_0.html` ([ver online](https://vertixmkt.github.io/fluxograma-matching-terapia-acolher/))

#### Passo 1 — Verificação de elegibilidade do paciente
- Status = `pendente` (não atribuído, não arquivado)
- Motivo preenchido (obrigatório para score de compatibilidade)
- WhatsApp válido (obrigatório para notificação)

#### Passo 2 — Filtros eliminatórios BIDIRECIONAIS
- Corta terapeuta inativo
- Corta terapeuta com saldo zero
- Corta por gênero do paciente → terapeuta (paciente quer mulher → corta homens)
- Corta por gênero do terapeuta → paciente (terapeuta só atende mulheres → corta homens) **(BIDIRECIONAL — novo na v2.0)**
- Corta por turno (paciente quer manhã → corta quem não atende de manhã)
- Corta por público especial (casal/infantil)

#### Passo 3 — Taxa proporcional de distribuição (velocidade de entrega)

**Problema original:** como garantir que todo mundo receba todos os leads em ~1 mês, independente do tamanho do pacote? Um sistema de 2 pools fixos (>=15 e <15) criava um corte arbitrário — quem tem 14 leads recebia 1/dia (14 dias), quem tem 15 recebia 2/dia (8 dias).

**Solução: taxa proporcional ao saldo.** O limite diário de cada terapeuta é calculado dinamicamente:

```
limite_diario = max(1, arredondar_pra_cima(saldo / TARGET_DAYS))
```

`TARGET_DAYS = 20` (dias úteis, ~1 mês). Configurável em `backend/src/services/matching.ts`.

Resultado com os pacotes atuais da Kiwify:

| Pacote | Leads | R$ | Leads/dia | Entrega em |
|--------|-------|----|-----------|------------|
| Acolher Light | 3 | 97 | 1 | 3 dias |
| Acolher Regular | 10 | 250 | 1 | 10 dias |
| Acolher Mais | 15 | 350 | 1 | 15 dias |
| Acolher Máximo | 20 | 410 | 1 | 20 dias |
| 30 Contatos | 30 | 600 | 2 | 15 dias |
| 60 Contatos | 60 | 1.170 | 3 | 20 dias |

Terapeutas que já atingiram o limite diário são pulados automaticamente.

#### Passo 4 — Score de compatibilidade por keywords (12 categorias)

Combina motivo do paciente + abordagem + especialidades do terapeuta em um texto único. Busca keywords de 12 categorias terapêuticas:

`ansiedade` · `depressão` · `relacionamento` · `trauma` · `infantil` · `comportamento` · `psicanalítica` · `humanista` · `cognitiva` · `estresse` · `luto` · `alimentar`

**Score = 50 (base) + 10 por categoria encontrada, máximo 100**

| Categorias | Score | Significado |
|-----------|-------|-------------|
| 0 | 50% | Só passou nos filtros |
| 1 | 60% | Compatibilidade mínima |
| 2 | 70% | Compatibilidade moderada |
| 3 | 80% | Boa compatibilidade |
| 4 | 90% | Muito boa |
| 5+ | 100% | Excelente |

#### Passo 5 — Cascata de compatibilidade (85 → 75 → 65)

Em vez de um corte único (v1.0 usava 70%), o sistema tenta 3 níveis progressivos:

| Nível | Threshold | Categorias mín. | Ação |
|-------|-----------|-----------------|------|
| 1 | ≥ 85% | 4+ | Atribui automaticamente (excelente match) |
| 2 | ≥ 75% | 3+ | Atribui automaticamente (bom match) |
| 3 | ≥ 65% | 2+ | Atribui automaticamente (match aceitável) |
| Nenhum | < 65% | 0-1 | **Não atribui** — paciente fica pendente para admin |

#### Passo 6 — Distribuição de carga
Dentro do nível da cascata, prioriza quem não recebeu paciente há mais tempo (distribuição justa). Desempate: maior score.

#### Matching automático em TODAS as vias de entrada
- **Paciente via ManyChat** → `runAutoMatching()` dispara automaticamente
- **Paciente criado pelo admin** → `runAutoMatching()` dispara automaticamente
- **Terapeuta aprovado pelo admin** → `matchPendingPatients()` processa fila de pendentes
- **Terapeuta recebe saldo via Kiwify** → `matchPendingPatients()` processa fila de pendentes
- **Terapeuta se cadastra com Kiwify vinculado** → `matchPendingPatients()` processa fila de pendentes
- Modos **manual** e **pausado** bloqueiam matching automático
- Botão "Executar matching manual" no dashboard continua disponível

#### Prioridades originais
- P1 — Fluxo de entrada do terapeuta via Kiwify (compra → webhook → link de cadastro → fila)
- P3 — Reposição de leads: até 3 por ciclo, aprovação pelo admin
- P4 — Lista de webhooks recebidos do ManyChat (`GET /api/webhooks/manychat/received`)
- P5 — Lista de webhooks enviados ao ManyChat (`GET /api/webhooks/manychat/sent`)
- P6 — Lista de webhooks recebidos da Kiwify (`GET /api/webhooks/kiwify`)

### Frontend (React 19 + Vite + Tailwind + TypeScript) — `frontend-novo/src/`
- Landing page com acesso a Area Admin e Portal do Terapeuta
- **Area Admin** (7 páginas): Dashboard, Autorização de Cadastros, Cadastro Rápido, Pacientes, Terapeutas, Atribuições, Matching
- **Portal Terapeuta** (3 páginas): Perfil, Minhas Atribuições, Meu Saldo
- API client completo conectado ao backend (`frontend-novo/src/api/client.ts`)
- Componentes UI reutilizáveis: AdminLayout, TherapistLayout, Badge, Card, StatCard

### Mapeamento de pacotes Kiwify

#### Pacotes atuais (março/2026)

| Oferta | Leads | Preço |
|--------|-------|-------|
| Acolher Light | 3 | R$ 97 |
| Acolher Regular | 10 | R$ 250 |
| Acolher Mais | 15 | R$ 350 |
| Acolher Máximo | 20 | R$ 410 |
| Acolher 30 Contatos | 30 | R$ 600 |
| Acolher 60 Contatos | 60 | R$ 1.170 |

#### Pacotes legados (mantidos no mapeamento para retrocompatibilidade)

| Oferta | Leads |
|--------|-------|
| +5 Contatos | 5 |
| De Volta | 12 |
| Infinity | 25 |
| Infinity Top | 28 |
| DIA DAS MULHERES | 8 |

### Documentação entregue
- `ROADMAP_MELHORIAS.md` + `.html`
- `RELATORIO_PROGRESSO.html` + simplificado
- `PRIORIDADES.md`
- Proposta comercial completa (PDF + HTML) para o Rodrigo
- `MATCHING_DETALHADO_2_0.md` — documentação completa dos 12 passos do matching v2.0
- `FLUXOGRAMA_MATCHING_2_0.html` — fluxograma visual interativo com 8 diagramas Mermaid ([GitHub Pages](https://vertixmkt.github.io/fluxograma-matching-terapia-acolher/))

### Correções e melhorias aplicadas (24/03/2026)
- **Conexão MySQL morrendo após inatividade** — trocado `createConnection` por `createPool` com keepAlive em `db/index.ts`
- **Matching automático incompleto** — adicionado matching em todas as vias de entrada (antes só funcionava via ManyChat webhook)
- **Threshold de score subido de 30% para 70%** — pacientes sem match de qualidade ficam pendentes para o admin (pedido do Rodrigo)
- **Score recalibrado** — base reduzida de 50 para 30, keywords ampliadas (vício, jogatina, obesidade, burnout, etc.), escala mais exigente

### Correções e melhorias aplicadas (25/03/2026)
- **Página Autorização de Cadastros** — nova tela admin para revisar, aprovar ou rejeitar cadastros de terapeutas pendentes. Lista com cards, modal de detalhes (especialidades, turnos, público atendido), botões de aprovar/rejeitar
- **Página Cadastro Rápido** — nova tela admin com dois cards (Cadastrar Paciente / Cadastrar Terapeuta). Formulário inline de paciente (nome, telefone, gênero, preferência, turno, tipo de atendimento, motivo) com matching automático pós-cadastro. Formulário de terapeuta (nome, whatsapp, email, gênero, abordagem, status, saldo, turnos, público atendido, especialidades)
- **Bug crítico: `insertId` undefined no Drizzle ORM** — `db.insert()` no Drizzle com mysql2 retorna `[ResultSetHeader, null]`, não o header direto. Corrigido `(result as any).insertId` → `(result as any)[0].insertId` em **7 arquivos** (patients, therapists, matching, webhooks-manychat, therapist-portal, assignments). Sem essa correção, toda criação de registro falhava silenciosamente
- **API client: `patients.create()`** — adicionado método que faltava no frontend para cadastro de pacientes via admin
- **Sidebar atualizada** — adicionados links para Autorização (ícone ClipboardCheck) e Cadastro Rápido (ícone Zap)
- **Botão "+ Novo terapeuta" removido** da página Terapeutas — cadastro agora é feito exclusivamente pela página Cadastro Rápido
- **Portal do Terapeuta — login por e-mail/WhatsApp** — terapeuta loga usando o mesmo e-mail ou WhatsApp do cadastro/compra Kiwify (busca por `email`, `whatsapp` e `phone`). Sem necessidade de token manual. Mensagens específicas para cadastro pendente ou inativo. Link direto via `?token=xxx` continua funcionando (retrocompatível)
- **Portal do Terapeuta — toggle Ativo/Inativo** — banner interativo no perfil: verde "Recebendo pacientes" com botão "Pausar recebimento", amarelo "Recebimento pausado" com botão "Voltar a receber". Permite ao terapeuta se pausar em férias ou agenda cheia. O matching já respeita: filtro eliminatório corta `status !== 'ativo'`
- **Distribuição proporcional (substituiu os 2 pools fixos)** — limite diário agora é `max(1, ceil(saldo/20))`. Todos os pacotes entregam em ~20 dias úteis. Sem corte arbitrário. Detalhes completos na seção "Algoritmo de Matching > Passo 2"
- **Mapeamento Kiwify atualizado** — 6 pacotes atuais (Light, Regular, Mais, Máximo, 30 e 60 Contatos) + nomes legados mantidos para retrocompatibilidade

### Matching v2.0 — Reescrita do algoritmo (26/03/2026)
- **Verificação de elegibilidade** — paciente precisa ter status `pendente`, motivo preenchido e WhatsApp válido antes do matching começar
- **Filtro bidirecional de gênero** — agora verifica dos dois lados: preferência do paciente → gênero do terapeuta E `serves_gender` do terapeuta → gênero do paciente. Na v1.0 era unidirecional (só o lado do paciente)
- **Score por 12 categorias de keywords** — substituiu o score anterior (30 base + abordagem + especialidades). Agora: combina motivo + abordagem + especialidades em texto único, busca keywords de 12 categorias terapêuticas. Score = 50 + (categorias × 10), máx 100
- **Cascata 85→75→65 (substituiu corte único de 70%)** — tenta Nível 1 (≥85%) primeiro, depois Nível 2 (≥75%), depois Nível 3 (≥65%). Se ninguém atinge 65%, paciente fica pendente para admin. Mais flexível que o corte rígido de 70%
- **Saldo nunca fica negativo** — `GREATEST(0, saldo - 1)` via SQL impede race conditions
- **Distribuição por tempo de espera** — dentro do nível da cascata, prioriza quem não recebeu paciente há mais tempo (antes priorizava por score)
- **Notificação bilateral mantida** — paciente via ManyChat, terapeuta via ManyChat (será migrado para Telegram)
- **Documentação completa** — `MATCHING_DETALHADO_2_0.md` (12 passos detalhados) + `FLUXOGRAMA_MATCHING_2_0.html` (8 diagramas Mermaid, publicado no [GitHub Pages](https://vertixmkt.github.io/fluxograma-matching-terapia-acolher/))

---

## ⏳ Pendente / Em andamento

- Página de **Compras Kiwify** no frontend (atualmente placeholder "em breve")
- Página de **Configurações** no frontend (atualmente placeholder "em breve")
- Testes completos com dados reais de produção
- Configurar URL do webhook no painel Kiwify
- Validar API Key do ManyChat para envios reais

## ❌ Ainda não feito

- Notificação do terapeuta via **Telegram** (substituir ManyChat para terapeutas)
- Notificações por email ao terapeuta
- Painel de relatórios e métricas avançadas
- App mobile (portal do terapeuta)

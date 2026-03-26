# Roadmap de Melhorias — Sistema Terapia Acolher
**Versão:** 3.1 | **Atualizado em:** 16 de Março de 2026 | **Elaborado por:** Matheus Pinheiro

---

## Status atual

> **Backend novo e frontend novo foram construídos do zero.** As 6 prioridades definidas na call de 13/03 estão implementadas no código. Aguardamos acessos do Rodrigo para conectar ao banco de dados real e fazer os primeiros testes com dados de produção.

### O que já foi entregue

| Entrega | Status |
|---------|--------|
| Frontend novo (UI completa: dashboard, terapeutas, pacientes, matching, portal terapeuta) | ✅ Concluído |
| Backend novo (Node.js + Express + MySQL + Drizzle) | ✅ Concluído |
| P1 — Fluxo de entrada do terapeuta via Kiwify | ✅ Implementado |
| P2 — Matching automático com filtros eliminatórios | ✅ Implementado |
| P3 — Reposição de leads (limite 3 por ciclo) | ✅ Implementado |
| P4 — Lista de webhooks recebidos do ManyChat | ✅ Implementado |
| P5 — Lista de webhooks enviados ao ManyChat | ✅ Implementado |
| P6 — Lista de webhooks recebidos da Kiwify | ✅ Implementado |
| Integração ManyChat completa (setCustomField + addTag + delay 2s, IDs exatos do original) | ✅ Implementado |
| Integração Kiwify completa (5 fallbacks de identificação, mapeamento de 20+ ofertas) | ✅ Implementado |
| Config ManyChat gerenciada via banco/UI (sem precisar reiniciar servidor) | ✅ Implementado |
| Tabela manychat_subscribers (lookup WhatsApp → Subscriber ID) | ✅ Implementado |
| Análise profunda do sistema original (ManyChat + Kiwify + fluxo exato) | ✅ Concluído em 16/03 |
| Sistema antigo (terapia-matching) acessível para referência | ✅ old-terapia-acolher.vercel.app |
| Acesso ao ManyChat recebido | ✅ (Rodrigo adicionou na call de 13/03) |
| Relatórios de progresso gerados (técnico + simplificado para cliente) | ✅ Concluído em 16/03 |

---

## O que precisamos de você antes de testar

| Item | Descrição | Status |
|------|-----------|--------|
| Banco de dados | Credenciais MySQL/TiDB ou dump para ambiente de dev | ⏳ Pendente |
| Kiwify | Acesso ao painel para configurar URL do webhook | ⏳ Pendente |
| Ambiente de hospedagem | VPS Hostinger ou acesso ao Manus para exportar dados | ⏳ Pendente |
| ManyChat | API Key para ativar envios | ✅ Acesso recebido |

> **Todos os acessos são tratados com total confidencialidade.** Recomendamos criar credenciais específicas para o desenvolvimento.

---

## As 6 Prioridades

### Prioridade 1 — Fluxo de entrada do terapeuta ✅
**Terapeuta compra na Kiwify → recebe e-mail com link de cadastro → preenche formulário → entra na fila com os leads corretos**

- Webhook da Kiwify chega → sistema detecta o pacote e os leads correspondentes
- Terapeuta preenche formulário no link de cadastro
- Ao cadastrar, sistema vincula automaticamente os webhooks Kiwify pendentes
- Rodrigo aprova o cadastro → terapeuta entra na fila ativa
- Saldo de leads é creditado corretamente (não mais fixo em 10)

### Prioridade 2 — Matching automático com exigências eliminatórias ✅
**As exigências do paciente são filtros eliminatórios, independente da posição do terapeuta na fila**

- Paciente quer ser atendida por mulher? Só mulheres entram no pool
- Turno específico? Filtra apenas quem atende naquele turno
- Saldo zerado? Descartado automaticamente
- Dentro dos elegíveis: quem está há mais tempo sem lead tem prioridade
- Score de especialidades + abordagem decide desempates

### Prioridade 3 — Reposição de lead (fantasma) ✅
**Terapeuta que relata paciente sem resposta pode solicitar até 3 leads de reposição por ciclo**

- Terapeuta acessa portal e abre solicitação informando o protocolo de contato (0h, 24h, 72h, 15 dias)
- Admin aprova → 1 lead é creditado
- Limite máximo: 3 reposições por ciclo

### Prioridade 4 — Lista de webhooks recebidos do ManyChat ✅
**Todos os dados que chegam do ManyChat ficam registrados e visíveis**

- Nome, telefone, gênero, turno, motivo do paciente
- Subscriber ID do ManyChat
- Status de processamento (processado / erro)
- Endpoint: `GET /api/webhooks/manychat/received`

### Prioridade 5 — Lista de webhooks enviados ao ManyChat ✅
**Todos os envios ao ManyChat ficam registrados com status e payload**

- Notificação ao paciente: dados do terapeuta atribuído
- Notificação ao terapeuta: dados do novo paciente
- Status de cada envio (success / error) com possibilidade de re-envio
- Endpoint: `GET /api/webhooks/manychat/sent`

### Prioridade 6 — Lista de webhooks recebidos da Kiwify ✅
**Todos os webhooks de compra da Kiwify ficam registrados e rastreáveis**

- Nome, e-mail, produto, oferta e valor da compra
- Quantidade de leads correspondente ao pacote
- Status de vinculação ao terapeuta
- Endpoint: `GET /api/webhooks/kiwify`

---

## Diagnóstico do sistema atual

### Problemas identificados na call de 13/03/2026
- Bug crítico: saldo fixo em 10 leads para todos os terapeutas novos (corrigido no backend novo)
- Bug: webhooks Kiwify pendentes não eram vinculados ao cadastro do terapeuta (corrigido)
- Telas mortas: Z-API, Análise de Mensalidades, Debug Logs, Feedback Pacientes, Comparação Envios
- Dashboard sem utilidade real (será redesenhado)
- Terapeuta não tinha portal próprio (implementado no novo sistema)

### Legado a remover (sistema antigo)
- Integração Z-API (abandonada)
- Telas: Monitoramento Fila, Análise Mensalidades, Métricas Terapeuta, Comparação Envios, Feedback Pacientes, Debug Logs, Histórico Z-API

---

## Estrutura do novo sistema

```
CÉREBRO TERAPIA ACOLHER/
├── backend/           ← Backend novo (Node.js + Express + MySQL)
├── frontend-novo/     ← Frontend novo (React + Tailwind)
├── terapia-matching/  ← Sistema antigo (referência, não mexer)
└── PRIORIDADES.md     ← Este documento de prioridades
```

### Endpoints principais

| Rota | Descrição |
|------|-----------|
| `POST /api/public/register` | Cadastro público do terapeuta (P1) |
| `POST /api/webhooks/kiwify` | Receber compra da Kiwify (P1 + P6) |
| `GET /api/webhooks/kiwify` | Listar webhooks Kiwify (P6) |
| `POST /api/webhooks/manychat/patient` | Receber paciente do ManyChat (P4) |
| `GET /api/webhooks/manychat/received` | Listar recebidos (P4) |
| `GET /api/webhooks/manychat/sent` | Listar enviados (P5) |
| `POST /api/matching/run` | Rodar matching automático (P2) |
| `POST /api/matching/suggest` | Sugerir terapeuta (modo semi-auto) |
| `POST /api/assignments/replenishment` | Solicitar reposição de lead (P3) |
| `GET /api/therapist/me` | Portal do terapeuta — perfil |
| `GET /api/therapist/me/assignments` | Portal do terapeuta — atribuições |
| `GET /api/therapist/me/balance` | Portal do terapeuta — saldo |

---

## Próximos passos

1. **Rodrigo enviar credenciais do banco de dados** → rodar `npm run db:push` para criar as tabelas
2. **Configurar Kiwify** → apontar webhook para `https://api.terapiaacolher.com.br/api/webhooks/kiwify`
3. **Configurar ManyChat** → usar API Key para ativar envios automáticos
4. **Deploy VPS Hostinger** → provisionar servidor, configurar Nginx + PM2 + SSL
5. **Conectar frontend ao backend** → preencher `VITE_API_URL` no `.env` do frontend

---

*Sistema em desenvolvimento ativo — atualizado após call com Rodrigo em 13/03/2026*

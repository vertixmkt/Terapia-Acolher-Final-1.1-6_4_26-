# Prioridades do Sistema — Terapia Acolher
**Atualizado em:** 13 de Março de 2026
**Responsável:** Matheus Pinheiro

---

## Prioridade 1 — Fluxo de Entrada do Terapeuta
**Status:** ✅ Implementado no backend novo

> Quando o terapeuta faz a compra na Kiwify, ele já recebe um e-mail com acesso à plataforma (terapeuta) para realizar o cadastro. Depois disso, ele já entra na fila para receber pacientes — com o número de pacientes que ele comprou, dependendo do pacote adquirido na Kiwify.

### Como funciona
1. Terapeuta compra um pacote na **Kiwify**
2. Kiwify envia webhook para `POST /api/webhooks/kiwify` — sistema registra e detecta quantos leads correspondem ao pacote
3. Kiwify também envia e-mail automático com o **link de cadastro** (configurado no próprio painel Kiwify)
4. Terapeuta acessa o link → preenche o formulário em `/cadastro-terapeuta-planos`
5. Sistema cria o terapeuta e **processa automaticamente os webhooks Kiwify pendentes** vinculando o saldo correto de leads
6. Rodrigo recebe alerta de novo cadastro pendente → aprova
7. Terapeuta entra automaticamente na fila de matching com o saldo correto

### Mapeamento de pacotes
| Oferta Kiwify | Leads |
|---------------|-------|
| Acolher Light | 3 |
| +5 Contatos | 5 |
| De Volta | 12 |
| Acolher Mais | 15 |
| Acolher Máximo | 20 |
| Infinity | 25 |
| Infinity Top | 28 |
| Trimestral | 30 |
| Semestral | 60 |

### Pendências
- [ ] Testar com webhook real da Kiwify (precisa acesso ao painel Kiwify)
- [ ] Confirmar URL do link de cadastro que a Kiwify envia no e-mail
- [ ] Validar o campo de e-mail usado para vincular o webhook ao terapeuta

---

## Prioridade 2 — Matching Automático com Filtros Eliminatórios
**Status:** ✅ Implementado no backend novo

> O matching entre paciente e terapeuta deve ser automático quando o terapeuta entrar na fila. As exigências do paciente vêm em primeiro lugar. Por exemplo: se há uma paciente que quer ser atendida por mulher e quer tratar compulsão alimentar, essas exigências devem ser eliminatórias na escolha do terapeuta, mesmo que esse terapeuta esteja nos últimos lugares da fila.

### Algoritmo (em ordem)
1. **Filtros ELIMINATÓRIOS** (paciente com requisito específico → sem esse requisito = descartado):
   - Gênero do terapeuta (se paciente pede M ou F)
   - Turno compatível
   - Saldo de leads > 0
   - Status = ativo
2. **Ordenação**: terapeutas que há mais tempo sem receber lead vêm primeiro
3. **Score de compatibilidade**: especialidades + abordagem vs. queixa do paciente (máx 100 pts)
4. Mínimo de 30 pts para ser elegível; se ninguém atingir, usa o melhor disponível

### Modos disponíveis
- `auto` — matching roda automaticamente quando paciente chega via ManyChat
- `semi` — admin recebe sugestão, confirma manualmente
- `manual` — admin escolhe o terapeuta diretamente
- `pausado` — fila parada, nenhum matching ocorre

### Pendências
- [ ] Testar fluxo completo com dados reais
- [ ] Ajustar score mínimo conforme feedback operacional

---

## Prioridade 3 — Reposição de Lead (Lead Fantasma)
**Status:** ✅ Implementado no backend novo

> Se o terapeuta abrir uma reclamação dizendo que o paciente não respondeu às mensagens, ele pode solicitar novos "leads", com um limite de até 3 leads novos, e entrar na fila novamente.

### Como funciona
- Terapeuta acessa o portal e solicita reposição informando:
  - Qual atribuição (paciente que não respondeu)
  - Que fez contato em 0h, 24h, 72h e 15 dias (protocolo obrigatório)
  - Motivo da reclamação
- Sistema verifica o limite (máx 3 por terapeuta por ciclo)
- Solicitação vai para fila de aprovação do admin
- Admin aprova → 1 lead é creditado ao terapeuta automaticamente
- Terapeuta entra na fila novamente

### Pendências
- [ ] Definir com Rodrigo o que é "ciclo" para o limite (mensal? por compra?)
- [ ] Interface no portal do terapeuta para solicitar reposição
- [ ] Notificação ao admin quando nova solicitação chegar

---

## Prioridade 4 — Lista de Webhooks Recebidos do ManyChat
**Status:** ✅ Implementado no backend novo

> Deve haver uma lista de todos os webhooks recebidos do ManyChat, com o nome e os dados (do paciente e do terapeuta) que vieram no webhook.

### Endpoint
`GET /api/webhooks/manychat/received`

### O que é registrado
- Tipo do webhook (novo paciente, atualização)
- Nome, telefone, e-mail do contato
- Subscriber ID do ManyChat
- Gênero, turno, motivo (dados do paciente)
- Status de processamento (pendente / processado / erro)
- Payload completo recebido
- Data/hora de entrada

### Pendências
- [ ] Criar página no frontend-novo para visualizar essa lista
- [ ] Filtros por data, status, nome

---

## Prioridade 5 — Lista de Webhooks Enviados para o ManyChat
**Status:** ✅ Implementado no backend novo

> Deve haver uma lista de todos os webhooks que foram enviados para o ManyChat (paciente e terapeuta).

### Endpoint
`GET /api/webhooks/manychat/sent`

### O que é registrado
- Tipo (notificação para paciente / notificação para terapeuta)
- Nome do destinatário
- Subscriber ID do ManyChat
- Atribuição relacionada
- Status do envio (success / error / skipped)
- Payload completo enviado
- Resposta recebida do ManyChat
- Mensagem de erro (se houver)
- Data/hora do envio

### Pendências
- [ ] Criar página no frontend-novo para visualizar essa lista
- [ ] Botão de re-envio em caso de erro
- [ ] Filtros por tipo e data

---

## Prioridade 6 — Lista de Webhooks Recebidos da Kiwify
**Status:** ✅ Implementado no backend novo

> Deve haver uma lista com todos os webhooks que vieram da Kiwify (terapeutas).

### Endpoint
`GET /api/webhooks/kiwify`

### O que é registrado
- Order ID e Order Ref da Kiwify
- Nome, e-mail e telefone do cliente (terapeuta)
- Nome do produto e da oferta
- Quantidade de leads correspondente
- Valor da compra (em centavos)
- Status do pedido (paid / refused / etc.)
- Status de processamento (pending / processed / error)
- Terapeuta vinculado (se já cadastrado)
- Payload completo
- Data de recebimento

### Pendências
- [ ] Criar página no frontend-novo para visualizar essa lista
- [ ] Filtro por status (pendentes sem terapeuta vinculado)
- [ ] Botão para processar manualmente webhooks pendentes

---

## Status Geral do Projeto

| Item | Status |
|------|--------|
| Backend novo criado | ✅ |
| Schema do banco de dados | ✅ |
| API de terapeutas (CRUD + cadastro público) | ✅ |
| API de pacientes (CRUD) | ✅ |
| API de atribuições | ✅ |
| Webhook Kiwify (P1 + P6) | ✅ |
| Webhook ManyChat recebido (P4) | ✅ |
| Webhook ManyChat enviado (P5) | ✅ |
| Algoritmo de matching (P2) | ✅ |
| Reposição de leads (P3) | ✅ |
| Portal do terapeuta (backend) | ✅ |
| Frontend novo (UI) | ✅ |
| API client no frontend | ✅ |
| Páginas frontend conectadas ao backend | ⏳ Pendente |
| Testes com dados reais | ⏳ Aguardando acessos |
| Deploy VPS Hostinger | ⏳ Aguardando acessos |
| Configuração ManyChat | ⏳ Aguardando acessos |
| Configuração Kiwify | ⏳ Aguardando acessos |

---

## O que precisamos do Rodrigo para testar

- [ ] Credenciais do banco de dados MySQL (ou dump para dev)
- [ ] Acesso ao painel Kiwify para configurar URL do webhook
- [ ] API Key do ManyChat
- [ ] Acesso ao servidor atual (para migração)

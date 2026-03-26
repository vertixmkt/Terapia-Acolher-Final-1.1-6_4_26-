# Fluxo Completo de Matching Automatico v2.0
## Do Paciente ate Notificacao

**Versao**: 2.0 — Hibrida (Referencia + Sistema Atual)
**Atualizado em**: 25/03/2026
**Arquivo de codigo**: `backend/src/services/matching.ts`

---

## Visao Geral

O algoritmo v2.0 combina:
- **Da referencia**: elegibilidade do paciente, filtros bidirecionais de genero, score por keywords (50 + categorias × 10), cascata de compatibilidade (85→75→65)
- **Do sistema atual**: distribuicao proporcional por saldo (`ceil(saldo/20)`), filtros de casal/infantil, notificacao bilateral (paciente + terapeuta), tratamento de falhas com fila para admin

---

## PASSO 1: Paciente Chega no Sistema

### Entrada de Dados
**Fonte**: Webhook ManyChat, formulario admin (Cadastro Rapido), ou API direta

**Dados Capturados**:
- Nome completo
- WhatsApp (numero com DDD)
- Genero (M, F, NB)
- Preferencia de terapeuta (M, F, NB, indifferent)
- Turno de preferencia (manha, tarde, noite, flexivel)
- Motivo (texto livre — CRITICO para score de compatibilidade)
- Tipo de atendimento (normal, casal, infantil, outra_pessoa)
- Dados complementares: nome da crianca/idade (infantil), nome/telefone do responsavel (outra_pessoa)

**Banco de Dados**: Inserido em `patients` com status `pendente`

### Quando o matching dispara automaticamente
| Via de entrada | Funcao chamada |
|---------------|----------------|
| Paciente via ManyChat (webhook) | `runAutoMatching(patientId)` |
| Paciente criado pelo admin (Cadastro Rapido) | `runAutoMatching(patientId)` |
| Terapeuta aprovado pelo admin | `matchPendingPatients()` |
| Terapeuta recebe saldo via Kiwify | `matchPendingPatients()` |
| Terapeuta se cadastra com Kiwify vinculado | `matchPendingPatients()` |

### Modos de matching
| Modo | Comportamento |
|------|--------------|
| `auto` | Matching automatico em todas as vias |
| `semi` | Sugere terapeuta, admin confirma |
| `manual` | Matching so acontece via botao no dashboard |
| `pausado` | Nenhum matching acontece |

---

## PASSO 2: Verificacao de Elegibilidade do Paciente

Antes de buscar terapeutas, o sistema verifica se o paciente e elegivel.

### Criterios obrigatorios

| Criterio | Validacao | Se falhar |
|----------|-----------|-----------|
| Status = `pendente` | `patient.status !== 'pendente'` | Encerra — paciente ja atribuido ou arquivado |
| Motivo preenchido | `!patient.reason` ou vazio | Encerra — sem motivo, score sera sempre 50 (insuficiente) |
| WhatsApp valido | `!patient.phone` ou vazio | Encerra — impossivel notificar |

### Logs de paciente nao elegivel
```
[Matching] Paciente 42 nao elegivel: status atribuido
[Matching] Paciente 43 nao elegivel: motivo vazio
[Matching] Paciente 44 nao elegivel: WhatsApp vazio
```

### Se elegivel
Prossegue para o Passo 3.

---

## PASSO 3: Filtros Eliminatorios (BIDIRECIONAIS)

### Filtro 1: Status Ativo
```
terapeuta.status === 'ativo'
```
Descarta terapeutas inativos ou pendentes de aprovacao.

### Filtro 2: Saldo de Leads > 0
```
terapeuta.balance > 0
```
Descarta terapeutas que ja consumiram todos os leads do pacote.

### Filtro 3: Compatibilidade de Genero — BIDIRECIONAL

Diferente da v1.0 que so verificava a preferencia do paciente, a v2.0 verifica dos **dois lados**:

**3a. Preferencia do paciente → genero do terapeuta**
```
Se paciente.preferred_gender !== 'indifferent':
   terapeuta.gender DEVE ser igual a paciente.preferred_gender
```

**3b. Preferencia do terapeuta → genero do paciente (NOVO na v2.0)**
```
Se terapeuta.serves_gender !== 'todos':
   terapeuta.serves_gender DEVE ser igual a paciente.gender
```

**Exemplos**:
| Paciente | Pref. paciente | Terapeuta | Serves | Resultado |
|----------|---------------|-----------|--------|-----------|
| Homem | Mulher | Mulher | todos | ✅ Passa |
| Homem | Mulher | Mulher | F | ❌ Corta (terapeuta so atende mulheres) |
| Mulher | Indifferent | Homem | F | ❌ Corta (terapeuta so atende mulheres) |
| Mulher | Indifferent | Homem | todos | ✅ Passa |
| Mulher | Mulher | Homem | todos | ❌ Corta (paciente quer mulher) |

### Filtro 4: Compatibilidade de Turnos
```
Se paciente.shift !== 'flexivel':
   JSON_CONTAINS(terapeuta.shifts, paciente.shift)
```
Verifica se o turno do paciente esta na lista de turnos do terapeuta. Paciente `flexivel` aceita qualquer turno.

### Filtro 5: Publico Especial — Casal
```
Se paciente.therapy_for === 'casal':
   terapeuta.serves_couples DEVE ser true
```

### Filtro 6: Publico Especial — Infantil
```
Se paciente.therapy_for === 'infantil':
   terapeuta.serves_children DEVE ser true
```

### Resultado apos filtros
```
[Matching] Paciente 42: 85 terapeutas passaram nos filtros
```

Se 0 terapeutas passaram → encerra, paciente fica pendente para admin.

---

## PASSO 4: Limite Diario Proporcional (Distribuicao de Velocidade)

### Problema que resolve
Pacotes Kiwify variam de 3 a 60 leads. Sem controle de velocidade, um terapeuta com 60 leads poderia receber todos em poucos dias, enquanto a proposta e entregar em ~1 mes.

### Formula
```
limite_diario = max(1, ceil(saldo / TARGET_DAYS))

TARGET_DAYS = 20 (dias uteis, ~1 mes)
```

### Resultado com pacotes atuais

| Pacote | Leads | R$ | Leads/dia | Entrega em |
|--------|-------|----|-----------|------------|
| Acolher Light | 3 | 97 | 1 | 3 dias |
| Acolher Regular | 10 | 250 | 1 | 10 dias |
| Acolher Mais | 15 | 350 | 1 | 15 dias |
| Acolher Maximo | 20 | 410 | 1 | 20 dias |
| 30 Contatos | 30 | 600 | 2 | 15 dias |
| 60 Contatos | 60 | 1.170 | 3 | 20 dias |

### Logica de filtragem
Para cada terapeuta que passou nos filtros eliminatorios:
1. Contar quantas atribuicoes ele ja recebeu HOJE
2. Calcular o limite diario baseado no saldo atual
3. Se ja atingiu o limite → pular

```
[Matching] Todos os candidatos ja atingiram limite diario para paciente 42
```

### Configuracao
`TARGET_DAYS` pode ser ajustado em `backend/src/services/matching.ts`:
- Valor menor (ex: 15) = entrega mais rapida, mais leads por dia
- Valor maior (ex: 25) = entrega mais lenta, menos leads por dia

---

## PASSO 5: Score de Compatibilidade por Keywords

### Metodo
1. Combina em um texto unico: **motivo do paciente** + **abordagem do terapeuta** + **especialidades do terapeuta**
2. Busca keywords de 12 categorias terapeuticas no texto combinado
3. Conta quantas categorias tiveram pelo menos 1 keyword encontrada
4. Score = `50 + (categorias_encontradas × 10)`, maximo 100

### As 12 Categorias

| Categoria | Keywords |
|-----------|----------|
| ansiedade | ansiedade, panico, medo, fobia, nervoso, preocupacao |
| depressao | depressao, tristeza, melancolia, desanimo, desmotivacao |
| relacionamento | relacionamento, casal, familia, divorcio, separacao, conflito, comunicacao |
| trauma | trauma, ptsd, abuso, violencia, abandono, negligencia |
| infantil | crianca, infantil, filho, adolescente, escola, bullying |
| comportamento | comportamento, tcc, habito, compulsao, vicio, dependencia, jogo, jogatina, tabagismo, alcoolismo |
| psicanalitica | psicanalise, psicanalitica, inconsciente, sonho, infancia |
| humanista | humanista, gestalt, humanismo, autoestima, autoconhecimento, identidade, proposito |
| cognitiva | cognitiva, pensamento, crencas, distorcao |
| estresse | estresse, burnout, esgotamento, sobrecarga, insonia |
| luto | luto, perda, morte, falecimento |
| alimentar | alimentar, anorexia, bulimia, obesidade, peso, emagrecimento |

### Escala de Score

| Score | Categorias | Significado |
|-------|-----------|-------------|
| 50 | 0 | Base (so passou nos filtros) |
| 60 | 1 | Compatibilidade minima |
| 70 | 2 | Compatibilidade moderada |
| 80 | 3 | Boa compatibilidade |
| 90 | 4 | Muito boa |
| 100 | 5+ | Excelente |

### Exemplo de Calculo

**Paciente**: "Estou com muita ansiedade e insonia, nao consigo dormir"
**Terapeuta**: Abordagem TCC, especialidades: ["Ansiedade", "Estresse"]

Texto combinado:
```
"estou com muita ansiedade e insonia, nao consigo dormir tcc ansiedade estresse"
```

Categorias encontradas:
- ✅ ansiedade → "ansiedade" encontrado
- ❌ depressao → nenhuma keyword
- ❌ relacionamento → nenhuma keyword
- ❌ trauma → nenhuma keyword
- ❌ infantil → nenhuma keyword
- ✅ comportamento → "tcc" encontrado
- ❌ psicanalitica → nenhuma keyword
- ❌ humanista → nenhuma keyword
- ❌ cognitiva → nenhuma keyword
- ✅ estresse → "insonia" e "estresse" encontrados
- ❌ luto → nenhuma keyword
- ❌ alimentar → nenhuma keyword

Total: **3 categorias** → Score = 50 + (3 × 10) = **80%**

---

## PASSO 6: Cascata de Compatibilidade

Diferente da v1.0 (corte unico em 70%), a v2.0 usa cascata progressiva:

### Nivel 1: Score >= 85% (excelente)
```
candidatos = scored.filter(s => s.score >= 85)
```
Se encontrou → usa esses candidatos.

### Nivel 2: Score >= 75% (bom)
```
Se Nivel 1 vazio:
   candidatos = scored.filter(s => s.score >= 75)
```
Se encontrou → usa esses candidatos.

### Nivel 3: Score >= 65% (aceitavel)
```
Se Nivel 2 vazio:
   candidatos = scored.filter(s => s.score >= 65)
```
Se encontrou → usa esses candidatos.

### Nenhum nivel atingido
```
Se Nivel 3 vazio:
   paciente fica pendente para admin
   log: "Nenhum terapeuta atingiu 65% — aguardando admin"
```

### Logs
```
[Matching] Paciente 42: 12 terapeutas no Nivel 1 (>=85%)
[Matching] Paciente 43: 8 terapeutas no Nivel 2 (>=75%)
[Matching] Paciente 44: 3 terapeutas no Nivel 3 (>=65%)
[Matching] Nenhum terapeuta atingiu 65% para paciente 45 — aguardando admin
```

### Quando cada nivel acontece na pratica

| Nivel | Categorias | Exemplo tipico |
|-------|-----------|----------------|
| 1 (>=85) | 4+ categorias | Paciente com queixa especifica + terapeuta especializado na area |
| 2 (>=75) | 3 categorias | Boa sobreposicao entre queixa e perfil |
| 3 (>=65) | 2 categorias | Match parcial — aceitavel mas nao ideal |
| Nenhum | 0-1 categorias | Queixa muito generica ou perfil muito diferente |

---

## PASSO 7: Distribuicao de Carga (Selecao Final)

Dentro do nivel da cascata, o sistema seleciona **1 terapeuta** usando:

### Criterio 1 (primario): Ultima atribuicao mais antiga
```
Ordenar por last_assigned_at ASC (mais antigo primeiro)
```
Prioriza terapeutas que nao receberam pacientes recentemente, garantindo distribuicao justa.

Se o terapeuta nunca recebeu um paciente (`last_assigned_at = null`), ele tem prioridade maxima (timestamp = 0).

### Criterio 2 (desempate): Maior score
```
Se last_assigned_at igual:
   ordenar por score DESC (maior score primeiro)
```

### Resultado
1 terapeuta selecionado.

```
[Matching] ✅ Paciente 42 → Terapeuta 15 (score: 85)
```

---

## PASSO 8: Criar Atribuicao

### Inserir no banco
```sql
INSERT INTO assignments (patient_id, therapist_id, status, compatibility_score, match_reason, assigned_at)
VALUES (42, 15, 'pendente', 85, 'Abordagem: TCC | Especialidades: Ansiedade, Estresse', NOW())
```

### Obter ID da atribuicao
```
const assignmentId = result[0].insertId
```

---

## PASSO 9: Deduzir Saldo de Leads

### Protecao contra saldo negativo (NOVO na v2.0)
```sql
UPDATE therapists
SET balance = GREATEST(0, balance - 1),
    total_assignments = total_assignments + 1,
    last_assigned_at = NOW()
WHERE id = 15
```

Na v1.0, `balance - 1` podia resultar em saldo negativo em caso de race condition. A v2.0 usa `GREATEST(0, ...)` para garantir que nunca fique negativo.

---

## PASSO 10: Atualizar Status do Paciente

```sql
UPDATE patients
SET assigned_therapist_id = 15,
    assigned_at = NOW(),
    status = 'atribuido'
WHERE id = 42
```

---

## PASSO 11: Registrar Log de Matching

```sql
INSERT INTO matching_log (
  patient_id, therapist_id,
  patient_name, therapist_name,
  score, reason,
  success, decided_at
) VALUES (
  42, 15,
  'Joao Silva', 'Maria Santos',
  85, 'Abordagem: TCC | Especialidades: Ansiedade, Estresse',
  true, NOW()
)
```

Em caso de falha (nenhum match encontrado):
```sql
INSERT INTO matching_log (
  patient_id, success, error, decided_at
) VALUES (
  42, false, 'Nenhum terapeuta disponivel ou nenhum atingiu score minimo de 65%', NOW()
)
```

---

## PASSO 12: Notificacoes

### Notificacao do PACIENTE (ManyChat — WhatsApp)
1. Resolver `subscriber_id` do paciente (via tabela `manychat_subscribers` ou campo direto)
2. `setCustomField` no paciente: nome do terapeuta, WhatsApp do terapeuta
3. Aguardar 2 segundos
4. `addTag` → dispara flow automatico no ManyChat

Se paciente nao tem `subscriber_id`: notificacao ignorada, log de aviso registrado.

### Notificacao do TERAPEUTA (Telegram — a configurar)
Atualmente usa ManyChat (mesma logica do paciente). Sera migrado para **Telegram**:
1. `setCustomField` no terapeuta: nome do paciente, WhatsApp, turno, motivo
2. Aguardar 2 segundos
3. `addTag` → dispara flow automatico

**TODO**: Substituir por envio via Telegram Bot API quando configurado.

### Marcar atribuicao como notificada
```sql
UPDATE assignments
SET notified_patient = true/false,
    notified_therapist = true/false,
    status = 'confirmado'
WHERE id = {assignmentId}
```

---

## Fluxograma Completo

```
┌─────────────────────────────────────────────────────────────────┐
│ PASSO 1: Paciente Chega                                         │
│ → ManyChat webhook / Cadastro Rapido / API                      │
│ → Inserido em patients com status 'pendente'                    │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASSO 2: Verificar Elegibilidade                                │
│ ✓ Status = pendente                                             │
│ ✓ Motivo preenchido                                             │
│ ✓ WhatsApp valido                                               │
│ ✗ Se nao elegivel → encerra com log                             │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASSO 3: Filtros Eliminatorios BIDIRECIONAIS                    │
│ • Status ativo                                                   │
│ • Saldo > 0                                                      │
│ • Genero: paciente→terapeuta E terapeuta→paciente               │
│ • Turno compativel                                               │
│ • Casal → serves_couples = true                                  │
│ • Infantil → serves_children = true                              │
│ ✗ Se 0 candidatos → encerra, paciente pendente para admin       │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASSO 4: Limite Diario Proporcional                             │
│ • limite = max(1, ceil(saldo / 20))                              │
│ • Quem ja atingiu o limite hoje → pular                          │
│ ✗ Se todos no limite → encerra, paciente pendente               │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASSO 5: Score de Compatibilidade                               │
│ • Combinar: motivo + abordagem + especialidades                  │
│ • Buscar keywords de 12 categorias                               │
│ • Score = 50 + (categorias × 10), max 100                        │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASSO 6: Cascata de Compatibilidade                             │
│ • Nivel 1: >= 85% (excelente)                                    │
│ • Nivel 2: >= 75% (bom)                                          │
│ • Nivel 3: >= 65% (aceitavel)                                    │
│ ✗ Se ninguem >= 65% → encerra, paciente pendente para admin     │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASSO 7: Distribuicao de Carga                                  │
│ • Ordenar por ultima atribuicao (mais antiga primeiro)           │
│ • Desempate: maior score                                         │
│ → 1 terapeuta selecionado                                        │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASSO 8: Criar Atribuicao (status: pendente)                    │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASSO 9: Deduzir Saldo com GREATEST(0, saldo - 1)              │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASSO 10: Paciente → status 'atribuido'                         │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASSO 11: Registrar Log de Matching                             │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASSO 12: Notificacoes (assincrono)                             │
│ • Paciente: ManyChat (WhatsApp)                                  │
│ • Terapeuta: Telegram (a configurar)                             │
│ → Atribuicao marcada como 'confirmado'                           │
│ ✅ SUCESSO: Paciente atribuido e ambos notificados              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Pontos de Falha e Tratamento

| Ponto | O que acontece | Tratamento |
|-------|---------------|------------|
| Paciente nao elegivel | Motivo vazio ou sem WhatsApp | Log registrado, matching encerra |
| 0 terapeutas nos filtros | Ninguem com saldo/genero/turno compativel | Paciente fica pendente para admin |
| Todos no limite diario | Todos ja receberam o maximo de hoje | Paciente fica pendente, sera reprocessado |
| Ninguem atinge 65% | Queixa muito generica ou pool muito diferente | Paciente fica pendente para admin |
| Notificacao falha | ManyChat/Telegram indisponivel | Atribuicao ja criada, `notified = false`, log de erro |
| Saldo negativo (race condition) | Dois matchings simultaneos | `GREATEST(0, saldo - 1)` impede negativo |

### Reprocessamento automatico
Pacientes que ficam pendentes sao reprocessados automaticamente quando:
- Um terapeuta e aprovado pelo admin
- Um terapeuta recebe saldo (webhook Kiwify)
- Um terapeuta se cadastra com Kiwify vinculado

A funcao `matchPendingPatients()` processa ate 50 pacientes pendentes por vez.

---

## Diferencas entre v1.0 e v2.0

| Aspecto | v1.0 | v2.0 |
|---------|------|------|
| Elegibilidade | Nao verificava | Verifica status, motivo, WhatsApp |
| Genero | Unidirecional (so paciente) | Bidirecional (paciente + terapeuta) |
| Score base | 30 pts | 50 pts |
| Score metodo | Abordagem (20-35) + especialidades (20 cada) | 12 categorias de keywords × 10 pts |
| Threshold | Corte unico em 70% | Cascata 85→75→65 |
| Distribuicao | Proporcional ceil(saldo/20) | Proporcional ceil(saldo/20) (mantido) |
| Casal/Infantil | Sim | Sim (mantido) |
| Saldo negativo | Possivel | Impossivel (GREATEST) |
| Notificacao | Paciente + terapeuta (ManyChat) | Paciente (ManyChat) + terapeuta (Telegram) |
| Falha | Log + pendente para admin | Log + pendente para admin (mantido) |

---

## Configuracoes Editaveis

| Constante | Valor | Onde | Efeito |
|-----------|-------|------|--------|
| `TARGET_DAYS` | 20 | matching.ts | Velocidade de entrega (menor = mais rapido) |
| `LEVEL_1` | 85 | matching.ts | Threshold do Nivel 1 da cascata |
| `LEVEL_2` | 75 | matching.ts | Threshold do Nivel 2 da cascata |
| `LEVEL_3` | 65 | matching.ts | Threshold do Nivel 3 da cascata |
| `KEYWORD_CATEGORIES` | 12 categorias | matching.ts | Keywords que influenciam o score |
| `matching_config.mode` | auto/semi/manual/pausado | banco (via UI) | Liga/desliga matching automatico |

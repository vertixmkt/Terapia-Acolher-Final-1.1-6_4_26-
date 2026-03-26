# Fluxograma Visual do Matching v2.0

Baseado em `MATCHING_DETALHADO_2_0.md`.

Se o seu preview de Markdown suportar Mermaid, os diagramas abaixo vao aparecer renderizados.

---

## 1. Fluxo Principal Completo

```mermaid
flowchart TD
    A["1. Entrada do paciente<br/>ManyChat / Cadastro Rapido / API"] --> B{"2. Paciente elegivel?<br/>status=pendente<br/>motivo preenchido<br/>WhatsApp valido"}
    B -- "Nao" --> B1["Encerrar fluxo<br/>Registrar log de nao elegivel"]
    B -- "Sim" --> C["3. Buscar terapeutas<br/>Aplicar filtros eliminatorios"]

    C --> D{"Filtros BIDIRECIONAIS<br/>status ativo<br/>saldo > 0<br/>genero paciente↔terapeuta<br/>turno compativel<br/>casal / infantil"}
    D -- "0 candidatos" --> D1["Sem match<br/>Paciente pendente para admin"]
    D -- "N candidatos" --> E["4. Limite diario proporcional<br/>max(1, ceil(saldo / 20))"]

    E --> E2{"Alguem dentro<br/>do limite?"}
    E2 -- "Nao" --> E3["Todos no limite hoje<br/>Paciente pendente<br/>sera reprocessado"]
    E2 -- "Sim" --> F["5. Calcular score<br/>50 + (categorias × 10)<br/>12 categorias de keywords"]

    F --> G1{"6a. Nivel 1<br/>score >= 85%?"}
    G1 -- "Sim" --> J["7. Distribuicao de carga"]
    G1 -- "Nao" --> G2{"6b. Nivel 2<br/>score >= 75%?"}
    G2 -- "Sim" --> J
    G2 -- "Nao" --> G3{"6c. Nivel 3<br/>score >= 65%?"}
    G3 -- "Sim" --> J
    G3 -- "Nao" --> G4["Nenhum terapeuta compativel<br/>Paciente pendente para admin"]

    J --> J1["Ordenar:<br/>1. Ultima atribuicao mais antiga<br/>2. Desempate: maior score"]
    J1 --> L["Selecionar 1 terapeuta"]

    L --> M["8. Criar atribuicao<br/>status = pendente"]
    M --> N["9. Deduzir saldo<br/>GREATEST(0, saldo - 1)"]
    N --> O["10. Paciente → status atribuido"]
    O --> P["11. Registrar log de matching"]
    P --> Q["12. Notificacoes (assincrono)"]

    Q --> Q1["Paciente:<br/>ManyChat (WhatsApp)"]
    Q --> Q2["Terapeuta:<br/>Telegram (a configurar)"]
    Q1 --> T["✅ Sucesso<br/>Atribuicao confirmada"]
    Q2 --> T

    classDef inicio fill:#dff3e4,stroke:#2f855a,color:#1a202c,stroke-width:2px;
    classDef processo fill:#fdf3d5,stroke:#b7791f,color:#1a202c,stroke-width:1.5px;
    classDef decisao fill:#dceefe,stroke:#2b6cb0,color:#1a202c,stroke-width:1.5px;
    classDef falha fill:#fde2e2,stroke:#c53030,color:#1a202c,stroke-width:1.5px;
    classDef sucesso fill:#d6f5e3,stroke:#2f855a,color:#1a202c,stroke-width:2px;
    classDef notif fill:#e8daef,stroke:#6c3483,color:#1a202c,stroke-width:1.5px;

    class A inicio;
    class B,D,E2,G1,G2,G3 decisao;
    class C,E,F,J,J1,L,M,N,O,P,Q processo;
    class B1,D1,E3,G4 falha;
    class T sucesso;
    class Q1,Q2 notif;
```

---

## 2. Visao em Funil

```mermaid
flowchart LR
    A["Novo paciente<br/>Webhook / Admin"] --> B{"Elegivel?<br/>status + motivo + WhatsApp"}
    B -- "Sim" --> C["Terapeutas ativos<br/>com saldo > 0"]
    C --> D["Genero BIDIRECIONAL<br/>paciente↔terapeuta"]
    D --> E["Turno compativel<br/>+ casal / infantil"]
    E --> F["Dentro do<br/>limite diario"]
    F --> G["Score por keywords<br/>12 categorias<br/>50 a 100"]
    G --> H["Cascata<br/>85 → 75 → 65"]
    H --> I["Distribuicao de carga<br/>quem espera mais"]
    I --> J["1 terapeuta<br/>selecionado"]
    J --> K["Criar atribuicao<br/>deduzir saldo<br/>registrar log"]
    K --> L["Notificar ambos<br/>paciente + terapeuta"]

    B -- "Nao" --> X["Fluxo encerra aqui"]

    classDef caixa fill:#f7fafc,stroke:#4a5568,color:#1a202c,stroke-width:1.5px;
    classDef parada fill:#fde2e2,stroke:#c53030,color:#1a202c,stroke-width:1.5px;

    class A,C,D,E,F,G,H,I,J,K,L caixa;
    class B caixa;
    class X parada;
```

---

## 3. Detalhe: Filtro Bidirecional de Genero

```mermaid
flowchart TD
    P["Paciente<br/>genero: M/F/NB<br/>preferencia: M/F/NB/indifferent"]
    T["Terapeuta<br/>genero: M/F/NB<br/>serves_gender: M/F/NB/todos"]

    P --> C1{"Paciente quer<br/>genero especifico?<br/>preferred ≠ indifferent"}
    C1 -- "Sim" --> V1{"Terapeuta.genero<br/>= paciente.preferred?"}
    C1 -- "Nao" --> C2

    V1 -- "Sim" --> C2{"Terapeuta aceita<br/>genero do paciente?<br/>serves = todos<br/>OU serves = paciente.genero"}
    V1 -- "Nao" --> X1["❌ CORTADO<br/>Paciente quer outro genero"]

    C2 -- "Sim" --> OK["✅ PASSA<br/>Genero compativel<br/>nos dois sentidos"]
    C2 -- "Nao" --> X2["❌ CORTADO<br/>Terapeuta nao atende<br/>esse genero"]

    T --> C2

    classDef ok fill:#d6f5e3,stroke:#2f855a,color:#1a202c,stroke-width:2px;
    classDef corte fill:#fde2e2,stroke:#c53030,color:#1a202c,stroke-width:1.5px;
    classDef check fill:#dceefe,stroke:#2b6cb0,color:#1a202c,stroke-width:1.5px;
    classDef dado fill:#fdf3d5,stroke:#b7791f,color:#1a202c,stroke-width:1.5px;

    class P,T dado;
    class C1,V1,C2 check;
    class OK ok;
    class X1,X2 corte;
```

---

## 4. Detalhe: Score e Cascata

```mermaid
flowchart TD
    A["Texto combinado:<br/>motivo + abordagem + especialidades"] --> B["Buscar keywords<br/>em 12 categorias"]

    B --> C1["ansiedade"]
    B --> C2["depressao"]
    B --> C3["relacionamento"]
    B --> C4["trauma"]
    B --> C5["infantil"]
    B --> C6["comportamento"]
    B --> C7["psicanalitica"]
    B --> C8["humanista"]
    B --> C9["cognitiva"]
    B --> C10["estresse"]
    B --> C11["luto"]
    B --> C12["alimentar"]

    C1 --> S["Contar categorias<br/>encontradas"]
    C2 --> S
    C3 --> S
    C4 --> S
    C5 --> S
    C6 --> S
    C7 --> S
    C8 --> S
    C9 --> S
    C10 --> S
    C11 --> S
    C12 --> S

    S --> SC["Score = 50 + (N × 10)<br/>max 100"]

    SC --> L1{"N >= 4?<br/>Score >= 85"}
    L1 -- "Sim" --> R1["Nivel 1<br/>Excelente"]
    L1 -- "Nao" --> L2{"N >= 3?<br/>Score >= 75"}
    L2 -- "Sim" --> R2["Nivel 2<br/>Bom"]
    L2 -- "Nao" --> L3{"N >= 2?<br/>Score >= 65"}
    L3 -- "Sim" --> R3["Nivel 3<br/>Aceitavel"]
    L3 -- "Nao" --> R4["Sem match<br/>Pendente para admin"]

    classDef cat fill:#e8f4fd,stroke:#2b6cb0,color:#1a202c,stroke-width:1px;
    classDef calc fill:#fdf3d5,stroke:#b7791f,color:#1a202c,stroke-width:1.5px;
    classDef nivel1 fill:#d6f5e3,stroke:#2f855a,color:#1a202c,stroke-width:2px;
    classDef nivel2 fill:#dff3e4,stroke:#38a169,color:#1a202c,stroke-width:1.5px;
    classDef nivel3 fill:#fefcbf,stroke:#d69e2e,color:#1a202c,stroke-width:1.5px;
    classDef falha fill:#fde2e2,stroke:#c53030,color:#1a202c,stroke-width:1.5px;
    classDef check fill:#dceefe,stroke:#2b6cb0,color:#1a202c,stroke-width:1.5px;

    class C1,C2,C3,C4,C5,C6,C7,C8,C9,C10,C11,C12 cat;
    class A,B,S,SC calc;
    class L1,L2,L3 check;
    class R1 nivel1;
    class R2 nivel2;
    class R3 nivel3;
    class R4 falha;
```

---

## 5. Detalhe: Distribuicao Proporcional (Limite Diario)

```mermaid
flowchart TD
    S["Saldo atual<br/>do terapeuta"] --> F["limite = max(1, ceil(saldo / 20))"]

    F --> P1["Light (3)<br/>ceil(3/20) = 1/dia<br/>Entrega: 3 dias"]
    F --> P2["Regular (10)<br/>ceil(10/20) = 1/dia<br/>Entrega: 10 dias"]
    F --> P3["Mais (15)<br/>ceil(15/20) = 1/dia<br/>Entrega: 15 dias"]
    F --> P4["Maximo (20)<br/>ceil(20/20) = 1/dia<br/>Entrega: 20 dias"]
    F --> P5["30 Contatos<br/>ceil(30/20) = 2/dia<br/>Entrega: 15 dias"]
    F --> P6["60 Contatos<br/>ceil(60/20) = 3/dia<br/>Entrega: 20 dias"]

    P1 --> C{"Ja recebeu<br/>hoje >= limite?"}
    P2 --> C
    P3 --> C
    P4 --> C
    P5 --> C
    P6 --> C

    C -- "Sim" --> X["Pular terapeuta<br/>ja atingiu limite"]
    C -- "Nao" --> OK["Terapeuta disponivel<br/>para receber paciente"]

    classDef calc fill:#fdf3d5,stroke:#b7791f,color:#1a202c,stroke-width:1.5px;
    classDef pacote fill:#e8f4fd,stroke:#2b6cb0,color:#1a202c,stroke-width:1px;
    classDef check fill:#dceefe,stroke:#2b6cb0,color:#1a202c,stroke-width:1.5px;
    classDef ok fill:#d6f5e3,stroke:#2f855a,color:#1a202c,stroke-width:2px;
    classDef skip fill:#fde2e2,stroke:#c53030,color:#1a202c,stroke-width:1.5px;

    class S,F calc;
    class P1,P2,P3,P4,P5,P6 pacote;
    class C check;
    class OK ok;
    class X skip;
```

---

## 6. Detalhe: Vias de Entrada e Reprocessamento

```mermaid
flowchart TD
    subgraph Entrada["Vias de Entrada de Pacientes"]
        W1["ManyChat<br/>Webhook"]
        W2["Admin<br/>Cadastro Rapido"]
        W3["API<br/>POST /api/patients"]
    end

    W1 --> RM["runAutoMatching(id)"]
    W2 --> RM
    W3 --> RM

    subgraph Reprocessamento["Reprocessamento de Pendentes"]
        T1["Terapeuta<br/>aprovado"]
        T2["Kiwify<br/>saldo creditado"]
        T3["Cadastro com<br/>Kiwify vinculado"]
    end

    T1 --> MP["matchPendingPatients()"]
    T2 --> MP
    T3 --> MP

    MP --> Q["Busca pacientes<br/>status = pendente<br/>limite: 50"]
    Q --> RM2["runAutoMatching(id)<br/>para cada pendente"]

    RM --> ALGO["Algoritmo<br/>de Matching v2.0"]
    RM2 --> ALGO

    ALGO --> R1["✅ Match encontrado<br/>Atribuicao criada"]
    ALGO --> R2["❌ Sem match<br/>Paciente continua pendente"]

    R2 -.-> MP

    classDef entrada fill:#dff3e4,stroke:#2f855a,color:#1a202c,stroke-width:1.5px;
    classDef reproc fill:#e8daef,stroke:#6c3483,color:#1a202c,stroke-width:1.5px;
    classDef func fill:#fdf3d5,stroke:#b7791f,color:#1a202c,stroke-width:1.5px;
    classDef algo fill:#dceefe,stroke:#2b6cb0,color:#1a202c,stroke-width:2px;
    classDef ok fill:#d6f5e3,stroke:#2f855a,color:#1a202c,stroke-width:2px;
    classDef falha fill:#fde2e2,stroke:#c53030,color:#1a202c,stroke-width:1.5px;

    class W1,W2,W3 entrada;
    class T1,T2,T3 reproc;
    class RM,RM2,MP,Q func;
    class ALGO algo;
    class R1 ok;
    class R2 falha;
```

---

## 7. Onde o processo pode parar

| Passo | Motivo de parada | Recuperacao |
|-------|-----------------|-------------|
| 2 | Paciente nao elegivel (sem motivo/WhatsApp) | Admin corrige dados do paciente |
| 3 | 0 terapeutas nos filtros | Espera novo terapeuta ou admin flexibiliza |
| 4 | Todos no limite diario | Automatico: reprocessa no dia seguinte |
| 6 | Ninguem atinge 65% de score | Admin faz matching manual |
| 12 | Notificacao falha (ManyChat/Telegram) | Atribuicao ja criada, admin notifica manualmente |

---

## 8. Leitura Rapida

- O matching **nao comeca pela IA** — primeiro elimina terapeutas por regras obrigatorias bidirecionais
- O **limite diario proporcional** garante que pacotes grandes e pequenos sejam entregues de forma justa
- A **cascata 85→75→65** evita rejeitar matches aceitaveis sem forcar matches ruins
- A **distribuicao de carga** prioriza quem nao recebeu paciente recentemente
- O **reprocessamento automatico** garante que pacientes pendentes nao fiquem esquecidos
- Notificacoes sao **assincronas** — se falharem, a atribuicao ja foi criada
- O saldo **nunca fica negativo** gracas ao `GREATEST(0, saldo - 1)`

# App CÉREBRO — Terapia Acolher

Sistema de gestão e matching automático para a plataforma de terapia online "Terapia Acolher". Conecta pacientes a terapeutas via algoritmo de matching com filtros eliminatórios, integrado ao ManyChat (WhatsApp) e Kiwify (pagamentos).

## Funcionalidades
- Matching automático terapeuta-paciente com filtros eliminatórios (gênero, turno, especialidade)
- Fluxo de entrada do terapeuta via compra na Kiwify + webhook + cadastro por link único
- Sistema de reposição de leads (até 3/ciclo) via portal do terapeuta
- Integração ManyChat: setCustomField + addTag + delay (fluxo WhatsApp)
- Integração Kiwify: 5 fallbacks de identificação + mapeamento de 20+ ofertas/pacotes
- Painel admin: terapeutas, pacientes, logs de webhooks (ManyChat + Kiwify)
- Tabela `manychat_subscribers` para lookup WhatsApp → Subscriber ID
- Dashboard com relatórios de progresso

## Stack
- Node.js + Express + MySQL + Drizzle ORM
- Frontend completo (dashboard, terapeutas, pacientes, matching, portal terapeuta)

## Pendências para entrar em produção
- Credenciais do banco MySQL (TiDB/produção) — fornecidas pelo Rodrigo
- Acesso ao painel Kiwify para configurar URL do webhook
- API Key do ManyChat para ativar envios

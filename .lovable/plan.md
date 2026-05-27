
# Versão Clínica do Grow OS

Ativação **apenas para empresas com segmento Clínica Médica / Odontológica / Estética**. Nenhum impacto nos demais segmentos (jurídico, financeiro, varejo, etc.).

## Como detectar o segmento
Já existe a infraestrutura:
- `src/lib/segmentos.ts` lista os segmentos
- `src/hooks/useCompanySegmento.ts` resolve o segmento da empresa logada

**Vou adicionar:**
- `SEGMENTOS_CLINICA = ["clinica_medica","clinica_odontologica","clinica_estetica"]`
- `isSegmentoClinica(segmento)`
- Campo `isClinica` no retorno de `useCompanySegmento`

Daí toda a versão clínica fica gated por `isClinica`.

---

## Fase 1 — Funil padrão Clínica + automações

**O que entrega:** quando o admin abrir o Kanban pela primeira vez, ou clicar em "Criar funil Clínica", o sistema cria o funil completo com etapas e Follow Inteligente pré-configurado.

**Funil padrão (etapas + cor):**
```
Novo Contato → Contato Realizado → Agendamento Feito →
Consulta Confirmada → Compareceu → Procedimento Realizado →
Pós-Consulta → Retorno/Recorrência → Não Compareceu (no-show) → Perdido
```

**Follow Inteligente por etapa (reaproveita `follow_etapa_config` que já existe):**
- **Agendamento Feito** → WhatsApp imediato: "Sua consulta foi agendada para {{data}}. Confirma?"
- **Consulta Confirmada** → lembrete 1 dia antes + lembrete 30 min antes
- **Não Compareceu** → sequência D+1 (remarcação), D+3 (reforço), D+7 (última)
- **Pós-Consulta** → D+1 "como foi?", D+30 "hora do retorno"
- **Retorno/Recorrência** → reativação 90d

**Arquivos:**
- `src/lib/clinicaFunnelTemplate.ts` (novo) — define etapas + templates de mensagem
- `src/components/funil/CriarFunilClinicaButton.tsx` (novo) — botão no Kanban header (só aparece se `isClinica`)
- Edge function `follow-inteligente-engine` já roda — não precisa mudar

---

## Fase 2 — Adaptação de linguagem

**Escopo cirúrgico:** só nas telas onde a label é exibida ao usuário. Sem refatorar nomes de tabelas/colunas.

**Mecanismo:** helper `src/lib/clinicaLabels.ts`:
```ts
export function leadLabel(isClinica: boolean) { return isClinica ? "Paciente" : "Lead"; }
export function dealLabel(isClinica: boolean) { return isClinica ? "Atendimento" : "Negócio"; }
// pluralLeadLabel, vendaLabel, etc.
```

**Telas que recebem o swap (lista priorizada):**
- Sidebar (item "Leads" → "Pacientes")
- Kanban header e tooltips
- LeadCard (badges)
- Página de Leads (`/leads`) — título, botões "Novo Lead" → "Novo Paciente"
- Conversas (botão "Criar lead" → "Criar paciente")

Outras telas continuam genéricas nesta entrega.

---

## Fase 3 — Rotina Inteligente Clínica

**Página `/rotina` ganha modo clínico** quando `isClinica = true`.

Em vez das missões genéricas de prospecção, gera 4 blocos a partir do banco:
- **Confirmar consultas de hoje** — leads na etapa "Agendamento Feito" com data = hoje
- **Resgatar no-show** — leads na etapa "Não Compareceu" últimos 7 dias
- **Reativar pacientes** — leads na etapa "Pós-Consulta" com `last_interaction_at > 30 dias`
- **Novos contatos** — leads novos do dia

**Arquivos:**
- `src/components/prospeccao/RotinaClinica.tsx` (novo) — substitui `RotinaInteligente` quando `isClinica`
- `src/hooks/useRotinaClinica.ts` (novo) — busca os 4 buckets via Supabase
- Edita `src/pages/RotinaInteligente.tsx` para escolher entre os dois componentes

---

## Fase 4 — BI Clínico

Nova página `/bi-clinico` (sidebar item visível só se `isClinica`).

**KPIs (calculados a partir do funil clínico):**
- Taxa de Agendamento = (leads em ≥ "Agendamento Feito") / (total leads)
- Show Rate = (leads em ≥ "Compareceu") / (leads em ≥ "Agendamento Feito")
- Taxa de Procedimento = (≥ "Procedimento Realizado") / (≥ "Compareceu")
- Ticket Médio = média `valor` de leads em "Procedimento Realizado"
- Taxa de Retorno = (em "Retorno/Recorrência") / (em "Procedimento Realizado")
- Recuperação de No-show = (que voltaram para "Agendamento Feito" depois de "Não Compareceu") / (total que entrou em "Não Compareceu")

**Alertas:** cards vermelhos quando Show Rate < 70%, No-show > 20%, Retorno < 30%.

**Funil visual:** componente de barras horizontais Pacientes → Agendados → Compareceram → Procedimentos.

**Arquivos:**
- `src/pages/BIClinico.tsx` (novo)
- `src/hooks/useBIClinico.ts` (novo) — todas as métricas em uma query agregada
- `src/components/bi-clinico/KPICard.tsx`, `FunilVisual.tsx`, `AlertasClinicos.tsx`
- `src/App.tsx` — rota `/bi-clinico`
- `src/components/layout/Sidebar.tsx` — item "BI Clínico" (ícone Stethoscope), gated por `isClinica`

---

## Banco de dados
**Não precisa de migração.** Tudo reaproveita o que já existe:
- `funis`, `etapas`, `leads` (já tem `last_interaction_at`, `last_movement_at`, `valor`, `etapa_id`)
- `follow_etapa_config` (já existe da fase Follow Inteligente)
- `enviar-whatsapp` (já existe)

## Fora de escopo (próxima fase, se quiser)
- Scripts SDR específicos por especialidade médica
- IA sugerindo ação por paciente
- Integração com agenda médica existente (`/agenda`) para gerar consultas direto do Kanban
- Maturidade clínica automática (A/B/C)

---

## Ordem de entrega
1. Helpers (`segmentos.ts` + `useCompanySegmento` + `clinicaLabels.ts`)
2. Fase 1 (funil + automações) — entrega valor sozinha
3. Fase 2 (linguagem) — visual rápido
4. Fase 3 (rotina) — depende do funil existir
5. Fase 4 (BI) — depende do funil existir

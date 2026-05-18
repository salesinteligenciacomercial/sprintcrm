
# Plano: Criar Tarefa direto da Agenda + Sync Google Tasks

Replicar o comportamento do Google Agenda: dentro do módulo Agenda, o usuário escolhe se quer criar um **Compromisso** (reunião com hora fim) ou uma **Tarefa** (to-do com data de entrega), podendo já vincular um contato/lead. Tarefas criadas aqui sincronizam nos dois sentidos com o Google Tasks.

## 1. UI — botão unificado "Criar ▾"

Trocar o atual botão "Novo Compromisso" por um `DropdownMenu` em 3 pontos:

- **Header da Agenda** (`src/pages/Agenda.tsx`, próximo ao `setNovoCompromissoOpen`)
- **Clique em slot vazio** do `AgendaDayView` / `AgendaWeekView` (passa a data/hora pré-selecionada)
- **Botão flutuante global** novo: `src/components/agenda/CriarFlutuanteButton.tsx`, exibido em todas as rotas exceto `/auth`, posicionado canto inferior direito (acima do FloatingDialerButton)

Opções do dropdown (estilo Google):
```
+ Criar ▾
  ├── 🗓  Compromisso  → abre Dialog atual de novo compromisso
  └── ✓  Tarefa        → abre TarefaModal com lead opcional
```

## 2. TarefaModal aceita contato/lead na criação rápida

Hoje `TarefaModal` já tem campo `lead_id`. Garantir que:
- Quando aberto pelo dropdown da Agenda, recebe prop `defaultDueDate` (do slot clicado) e `defaultLeadId` (opcional, via combobox de busca de leads igual ao do `NovoCompromissoDialog`)
- Salva via `criarTarefa()` → o trigger existente `upsertCompromissoParaTarefa` já cria sombra na Agenda
- **Marca `task.source = 'agenda_quick_create'`** para diferenciar visualmente

## 3. Distinção visual na grade da Agenda

Em `AgendaDayView` e `AgendaWeekView`, renderizar tarefas com:
- Ícone `CircleDashed` (estilo Google Tasks) no canto
- Borda esquerda azul claro (vs. verde do compromisso)
- Sem bloco de duração se a tarefa não tiver hora exata (apenas "all-day" no topo do dia)
- Click → abre `EditarTarefaDialog`, não `EditarCompromissoDialog`

Diferenciar pela coluna `compromissos.tipo_servico = 'tarefa'` (já usado pelo `upsertCompromissoParaTarefa`) ou pela presença de `referencia_id` apontando para `tasks`.

## 4. Sync Google Tasks (bidirecional)

Hoje `google-calendar-event` só sincroniza eventos. Adicionar:

**Backend — 3 novas Edge Functions:**

- `supabase/functions/google-tasks-push/index.ts` — recebe `{ action, task_id }`, busca task, chama Google Tasks API (`https://www.googleapis.com/tasks/v1/lists/@default/tasks`) usando o mesmo token OAuth (reaproveita `_shared/google-calendar.ts` `getValidAccessToken`). Persiste `google_task_id` em nova coluna.
- `supabase/functions/google-tasks-pull/index.ts` — invocada pelo `google-calendar-sync` existente, lê tarefas remotas e faz upsert em `tasks` (via `external_source = 'google_tasks'`).
- Estender escopo OAuth: adicionar `https://www.googleapis.com/auth/tasks` em `google-calendar-oauth-start`. **Requer reconexão** dos usuários que já estavam conectados (mostrar banner).

**Frontend:**
- `tarefaService.ts` chama `google-tasks-push` no create/update/delete quando o user tem integração ativa
- Hook `useGoogleCalendar` ganha flag `tasksScopeGranted`

## 5. Schema (1 migração)

```sql
ALTER TABLE tasks 
  ADD COLUMN google_task_id text,
  ADD COLUMN google_synced_at timestamptz,
  ADD COLUMN external_source text DEFAULT 'crm';

CREATE INDEX idx_tasks_google_task_id ON tasks(google_task_id);
```

Sem alteração em `compromissos` (já tem `referencia_id` + `tipo_servico = 'tarefa'`).

## 6. Benefícios entregues

| Hoje | Depois |
|---|---|
| Agenda só cria reunião; tarefa exige sair do módulo | Tudo do dia criado em 1 clique no contexto |
| Reunião e to-do parecem iguais visualmente | Ícone/cor distintos como no Google |
| Sync Google só de Calendar; Google Tasks fica fora | Tasks CRM ↔ Google Tasks bidirecional |
| Lead/contato amarrado é manual depois | Tarefa criada da Agenda já leva contato e cai no histórico do lead |
| Lembretes idênticos para tudo | Tarefa lembra na manhã do due_date; reunião lembra 10min antes |
| Vendedor precisa de 2 abas (Agenda + Tarefas) | Agenda vira tela única do dia |

## 7. Ordem de implementação

1. Migração schema (`tasks` + colunas Google)
2. Dropdown "Criar ▾" no header da Agenda + `TarefaModal` com `defaultDueDate`/`defaultLeadId`
3. Click em slot vazio passa data/hora pré-selecionada
4. Distinção visual tarefas vs. compromissos nas views Dia/Semana
5. Botão flutuante global
6. Extensão OAuth scope `tasks` + edge functions push/pull
7. Banner pedindo reconexão para users existentes

## Notas técnicas

- Reuso máximo: `TarefaModal`, `NovoCompromissoDialog`, `useGoogleCalendar`, `_shared/google-calendar.ts`, `upsertCompromissoParaTarefa` permanecem como base
- Google Tasks API usa o **mesmo token OAuth** do Calendar, só muda o scope — não precisa de novo connector
- Etapas 1-5 entregam valor sozinhas (UX completa interna); 6-7 adicionam o sync externo


## Funil dedicado de Follow-up (etapas customizáveis)

Cria um funil **separado e configurável** dentro da aba Follow-ups da Prospecção, ao lado da esteira de cadência atual. Cada empresa tem seu próprio funil com etapas que o usuário pode criar, renomear, reordenar e excluir — exatamente como um Kanban de vendas, mas dedicado a follow-up.

### Estrutura

```text
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│  A Iniciar  │ Tentando 1x │ Tentando 2x │  Negociando │  Fechado ✓  │
│   (default) │             │             │             │  (terminal) │
├─────────────┤             │             │             │             │
│  [card]     │  [card]     │             │  [card]     │             │
│  [card]     │             │             │             │             │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
                  ← drag-and-drop entre colunas →
```

- Cada empresa começa com um **funil default** + 5 etapas seed: `A Iniciar`, `Em contato`, `Negociando`, `Ganho`, `Perdido`. Tudo editável.
- Usuário pode **adicionar, renomear, mudar cor, reordenar e excluir** etapas.
- Cards arrastados entre colunas atualizam `stage_id`. Ao soltar em etapa terminal (`Ganho`/`Perdido`), o status do entry vira `completed`/`lost` automaticamente.
- A **cadência (F1→F5)** continua rodando em paralelo: `next_due_at` ainda calcula vencimento e o badge "vencido" continua aparecendo no card. As duas dimensões coexistem: tempo (cadência) + qualidade (funil).

### Mudanças técnicas

**Migration:**
- `follow_up_funnels` — `company_id`, `name`, `is_default`
- `follow_up_stages` — `funnel_id`, `name`, `color`, `order_index`, `is_terminal`, `terminal_status` (`completed`|`lost`|null)
- `follow_up_entries`: adicionar `stage_id uuid` (nullable, FK)
- Trigger `ensure_default_funnel()` cria funil + etapas seed na primeira inserção em `follow_up_entries` por empresa.
- RLS por `company_id` via `user_company_ids_array()`.

**Frontend (novos arquivos):**
- `src/hooks/useFollowUpFunnel.ts` — CRUD funil/etapas + mutation `moveEntryToStage`.
- `src/components/prospeccao/followup/FunilFollowUp.tsx` — board Kanban com `@dnd-kit` (já no projeto), drag horizontal entre colunas.
- `src/components/prospeccao/followup/StageManagerDialog.tsx` — gerenciar etapas (add/edit/cor/ordem/excluir).

**Página `Prospeccao.tsx` — aba Follow-up:**
```text
[ Esteira de Cadência (atual, F1→F5 por tempo) ]
[ Funil de Follow-up (novo, etapas customizáveis) ]   ← novo bloco
[ Histórico/Relatório (atual) ]
```

Botão **"Gerenciar etapas"** no header do funil abre o dialog de configuração.

### Fora do escopo desta entrega
- Múltiplos funis por empresa (entrega só o default).
- Automação de movimento por outcome (continua manual via drag).
- Métricas de conversão por etapa (próxima rodada).
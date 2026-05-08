# Performance OS — Reforma do módulo Prospecção

Objetivo: sair do "painel administrativo" e virar **central de performance comercial** com foco diário, pressão saudável e dopamina (streak, badges, evolução).

Visível para todos os usuários do módulo. Metas vêm de `commercial_goals` com fallback derivado do Diagnóstico 360 (meta de faturamento ÷ ticket médio ÷ dias úteis).

---

## Onda 1 — Topo de Foco (Meta do Dia + Card de Perda) ⚡ ESTA RODADA

Bloco fixo no topo de `/prospeccao`, acima das abas, substituindo a poluição atual.

**Layout (3 colunas em desktop, stack no mobile):**

```text
┌──────────────────────────┬──────────────────────┬─────────────────────┐
│ 🔥 META DO DIA           │ ⚠️ PERDA ESTIMADA    │ 🏆 SUA POSIÇÃO HOJE │
│  • 100 prospecções 78%   │  Você executou 32%   │  #2 de 5            │
│  • 20 respostas    40%   │  da rotina hoje.     │  ▲ subindo          │
│  • 5 reuniões      60%   │  Receita não gerada: │  Faltam 2 reuniões  │
│  • 1 venda         0%    │  R$ 1.280            │  para virar TOP 1   │
│  ███████░░░ 45%          │  [Recuperar agora →] │                     │
└──────────────────────────┴──────────────────────┴─────────────────────┘
```

**Lógica:**
- **Meta do Dia**: lê `commercial_goals` (period=daily, scope=user). Se vazio → deriva do Diagnóstico (`prospeccoes_dia_ideal`, `taxa_conversao`, `ticket_medio`). Progresso vem de `prospecting_logs`/`interactions`/`leads` do dia.
- **Perda Estimada**: `(metaProspecções − executadas) × taxaConversão × ticketMédio`. Sempre destacado em vermelho/amber.
- **Posição**: reusa `useLeaderboard` (já existe).

**Componente novo:** `src/components/prospeccao/foco/TopoFoco.tsx` + hook `useDailyFocus.ts`.

---

## Onda 2 — Arena Premium + Streak + Badges

Repaginar a aba "Ranking/Performance Hub":

- **Pódio premium**: avatares grandes, glow no #1, contador de streak (🔥 7 dias), barra XP por player.
- **Streak system**: tabela `prospecting_streaks` (user_id, current_streak, longest_streak, last_active_date). Trigger atualiza ao registrar atividade do dia.
- **Badges desbloqueáveis** com animação `scale-in` + confete quando ganha (ex: "Maratonista — 7 dias seguidos batendo meta", "Sniper — 5 reuniões em 1 dia").
- Animação ao bater meta diária: toast premium + som opcional (já existe `soundOn`).

---

## Onda 3 — Hierarquia Visual Geral

- Reduzir peso visual das abas secundárias (cor mais discreta).
- Espaçamento maior entre blocos, separadores sutis.
- Cards de KPI com tipografia em escala (número grande + rótulo pequeno).
- Mover `ArenaTopBar`, `KillFeed` e `PlayerHeaderCard` para uma **drawer lateral colapsável** ("Modo Arena") em vez de empilhar tudo no topo.
- Mobile: topo de foco vira carrossel swipeable.

---

## Onda 4 — Execução / Pressão Inteligente

- Alertas contextuais no topo: *"Faltam 40 prospecções para meta do dia"*, *"Você está 2h sem registrar atividade"*.
- Notificação às 14h se < 50% da meta diária.
- Card "Próxima Ação" com CTA único (call-to-action) baseado no gap maior.
- Recompensa diária ao bater 100%: moedas + animação 🎉.

---

## Detalhes técnicos

**Arquivos a criar (Onda 1):**
- `src/hooks/useDailyFocus.ts` — agrega meta + execução + perda.
- `src/components/prospeccao/foco/TopoFoco.tsx` — bloco de 3 colunas.
- `src/components/prospeccao/foco/MetaDoDiaCard.tsx`
- `src/components/prospeccao/foco/PerdaEstimadaCard.tsx`
- `src/components/prospeccao/foco/PosicaoHojeCard.tsx`

**Arquivos a editar (Onda 1):**
- `src/pages/Prospeccao.tsx` — inserir `<TopoFoco />` logo após `QuickActionCards` e ocultar `GoalProgressHUD` redundante.

**Sem migrações nesta onda.** Migrações entram na Onda 2 (`prospecting_streaks`, `user_badges`).

**Tokens de design:** uso semântico de `--primary` (verde Waze), `--destructive` para perda, `--muted-foreground` para labels. Nada de cores hardcoded.

---

## O que faço agora

Executo **Onda 1 completa** nesta rodada (Topo de Foco). É a entrega de maior impacto psicológico e desbloqueia visualmente o resto. Confirmo quando estiver no preview e seguimos para Onda 2 na próxima mensagem.
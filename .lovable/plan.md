## Objetivo

Reorganizar a sidebar (`src/components/layout/Sidebar.tsx`) para refletir os dois "produtos" comerciais da empresa:

1. **CRM Padrão** — módulos operacionais que qualquer cliente do CRM tem.
2. **Estruturação Comercial (GROW Sales Intelligence)** — módulos da metodologia própria, liberados apenas para quem contrata o pacote de estruturação.

Cada grupo vira um item colapsável (estilo "Consórcio" da imagem enviada): um cabeçalho com ícone + nome + chevron, e os submódulos aparecem indentados abaixo quando expandido.

## Agrupamento proposto

**CRM Padrão**

- Relatórios
- Contatos
- Funil de Vendas
- Bate-Papo
- Agenda
- Tarefas
- Fluxos e Automação

**Estruturação Comercial (GROW)**

- Discador
- Processos Comerciais
- Prospecção
- Maturidade
- Mentoria  
Treinamento  
Financeiro (master only) quero transforma ele em um BI

**Itens fora dos grupos (ficam soltos no topo ou rodapé, como hoje)**

- Jurídico (segmento-específico)
- Configurações

> Confirmar com o usuário se Treinamento e Jurídico entram em algum grupo ou ficam soltos.

## Comportamento dos grupos

- Cabeçalho do grupo: ícone (`ShoppingCart`/`Rocket` para Estruturação, `LayoutDashboard` para CRM), título, chevron `ChevronDown`/`ChevronRight`.
- Estado de expansão controlado por `useState` local, com persistência simples em `localStorage` (`sidebar:group:<key>`) para lembrar entre sessões.
- Por padrão: ambos os grupos abertos no primeiro acesso. Quando a rota atual pertence a um grupo, esse grupo abre automaticamente.
- Submódulos: mantém visual atual (ícone + nome + badges de notificação), com `pl-8` para indentar.
- Quando a sidebar está colapsada (`w-20`): grupos viram apenas ícones; ao passar o mouse, abre um popover lateral com os subitens (aproveita o `Tooltip`/`Popover` já presente).

## Gating de acesso (lógica de billing)

A separação visual reflete o gating, mas a permissão real continua vindo de `useModuleAccess`/`usePermissions`. O grupo "Estruturação Comercial" deve:

- Esconder o cabeçalho inteiro se a empresa **não** tem nenhum módulo do grupo liberado e **não** é master.
- Mostrar cadeado nos submódulos individuais que estão bloqueados (mantém comportamento atual de `isLocked`).
- Master account vê tudo.

O grupo "CRM Padrão" sempre aparece — é a base do produto.

## Detalhes técnicos

Refatorar `navigation` para uma estrutura agrupada:

```ts
type NavItem = { name; href; icon; menuKey; ...flags };
type NavGroup = { key: string; label: string; icon; items: NavItem[]; gating?: 'crm'|'grow' };
type NavEntry = NavItem | NavGroup;
```

Renderização:

- `isGroup(entry)` → componente `<SidebarGroup>` que controla expand/collapse e mapeia `items` usando o mesmo bloco de render atual (extraído em um `<SidebarItem>` para evitar duplicação).
- Filtro de visibilidade roda **por item** primeiro; se grupo ficar vazio, o cabeçalho não é renderizado.
- Badge agregada opcional no cabeçalho do grupo (soma de `conversasUnread + agendaToday + tarefasAlert + aiInsightsCount` para o CRM) — sugiro deixar para um polish posterior.

Arquivos afetados:

- `src/components/layout/Sidebar.tsx` — refator principal.
- (opcional) extrair `SidebarItem.tsx` e `SidebarGroup.tsx` em `src/components/layout/` para reduzir o tamanho do Sidebar.

Sem mudanças em rotas, hooks de permissão, banco de dados ou backend — é apenas reorganização visual + agrupamento lógico.

## Pontos para confirmar antes de implementar

1. O agrupamento acima está correto (especialmente Treinamento e Jurídico)?
2. Quer que o grupo "Estruturação Comercial" suma totalmente quando a empresa não contratou, ou prefere mostrar bloqueado com cadeado para fins de upsell?
3. Quer badge agregada no cabeçalho do grupo CRM (somando notificações dos filhos)?
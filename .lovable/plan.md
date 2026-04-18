
O usuário está perguntando o que podemos adicionar para melhorar a página de captura. Não é uma tarefa de implementação ainda — é uma consulta de ideias/sugestões. Vou apresentar um plano com melhorias categorizadas e priorizadas, baseando-me no que já existe no `CapturaPublica.tsx`.

## Análise da página atual

A página de captura hoje tem: header com logo/telefone, hero com CTA, grid de serviços, chat IA conversacional, e footer com contatos. É funcional mas básica. Pode ganhar muito em conversão, prova social, personalização e analytics.

## Melhorias propostas (organizadas por impacto)

### 🚀 Conversão (alto impacto)
1. **Pop-up de saída (exit intent)** — detecta quando o usuário vai fechar a aba e oferece um cupom/contato rápido.
2. **Botão flutuante de WhatsApp** — fixo no canto, abre conversa direta no WhatsApp Web.
3. **Barra de urgência/promoção** topo — "Oferta válida até hoje" com countdown.
4. **Formulário rápido alternativo** — para quem não quer conversar com IA, um form clássico nome+telefone+mensagem.
5. **CTAs múltiplos na hero** — "Falar agora" + "Ver serviços" + "Solicitar orçamento".

### 🌟 Prova social (média-alta)
6. **Seção de depoimentos/avaliações** — cards com foto, nome, estrela e texto (configurável).
7. **Logos de clientes/parceiros** — faixa "Empresas que confiam em nós".
8. **Contador de leads atendidos** — "+1.200 clientes atendidos" animado.
9. **Selo de avaliação Google** — score + número de reviews.

### 💡 Conteúdo (média)
10. **Seção FAQ** — perguntas frequentes em accordion (também alimenta a IA).
11. **Galeria de antes/depois** ou portfólio expandido com lightbox.
12. **Vídeo institucional/hero** — background ou embed do YouTube.
13. **Seção "Como funciona"** — 3-4 passos ilustrados do processo.
14. **Blog/artigos recentes** — últimos 3 posts com link.

### 🎯 Personalização & SEO (média)
15. **Meta tags dinâmicas** (Open Graph) — título, descrição, imagem para WhatsApp/Facebook share.
16. **Favicon dinâmico** — usa o logo da empresa.
17. **Tema claro/escuro** ou seletor de idioma (PT/EN/ES).
18. **Schema.org LocalBusiness** — SEO local para Google Maps.
19. **Pixel do Facebook + Google Analytics** já configuráveis por subconta.

### 📊 Captura inteligente (alto)
20. **Captura UTM completa** — salvar utm_source, medium, campaign, content, term no lead.
21. **Geolocalização** — detectar cidade/estado para personalizar saudação.
22. **Captura de IP + dispositivo** para enriquecer o lead.
23. **Multi-step form** — perguntas em etapas com barra de progresso (maior taxa de conclusão).

### 🤖 Chat IA (média)
24. **Sugestões de mensagens rápidas** — botões "Quero um orçamento", "Quais serviços?", "Horário de atendimento".
25. **Indicador "digitando..." mais realista** com nome/foto do atendente virtual.
26. **Envio de áudio** pelo visitante.
27. **Anexar arquivo/imagem** na conversa.
28. **Histórico persistente** via localStorage (volta a conversa se o visitante recarregar).

### 🎨 Visual & UX (baixo-médio)
29. **Animações on-scroll** (fade/slide) com Intersection Observer.
30. **Modo mobile otimizado** com chat em tela cheia.
31. **Loading skeleton** no lugar do spinner.
32. **Banner de cookies/LGPD** com aceite.

### 📍 Localização (segmento dependente)
33. **Mapa do Google Maps** embutido no footer.
34. **Horário de funcionamento** com indicador "Aberto agora / Fechado".
35. **Botão "Como chegar"** que abre rota no Waze/Maps.

## Recomendação (top 5 para começar)

Se o usuário quiser começar pelo que dá mais retorno com menor esforço:

1. **Botão flutuante de WhatsApp** + **barra de urgência**
2. **Seção de depoimentos** configurável no painel
3. **FAQ em accordion**
4. **Captura UTM completa + meta tags Open Graph**
5. **Sugestões de mensagens rápidas no chat**

## Próximo passo

Pergunto ao usuário quais dessas melhorias ele quer priorizar para eu já implementar na próxima rodada. Vou usar `ask_questions` para deixar ele escolher de forma objetiva.

---

**Sugestões para melhorar a Página de Captura**

A página atual já tem chat IA, hero, serviços e footer — mas pode evoluir muito em **conversão, prova social e personalização**. Aqui vão as melhorias mais impactantes:

### 🚀 Conversão
- **Botão flutuante de WhatsApp** sempre visível
- **Pop-up de saída** (exit intent) com oferta
- **Barra de urgência** no topo (countdown / promoção)
- **Formulário rápido** alternativo ao chat (nome + telefone + mensagem)
- **Multi-step form** com barra de progresso

### 🌟 Prova social
- **Depoimentos** em cards (foto, nome, estrelas, texto)
- **Logos de clientes/parceiros**
- **Contador animado** de "+X clientes atendidos"
- **Selo de avaliação Google** (score + reviews)

### 💡 Conteúdo
- **FAQ em accordion** (também alimenta a IA)
- **Galeria portfólio** com lightbox
- **Vídeo institucional** no hero
- **Seção "Como funciona"** com passos ilustrados

### 📊 Captura inteligente
- **UTM tracking completo** (source, medium, campaign, content, term)
- **Geolocalização** para personalizar a saudação
- **Pixel do Facebook + Google Analytics** configuráveis por subconta
- **Open Graph tags** dinâmicas (preview bonito ao compartilhar no WhatsApp)

### 🤖 Chat IA
- **Botões de mensagens rápidas** ("Quero orçamento", "Horários", "Serviços")
- **Anexar arquivo/imagem/áudio** na conversa
- **Histórico persistente** (localStorage) — visitante volta de onde parou
- **Avatar + nome do atendente virtual** com indicador "digitando..."

### 📍 Local
- **Google Maps** embutido
- **Horário de funcionamento** com badge "Aberto agora"
- **Botão "Como chegar"** (Waze/Google Maps)

### 🎨 UX
- **Animações on-scroll** suaves
- **Banner LGPD** com aceite de cookies
- **Tema claro/escuro**

---

### 🎯 Top 5 recomendados para começar (maior ROI)

1. **Botão flutuante WhatsApp** + **barra de urgência** no topo
2. **Seção de depoimentos** configurável
3. **FAQ em accordion** (alimenta a IA)
4. **UTM tracking + Open Graph tags** dinâmicas
5. **Sugestões de mensagens rápidas** no chat

Me diz quais dessas você quer que eu já implemente na próxima rodada e eu coloco tudo junto no painel de configuração da página de captura.

<lov-actions>
<lov-suggestion message="Implemente o pacote Top 5: botão flutuante de WhatsApp, barra de urgência, seção de depoimentos, FAQ em accordion, UTM tracking + Open Graph tags e sugestões de mensagens rápidas no chat — todos configuráveis no painel da página de captura.">Implementar o Top 5 recomendado</lov-suggestion>
<lov-suggestion message="Adicione apenas o botão flutuante de WhatsApp e a barra de urgência (countdown/promoção) na página de captura, configuráveis no painel.">Só conversão (WhatsApp + urgência)</lov-suggestion>
<lov-suggestion message="Adicione seção de depoimentos com cards (foto, nome, estrelas, texto), logos de parceiros e FAQ em accordion na página de captura, todos configuráveis no painel.">Só prova social + FAQ</lov-suggestion>
<lov-suggestion message="Adicione captura completa de UTM (source, medium, campaign, content, term), geolocalização do visitante, Open Graph tags dinâmicas e suporte a Pixel do Facebook + Google Analytics configuráveis por subconta.">Só tracking e analytics</lov-suggestion>
<lov-suggestion message="Melhore o chat da página de captura: botões de mensagens rápidas, anexar arquivos/imagens/áudio, histórico persistente via localStorage e avatar com nome do atendente virtual.">Só melhorias no chat IA</lov-suggestion>
</lov-actions><lov-plan>

**Sugestões para melhorar a Página de Captura**

A página atual já tem chat IA, hero, serviços e footer. Pode evoluir muito em **conversão, prova social, personalização e analytics**.

### 🚀 Conversão
- **Botão flutuante de WhatsApp** sempre visível
- **Pop-up de saída** (exit intent) com oferta
- **Barra de urgência** no topo (countdown/promoção)
- **Formulário rápido** alternativo ao chat (nome + telefone + mensagem)
- **Multi-step form** com barra de progresso

### 🌟 Prova social
- **Depoimentos** em cards (foto, nome, estrelas, texto)
- **Logos de clientes/parceiros**
- **Contador animado** de "+X clientes atendidos"
- **Selo de avaliação Google** (score + reviews)

### 💡 Conteúdo
- **FAQ em accordion** (também alimenta a IA)
- **Galeria portfólio** com lightbox
- **Vídeo institucional** no hero (YouTube embed ou background)
- **Seção "Como funciona"** com passos ilustrados

### 📊 Captura inteligente
- **UTM tracking completo** (source, medium, campaign, content, term)
- **Geolocalização** para personalizar a saudação ("Olá, visitante de SP!")
- **Pixel do Facebook + Google Analytics** configuráveis por subconta
- **Open Graph tags** dinâmicas (preview bonito ao compartilhar no WhatsApp)
- **Schema.org LocalBusiness** para SEO local

### 🤖 Chat IA
- **Botões de mensagens rápidas** ("Quero orçamento", "Horários", "Serviços")
- **Anexar arquivo/imagem/áudio** na conversa
- **Histórico persistente** (localStorage) — visitante volta de onde parou
- **Avatar + nome do atendente virtual** com indicador "digitando..."

### 📍 Local
- **Google Maps** embutido
- **Horário de funcionamento** com badge "Aberto agora / Fechado"
- **Botão "Como chegar"** (Waze/Google Maps)

### 🎨 UX
- **Animações on-scroll** suaves
- **Banner LGPD** com aceite de cookies
- **Tema claro/escuro**
- **Loading skeleton** no lugar do spinner

---

### 🎯 Top 5 recomendados para começar (maior ROI)

1. **Botão flutuante WhatsApp** + **barra de urgência** no topo
2. **Seção de depoimentos** configurável
3. **FAQ em accordion** (alimenta a IA)
4. **UTM tracking completo + Open Graph tags** dinâmicas
5. **Sugestões de mensagens rápidas** no chat IA

Tudo isso seria configurável no painel **IA → Página de Captura**, sem precisar mexer no código por subconta.

Me diz quais dessas você quer que eu já implemente na próxima rodada.


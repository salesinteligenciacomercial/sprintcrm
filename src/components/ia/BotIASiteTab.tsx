import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Bot, Sparkles, Plus, Trash2, MessageCircle, Brain, Target, Clock, Zap } from "lucide-react";

export interface BotIASiteConfig {
  ativo?: boolean;
  nome_bot?: string;
  avatar_url?: string;
  saudacao?: string;
  mensagem_offline?: string;
  tom_de_voz?: 'formal' | 'amigavel' | 'consultivo' | 'descontraido' | 'empatico';
  persona?: string; // descrição livre da persona
  modelo?: string;
  criatividade?: number; // 0-100 → temperature
  base_conhecimento?: string; // texto livre com infos da empresa
  perguntas_extras?: Array<{ pergunta: string; obrigatoria?: boolean }>;
  sugestoes_iniciais?: string[];
  score_minimo_qualificado?: number;
  acao_lead_quente?: 'criar_lead' | 'criar_e_transferir' | 'criar_notificar' | 'criar_whatsapp';
  notificar_vendedor_id?: string;
  tags_automaticas?: string[];
  horario_funcionamento?: {
    ativo?: boolean;
    inicio?: string; // "08:00"
    fim?: string;    // "18:00"
    dias?: number[]; // 0-6 (Dom-Sáb)
  };
  bloquear_topicos?: string[];
  permitir_agendamento?: boolean;
  permitir_transferencia_humana?: boolean;
  delay_resposta_ms?: number; // delay para parecer humano
  limite_mensagens?: number; // anti-spam
}

interface Props {
  config: BotIASiteConfig;
  onChange: (next: BotIASiteConfig) => void;
  segmento?: string | null;
}

const TONS = [
  { value: 'amigavel', label: '😊 Amigável', desc: 'Próximo, caloroso, usa "você"' },
  { value: 'consultivo', label: '🎯 Consultivo', desc: 'Especialista que orienta' },
  { value: 'formal', label: '🤵 Formal', desc: 'Profissional e respeitoso' },
  { value: 'descontraido', label: '✨ Descontraído', desc: 'Leve, com emojis' },
  { value: 'empatico', label: '💚 Empático', desc: 'Acolhedor (saúde, jurídico)' },
] as const;

const MODELOS = [
  { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash (Rápido • Padrão)' },
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Equilibrado)' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Máxima inteligência)' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini (Premium econômico)' },
  { value: 'openai/gpt-5', label: 'GPT-5 (Top de linha)' },
];

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function BotIASiteTab({ config, onChange, segmento }: Props) {
  const c = config || {};
  const set = (patch: Partial<BotIASiteConfig>) => onChange({ ...c, ...patch });
  const horario = c.horario_funcionamento || {};

  return (
    <div className="space-y-4">
      {/* HEADER ATIVAÇÃO */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2">
                  Bot IA do Site
                  <Badge variant="secondary" className="text-[10px]">Independente do CRM</Badge>
                </h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  Assistente conversacional inteligente que atende visitantes 24/7, qualifica leads de forma humanizada
                  e transfere para o time comercial apenas quem está pronto. Não segue formulários — conversa de verdade.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">{c.ativo ? 'Ativo' : 'Inativo'}</span>
              <Switch checked={!!c.ativo} onCheckedChange={(v) => set({ ativo: v })} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* IDENTIDADE */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Identidade do Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Nome do bot</Label>
              <Input
                placeholder="Ex: Sofia, Léo, Ana..."
                value={c.nome_bot || ''}
                onChange={(e) => set({ nome_bot: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">Aparece no chat. Use um nome humano.</p>
            </div>
            <div>
              <Label>URL do avatar (opcional)</Label>
              <Input
                placeholder="https://..."
                value={c.avatar_url || ''}
                onChange={(e) => set({ avatar_url: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Tom de voz</Label>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 mt-2">
              {TONS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set({ tom_de_voz: t.value })}
                  className={`p-3 rounded-lg border text-left transition hover:border-primary ${
                    c.tom_de_voz === t.value ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Persona (descrição livre)</Label>
            <Textarea
              rows={3}
              placeholder="Ex: Você é a Sofia, recepcionista virtual da Clínica X. Tem 5 anos de experiência, é calorosa e gosta de tranquilizar pacientes ansiosos. Sempre confirma se a pessoa entendeu antes de seguir."
              value={c.persona || ''}
              onChange={(e) => set({ persona: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Detalhe a personalidade. Quanto mais específico, mais humano fica.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* INTELIGÊNCIA */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-4 h-4" /> Inteligência & Conhecimento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Modelo de IA</Label>
              <Select value={c.modelo || 'google/gemini-3-flash-preview'} onValueChange={(v) => set({ modelo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODELOS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Criatividade ({c.criatividade ?? 70}%)</Label>
              <Slider
                value={[c.criatividade ?? 70]}
                onValueChange={([v]) => set({ criatividade: v })}
                max={100}
                step={5}
                className="mt-3"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Baixo = preciso e factual. Alto = mais natural e variado.
              </p>
            </div>
          </div>

          <div>
            <Label>Base de conhecimento personalizada</Label>
            <Textarea
              rows={6}
              placeholder={`Cole tudo que o bot precisa saber:\n\n• Diferenciais da empresa\n• Serviços/produtos detalhados\n• Faixas de preço (se compartilhar)\n• Casos de sucesso\n• Política de atendimento\n• O que NÃO falar`}
              value={c.base_conhecimento || ''}
              onChange={(e) => set({ base_conhecimento: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Essa base é injetada no prompt. Use livremente — não precisa ser estruturado.
            </p>
          </div>

          <div>
            <Label>Tópicos proibidos (separados por vírgula)</Label>
            <Input
              placeholder="Ex: política, preços de concorrentes, diagnósticos médicos"
              value={(c.bloquear_topicos || []).join(', ')}
              onChange={(e) => set({ bloquear_topicos: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            />
          </div>
        </CardContent>
      </Card>

      {/* MENSAGENS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="w-4 h-4" /> Mensagens & Sugestões
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Saudação inicial</Label>
            <Textarea
              rows={2}
              placeholder="Ex: Olá! 👋 Sou a Sofia. Em que posso te ajudar hoje?"
              value={c.saudacao || ''}
              onChange={(e) => set({ saudacao: e.target.value })}
            />
          </div>

          <div>
            <Label>Mensagem fora do horário</Label>
            <Textarea
              rows={2}
              placeholder="Ex: Oi! Nosso atendimento está fora do expediente. Deixe seu contato que retornamos em breve!"
              value={c.mensagem_offline || ''}
              onChange={(e) => set({ mensagem_offline: e.target.value })}
            />
          </div>

          <div>
            <Label>Sugestões iniciais (botões clicáveis no chat)</Label>
            <div className="space-y-2 mt-2">
              {(c.sugestoes_iniciais || []).map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={s}
                    onChange={(e) => {
                      const next = [...(c.sugestoes_iniciais || [])];
                      next[i] = e.target.value;
                      set({ sugestoes_iniciais: next });
                    }}
                  />
                  <Button variant="ghost" size="icon" onClick={() => {
                    set({ sugestoes_iniciais: (c.sugestoes_iniciais || []).filter((_, idx) => idx !== i) });
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => {
                set({ sugestoes_iniciais: [...(c.sugestoes_iniciais || []), ''] });
              }}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar sugestão
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QUALIFICAÇÃO */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4" /> Qualificação Inteligente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {segmento && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs">
              <strong>Segmento detectado:</strong> {segmento} — perguntas-base já configuradas automaticamente.
              Use o campo abaixo para adicionar perguntas específicas do seu negócio.
            </div>
          )}

          <div>
            <Label>Perguntas extras de qualificação</Label>
            <p className="text-xs text-muted-foreground mb-2">
              O bot encaixa essas perguntas naturalmente na conversa (não em sequência rígida).
            </p>
            <div className="space-y-2">
              {(c.perguntas_extras || []).map((p, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    placeholder="Ex: Qual o tamanho da empresa?"
                    value={p.pergunta}
                    onChange={(e) => {
                      const next = [...(c.perguntas_extras || [])];
                      next[i] = { ...next[i], pergunta: e.target.value };
                      set({ perguntas_extras: next });
                    }}
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Switch
                      checked={!!p.obrigatoria}
                      onCheckedChange={(v) => {
                        const next = [...(c.perguntas_extras || [])];
                        next[i] = { ...next[i], obrigatoria: v };
                        set({ perguntas_extras: next });
                      }}
                    />
                    <span className="text-xs text-muted-foreground">Obrigatória</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => {
                    set({ perguntas_extras: (c.perguntas_extras || []).filter((_, idx) => idx !== i) });
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => {
                set({ perguntas_extras: [...(c.perguntas_extras || []), { pergunta: '', obrigatoria: false }] });
              }}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar pergunta
              </Button>
            </div>
          </div>

          <div>
            <Label>Score mínimo para considerar lead qualificado ({c.score_minimo_qualificado ?? 60})</Label>
            <Slider
              value={[c.score_minimo_qualificado ?? 60]}
              onValueChange={([v]) => set({ score_minimo_qualificado: v })}
              max={100}
              step={5}
              className="mt-3"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>Mais leads (frio também passa)</span>
              <span>Mais rigoroso (só quente)</span>
            </div>
          </div>

          <div>
            <Label>Ação ao detectar lead quente</Label>
            <Select
              value={c.acao_lead_quente || 'criar_lead'}
              onValueChange={(v: any) => set({ acao_lead_quente: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="criar_lead">Criar lead no CRM com tag</SelectItem>
                <SelectItem value="criar_e_transferir">Criar lead + transferir para atendimento humano</SelectItem>
                <SelectItem value="criar_notificar">Criar lead + notificar vendedor</SelectItem>
                <SelectItem value="criar_whatsapp">Criar lead + enviar WhatsApp automático</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tags automáticas (separadas por vírgula)</Label>
            <Input
              placeholder="Ex: site, bot-ia, lead-quente"
              value={(c.tags_automaticas || []).join(', ')}
              onChange={(e) => set({ tags_automaticas: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            />
          </div>
        </CardContent>
      </Card>

      {/* COMPORTAMENTO */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4" /> Comportamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Permitir agendamento direto</Label>
              <p className="text-xs text-muted-foreground">Bot consulta agenda e marca consulta/reunião</p>
            </div>
            <Switch
              checked={c.permitir_agendamento !== false}
              onCheckedChange={(v) => set({ permitir_agendamento: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Permitir transferência para humano</Label>
              <p className="text-xs text-muted-foreground">Quando lead pedir ou estiver qualificado</p>
            </div>
            <Switch
              checked={c.permitir_transferencia_humana !== false}
              onCheckedChange={(v) => set({ permitir_transferencia_humana: v })}
            />
          </div>

          <div>
            <Label>Delay humanizado de resposta ({c.delay_resposta_ms ?? 800}ms)</Label>
            <Slider
              value={[c.delay_resposta_ms ?? 800]}
              onValueChange={([v]) => set({ delay_resposta_ms: v })}
              min={0}
              max={3000}
              step={100}
              className="mt-3"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Simula tempo de digitação. 0 = instantâneo (parece bot). 800-1500ms = humano.
            </p>
          </div>

          <div>
            <Label>Limite de mensagens por sessão</Label>
            <Input
              type="number"
              placeholder="50"
              value={c.limite_mensagens || ''}
              onChange={(e) => set({ limite_mensagens: parseInt(e.target.value) || undefined })}
            />
            <p className="text-xs text-muted-foreground mt-1">Anti-spam. Deixe vazio para ilimitado.</p>
          </div>
        </CardContent>
      </Card>

      {/* HORÁRIO */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" /> Horário de Funcionamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Restringir horário</Label>
              <p className="text-xs text-muted-foreground">Fora do horário, bot apenas captura contato</p>
            </div>
            <Switch
              checked={!!horario.ativo}
              onCheckedChange={(v) => set({ horario_funcionamento: { ...horario, ativo: v } })}
            />
          </div>

          {horario.ativo && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Início</Label>
                  <Input
                    type="time"
                    value={horario.inicio || '08:00'}
                    onChange={(e) => set({ horario_funcionamento: { ...horario, inicio: e.target.value } })}
                  />
                </div>
                <div>
                  <Label>Fim</Label>
                  <Input
                    type="time"
                    value={horario.fim || '18:00'}
                    onChange={(e) => set({ horario_funcionamento: { ...horario, fim: e.target.value } })}
                  />
                </div>
              </div>

              <div>
                <Label>Dias ativos</Label>
                <div className="flex gap-1.5 mt-2">
                  {DIAS.map((d, i) => {
                    const ativo = (horario.dias || [1, 2, 3, 4, 5]).includes(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          const cur = horario.dias || [1, 2, 3, 4, 5];
                          const next = ativo ? cur.filter(x => x !== i) : [...cur, i].sort();
                          set({ horario_funcionamento: { ...horario, dias: next } });
                        }}
                        className={`w-10 h-10 rounded-md border text-xs font-medium transition ${
                          ativo ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

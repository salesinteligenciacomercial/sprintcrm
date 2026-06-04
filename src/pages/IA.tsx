// 🔒 LOCKED — Visual oficial do módulo Automação & IA (GROW OS).
// Layout: sidebar lateral + painéis. NÃO regredir para versões anteriores.
// Toda a lógica de backend (useAIAgents, handleAgentToggle, aiEnabled, companyId)
// é mantida intacta. Cada painel renderiza um componente já existente.
import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Bot, BookOpen, GraduationCap, Workflow, Activity, Send, Megaphone,
  Globe, Layout, Plug, Calendar, Sparkles, AlertTriangle, BarChart3,
  FileText, DollarSign, ShieldCheck, Settings, Plus, ExternalLink, ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { supabase } from "@/integrations/supabase/client";
import { useAIAgents } from "@/hooks/useAIAgents";
import { usePermissions } from "@/hooks/usePermissions";

import { IAAgentCard } from "@/components/ia/IAAgentCard";
import { BaseConhecimentoIA } from "@/components/ia/BaseConhecimentoIA";
import { N8nIntegration } from "@/components/ia/N8nIntegration";
import { CapturePageConfig } from "@/components/ia/CapturePageConfig";
import { SiteInstitucionalConfig } from "@/components/ia/SiteInstitucionalConfig";
import { FluxoAutomacaoBuilder } from "@/components/fluxos/FluxoAutomacaoBuilder";
import { DisparoEmMassa } from "@/components/campanhas/DisparoEmMassa";
import { CampanhasDashboard } from "@/components/campanhas/CampanhasDashboard";
import { WhatsAppDashboard } from "@/components/whatsapp/WhatsAppDashboard";
import { WhatsAppTemplatesManager } from "@/components/whatsapp/WhatsAppTemplatesManager";
import AutomacaoDiagnostico from "@/pages/AutomacaoDiagnostico";

type TabId =
  | "agentes" | "base" | "treinamento"
  | "fluxos" | "diagnostico"
  | "campanhas" | "disparo"
  | "captura" | "site"
  | "n8n";

type NavItem = { id: TabId; label: string; icon: any; badge?: string };
type NavGroup = { title: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    title: "IA & Agentes",
    items: [
      { id: "agentes", label: "Agentes de IA", icon: Bot },
      { id: "base", label: "Base de Conhecimento", icon: BookOpen },
      { id: "treinamento", label: "Treinamento", icon: GraduationCap },
    ],
  },
  {
    title: "Automação",
    items: [
      { id: "fluxos", label: "Fluxos", icon: Workflow },
      { id: "diagnostico", label: "Diagnóstico URA", icon: Activity },
    ],
  },
  {
    title: "Canais",
    items: [
      { id: "campanhas", label: "Campanhas", icon: Megaphone, badge: "WA Meta" },
      { id: "disparo", label: "Disparo em Massa", icon: Send },
    ],
  },
  {
    title: "Presença Digital",
    items: [
      { id: "captura", label: "Página de Captura", icon: Globe },
      { id: "site", label: "Site Institucional", icon: Layout },
    ],
  },
  {
    title: "Integrações",
    items: [
      { id: "n8n", label: "n8n / Webhooks", icon: Plug },
    ],
  },
];

export default function IA() {
  const { canAccess, isAdmin, loading: permissionsLoading } = usePermissions();
  const { getAgentConfigs, updateAgentConfig } = useAIAgents();

  const [activeTab, setActiveTab] = useState<TabId>("agentes");
  const [agentStates, setAgentStates] = useState<{ atendimento: boolean; agendamento: boolean; vendedor?: boolean }>({
    atendimento: false, agendamento: false, vendedor: false,
  });
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [loadingAiPermission, setLoadingAiPermission] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userRoleData } = await supabase
        .from("user_roles")
        .select("role, company_id")
        .eq("user_id", user.id)
        .single();
      const isUserSuperAdmin = userRoleData?.role === "super_admin";
      if (isUserSuperAdmin) {
        setAiEnabled(true);
        setLoadingAiPermission(false);
        if (userRoleData?.company_id) setCompanyId(userRoleData.company_id);
      } else {
        if (!userRoleData?.company_id) { setLoadingAiPermission(false); return; }
        setCompanyId(userRoleData.company_id);
        const { data: company } = await supabase
          .from("companies")
          .select("allow_ai_features")
          .eq("id", userRoleData.company_id)
          .single();
        setAiEnabled(company?.allow_ai_features ?? false);
        setLoadingAiPermission(false);
      }
      const configs = await getAgentConfigs();
      const state: any = { atendimento: false, agendamento: false, vendedor: false };
      if (configs && Array.isArray(configs)) {
        configs.forEach((c: any) => { state[c.agent_type] = !!c.enabled; });
      }
      setAgentStates(state);
    };
    load();
  }, [getAgentConfigs]);

  if (!permissionsLoading && !canAccess("automacao") && !isAdmin) {
    return <Navigate to="/leads" replace />;
  }

  const handleAgentToggle = async (id: string, active: boolean) => {
    setAgentStates(prev => ({ ...prev, [id]: active }));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await updateAgentConfig(id, { enabled: active });
  };

  const aiAgents = useMemo(() => ([
    {
      id: "atendimento",
      name: "IA de Atendimento",
      description: "Pré-atendimento, qualificação, vendas, suporte e gestão de leads em tempo real",
      icon: Bot,
      color: "bg-primary",
      active: agentStates.atendimento,
      stats: { conversationsHandled: 23, avgResponseTime: "8s", successRate: "94%" },
    },
    {
      id: "agendamento",
      name: "IA de Agendamento",
      description: "Agenda, remarca e cancela compromissos automaticamente via WhatsApp",
      icon: Calendar,
      color: "bg-emerald-500",
      active: agentStates.agendamento,
      stats: { conversationsHandled: 18, avgResponseTime: "5s", successRate: "98%" },
    },
    {
      id: "vendedor",
      name: "IA Vendedora",
      description: "Conduz negociações, apresenta produtos e fecha vendas autonomamente",
      icon: Sparkles,
      color: "bg-purple-500",
      active: !!agentStates.vendedor,
      stats: { conversationsHandled: 0, avgResponseTime: "-", successRate: "-" },
    },
  ]), [agentStates]);

  const goToTab = (id: TabId) => setActiveTab(id);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full bg-background">
      {/* Sidebar lateral */}
      <aside className="w-60 shrink-0 border-r bg-card/40 backdrop-blur-sm">
        <nav className="p-3 space-y-5">
          {NAV.map(group => (
            <div key={group.title}>
              <div className="px-3 mb-2 text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
                {group.title}
              </div>
              <div className="space-y-1">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                        active
                          ? "bg-primary/15 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {item.badge && (
                        <Badge variant="outline" className="h-5 text-[10px] px-1.5">{item.badge}</Badge>
                      )}
                      {active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="p-6 space-y-6 animate-in fade-in duration-300">

          {/* ============== AGENTES ============== */}
          {activeTab === "agentes" && (
            <>
              <Header
                icon={Bot}
                title="Agentes de IA"
                subtitle="Respondentes automáticos inteligentes que operam em tempo real nas suas conversas de WhatsApp"
              />

              {!loadingAiPermission && aiEnabled === false && (
                <Alert variant="destructive" className="border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Funcionalidade de IA não habilitada</AlertTitle>
                  <AlertDescription>
                    Os agentes de IA não estão disponíveis para sua conta. Entre em contato com o administrador.
                  </AlertDescription>
                </Alert>
              )}

              {aiEnabled !== false && (
                <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-emerald-500/5">
                  <CardContent className="pt-5 pb-5 flex items-center gap-4">
                    <div className="p-2.5 rounded-lg bg-primary/15">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">IA habilitada para sua conta</h3>
                      <p className="text-xs text-muted-foreground">
                        Os agentes estão disponíveis e podem responder conversas automaticamente. Ative cada agente individualmente.
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" /> Config global
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* KPIs */}
              <div className="grid gap-4 md:grid-cols-4">
                <Kpi color="text-primary" icon={Bot} value="247" label="Atendimentos hoje" hint="+18% vs ontem" />
                <Kpi color="text-sky-400" icon={Activity} value="6s" label="Tempo médio resposta" hint="melhorou 2s" />
                <Kpi color="text-amber-400" icon={Send} value="34" label="Transferências p/ humano" hint="-5% vs ontem" />
                <Kpi color="text-purple-400" icon={BarChart3} value="94%" label="Taxa de resolução" hint="acima da meta" />
              </div>

              {aiEnabled !== false && (
                <div className="grid gap-5 md:grid-cols-2">
                  {aiAgents.map(agent => (
                    <IAAgentCard key={agent.id} {...agent} onToggle={handleAgentToggle} />
                  ))}
                </div>
              )}

              {/* Modo híbrido */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Modo Híbrido: IA + Humano
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sm mb-2 text-primary">Transferência auto</h4>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      <li>• Não souber responder</li>
                      <li>• Cliente pedir atendente</li>
                      <li>• Negócio acima de R$ 10k</li>
                      <li>• Reclamação detectada</li>
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sm mb-2 text-primary">Sugestões ao humano</h4>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      <li>• IA sugere respostas</li>
                      <li>• Humano aceita ou edita</li>
                      <li>• Histórico completo</li>
                      <li>• Transição suave</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Atalho n8n */}
              <Card className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => goToTab("n8n")}>
                <CardContent className="pt-5 pb-5 flex items-center gap-4">
                  <div className="p-2.5 rounded-lg bg-purple-500/15">
                    <Plug className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">Integração n8n / Webhooks</h3>
                    <p className="text-xs text-muted-foreground">Conecte fluxos externos e webhooks personalizados.</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </>
          )}

          {/* ============== BASE DE CONHECIMENTO ============== */}
          {activeTab === "base" && (
            <>
              <Header
                icon={BookOpen}
                title="Base de Conhecimento"
                subtitle="Cadastre conteúdos, FAQs e arquivos para alimentar seus agentes de IA"
              />
              <BaseConhecimentoIA />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Configuração avançada por agente</CardTitle>
                  <CardDescription>
                    Abra o agente desejado e acesse a aba <strong>Conhecimento</strong> para gerenciar arquivos, URLs e prompts específicos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  {aiAgents.slice(0, 2).map(agent => (
                    <IAAgentCard key={agent.id} {...agent} onToggle={handleAgentToggle} />
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          {/* ============== TREINAMENTO ============== */}
          {activeTab === "treinamento" && (
            <>
              <Header
                icon={GraduationCap}
                title="Treinamento dos Agentes"
                subtitle="Refine respostas, corrija erros e ensine sua IA com exemplos reais"
              />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Treinar agentes</CardTitle>
                  <CardDescription>
                    Abra um agente e acesse a aba <strong>Treinamento</strong> para enviar exemplos, corrigir respostas e validar comportamento.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  {aiAgents.slice(0, 2).map(agent => (
                    <IAAgentCard key={agent.id} {...agent} onToggle={handleAgentToggle} />
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          {/* ============== FLUXOS ============== */}
          {activeTab === "fluxos" && (
            <>
              <Header icon={Workflow} title="Fluxos de Automação" subtitle="Construa fluxos visuais e automatize jornadas no estilo n8n" />
              <FluxoAutomacaoBuilder />
            </>
          )}

          {/* ============== DIAGNÓSTICO URA ============== */}
          {activeTab === "diagnostico" && (
            <>
              <Header icon={Activity} title="Diagnóstico da URA" subtitle="Veja por que a URA não disparou e libere conversas travadas" />
              <div className="-mx-6 -mt-2">
                <AutomacaoDiagnostico />
              </div>
            </>
          )}

          {/* ============== CAMPANHAS ============== */}
          {activeTab === "campanhas" && (
            <>
              <Header
                icon={Megaphone}
                title="Campanhas WhatsApp Meta"
                subtitle="Gerencie templates, disparos, métricas e custos da API oficial"
              />
              {companyId ? (
                <Tabs defaultValue="dashboard" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 max-w-2xl">
                    <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-2" />Dashboard</TabsTrigger>
                    <TabsTrigger value="templates"><FileText className="h-4 w-4 mr-2" />Templates</TabsTrigger>
                    <TabsTrigger value="disparo"><Send className="h-4 w-4 mr-2" />Disparo</TabsTrigger>
                    <TabsTrigger value="relatorio"><Activity className="h-4 w-4 mr-2" />Relatório</TabsTrigger>
                  </TabsList>
                  <TabsContent value="dashboard" className="mt-4 space-y-4">
                    <WhatsAppDashboard companyId={companyId} />
                    <CustosTable />
                  </TabsContent>
                  <TabsContent value="templates" className="mt-4">
                    <WhatsAppTemplatesManager companyId={companyId} />
                  </TabsContent>
                  <TabsContent value="disparo" className="mt-4">
                    <DisparoEmMassa />
                  </TabsContent>
                  <TabsContent value="relatorio" className="mt-4">
                    <CampanhasDashboard />
                  </TabsContent>
                </Tabs>
              ) : (
                <LoadingCard />
              )}
            </>
          )}

          {/* ============== DISPARO EM MASSA ============== */}
          {activeTab === "disparo" && (
            <>
              <Header icon={Send} title="Disparo em Massa" subtitle="Envie campanhas segmentadas por tag, funil ou lista de leads" />
              <DisparoEmMassa />
            </>
          )}

          {/* ============== PÁGINA DE CAPTURA ============== */}
          {activeTab === "captura" && (
            <>
              <Header icon={Globe} title="Página de Captura" subtitle="Configure sua landing page de captura de leads" />
              {companyId ? <CapturePageConfig companyId={companyId} /> : <LoadingCard />}
            </>
          )}

          {/* ============== SITE INSTITUCIONAL ============== */}
          {activeTab === "site" && (
            <>
              <Header icon={Layout} title="Site Institucional" subtitle="Edite, publique e gerencie seu site público" />
              {companyId ? <SiteInstitucionalConfig companyId={companyId} /> : <LoadingCard />}
            </>
          )}

          {/* ============== N8N ============== */}
          {activeTab === "n8n" && (
            <>
              <Header icon={Plug} title="n8n / Webhooks" subtitle="Conecte sua instância n8n e gerencie webhooks personalizados" />
              <N8nIntegration />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* ---------- Helpers ---------- */

function Header({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 pb-2 border-b">
      <div className="p-2.5 rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1">
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, value, label, hint, color }: { icon: any; value: string; label: string; hint?: string; color?: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between mb-2">
          <div className={cn("p-2 rounded-lg bg-muted/50", color)}>
            <Icon className={cn("h-4 w-4", color)} />
          </div>
        </div>
        <div className={cn("text-2xl font-bold", color)}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
        {hint && <div className="text-[10px] text-muted-foreground mt-1">↗ {hint}</div>}
      </CardContent>
    </Card>
  );
}

function LoadingCard() {
  return (
    <Card>
      <CardContent className="pt-6 pb-6 text-sm text-muted-foreground text-center">
        Carregando…
      </CardContent>
    </Card>
  );
}

function CustosTable() {
  const rows = [
    { cat: "UTILITY", desc: "Confirmações, atualizações, alertas", price: "R$ 0,0625", color: "bg-blue-500/15 text-blue-400" },
    { cat: "MARKETING", desc: "Promoções, ofertas, campanhas", price: "R$ 0,1250", color: "bg-purple-500/15 text-purple-400" },
    { cat: "AUTHENTICATION", desc: "OTP, 2FA, verificação", price: "R$ 0,0525", color: "bg-amber-500/15 text-amber-400" },
    { cat: "SERVICE", desc: "Respostas na janela de 24h", price: "Grátis*", color: "bg-emerald-500/15 text-emerald-400" },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-500" /> Tabela de Custos — WhatsApp Business API
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-3 font-medium">Categoria</th>
                <th className="text-left p-3 font-medium">Descrição</th>
                <th className="text-right p-3 font-medium">Preço (BRL)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.cat} className="border-t">
                  <td className="p-3"><span className={cn("px-2 py-1 rounded-full text-xs font-medium", r.color)}>{r.cat}</span></td>
                  <td className="p-3 text-muted-foreground">{r.desc}</td>
                  <td className="p-3 text-right font-medium">{r.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-2">* SERVICE é grátis dentro da janela de 24h. Preços podem variar por região e volume.</p>
      </CardContent>
    </Card>
  );
}

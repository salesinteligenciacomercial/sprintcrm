import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Eye, ExternalLink, Sparkles, Plus, Trash2, Globe, Copy, Check } from "lucide-react";
import { SITE_TEMPLATES, SiteConfig, SiteTheme, getTemplateById, DEFAULT_SITE_SECTIONS, MembroEquipe, PlanoSite } from "@/lib/siteTemplates";
import { SiteRenderer } from "../site-publico/SiteRenderer";

interface Props { companyId: string; }

interface FullCfg extends SiteConfig {
  // mantém campos da página de captura
  titulo?: string;
  cor_primaria?: string;
  cor_secundaria?: string;
  logo_url?: string;
  whatsapp?: string;
  telefone_contato?: string;
  email_contato?: string;
  endereco?: string;
  servicos?: Array<{ nome: string; descricao?: string; imagem_url?: string }>;
  depoimentos?: Array<{ nome: string; texto: string; estrelas?: number; foto_url?: string }>;
  faq?: Array<{ pergunta: string; resposta: string }>;
  perguntas?: Array<{ campo: string; label: string; tipo?: string; obrigatorio?: boolean }>;
  tag_automatica?: string;
  sugestoes_chat?: string[];
  slug?: string;
  ativo?: boolean;
}

export function SiteInstitucionalConfig({ companyId }: Props) {
  const [cfg, setCfg] = useState<FullCfg>({
    site_published: false,
    site_sections: DEFAULT_SITE_SECTIONS,
    site_theme: { primary: '#8B5CF6', secondary: '#6D28D9', accent: '#EC4899', font: 'inter', style: 'modern' },
    equipe: [],
    galeria: [],
    planos: [],
    blog_posts: [],
  });
  const [companyName, setCompanyName] = useState('');
  const [companySegmento, setCompanySegmento] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingAI, setGeneratingAI] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const slug = cfg.slug || (companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) || companyId;
  const publicUrl = `${window.location.origin}/site/${slug}`;

  useEffect(() => { load(); }, [companyId]);

  const load = async () => {
    const { data } = await supabase.from('companies').select('capture_page_config, name, segmento').eq('id', companyId).single();
    if (data) {
      setCompanyName(data.name);
      setCompanySegmento(data.segmento);
      const saved = (data as any).capture_page_config as FullCfg;
      if (saved) setCfg(prev => ({ ...prev, ...saved }));
    }
    setLoading(false);
  };

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase as any).rpc('update_capture_page_config', { _company_id: companyId, _config: cfg });
    if (error) toast.error(error.message);
    else toast.success('Site salvo!');
    setSaving(false);
  };

  const togglePublish = async () => {
    const newState = !cfg.site_published;
    const newCfg = { ...cfg, site_published: newState };
    setCfg(newCfg);
    const { error } = await (supabase as any).rpc('update_capture_page_config', { _company_id: companyId, _config: newCfg });
    if (error) { toast.error(error.message); setCfg(cfg); }
    else toast.success(newState ? 'Site publicado! 🚀' : 'Site despublicado');
  };

  const aplicarTemplate = (templateId: string) => {
    const t = getTemplateById(templateId);
    if (!t) return;
    setCfg(prev => ({
      ...prev,
      ...t.config,
      site_theme: t.theme,
      site_template: t.id,
      // não sobrescreve campos da empresa
      whatsapp: prev.whatsapp,
      telefone_contato: prev.telefone_contato,
      email_contato: prev.email_contato,
      endereco: prev.endereco,
      logo_url: prev.logo_url,
      slug: prev.slug,
    }));
    toast.success(`Template "${t.nome}" aplicado!`);
  };

  const gerarComIA = async (secao: string) => {
    setGeneratingAI(secao);
    try {
      const { data, error } = await supabase.functions.invoke('gerar-conteudo-site', {
        body: {
          empresa: companyName,
          segmento: companySegmento,
          secao,
          contexto: { sobre: cfg.sobre_texto, servicos: cfg.servicos?.map(s => s.nome) },
        },
      });
      if (error) throw error;
      const r = data?.resultado || {};
      setCfg(prev => ({ ...prev, ...r }));
      toast.success(`Conteúdo gerado para "${secao}"`);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar conteúdo');
    }
    setGeneratingAI(null);
  };

  const copyUrl = () => { navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  // Equipe helpers
  const addMembro = () => setCfg(p => ({ ...p, equipe: [...(p.equipe || []), { nome: '', cargo: '' }] }));
  const updMembro = (i: number, k: keyof MembroEquipe, v: string) =>
    setCfg(p => ({ ...p, equipe: p.equipe?.map((m, idx) => idx === i ? { ...m, [k]: v } : m) }));
  const rmMembro = (i: number) => setCfg(p => ({ ...p, equipe: p.equipe?.filter((_, idx) => idx !== i) }));

  // Planos helpers
  const addPlano = () => setCfg(p => ({ ...p, planos: [...(p.planos || []), { nome: '', preco: '', itens: [] }] }));
  const updPlano = (i: number, k: keyof PlanoSite, v: any) =>
    setCfg(p => ({ ...p, planos: p.planos?.map((pl, idx) => idx === i ? { ...pl, [k]: v } : pl) }));
  const rmPlano = (i: number) => setCfg(p => ({ ...p, planos: p.planos?.filter((_, idx) => idx !== i) }));

  // Galeria
  const addImagemGaleria = (url: string) => setCfg(p => ({ ...p, galeria: [...(p.galeria || []), url] }));
  const rmImagemGaleria = (i: number) => setCfg(p => ({ ...p, galeria: p.galeria?.filter((_, idx) => idx !== i) }));

  if (loading) return <div className="p-6 text-center">Carregando...</div>;

  return (
    <div className="space-y-4">
      {/* Top bar com publicação */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-primary" />
            <div>
              <div className="font-semibold flex items-center gap-2">
                Site Institucional
                {cfg.site_published ? (
                  <Badge className="bg-green-500">Publicado</Badge>
                ) : (
                  <Badge variant="secondary">Rascunho</Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                {publicUrl}
                <button onClick={copyUrl} className="hover:text-primary">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open(publicUrl, '_blank')} disabled={!cfg.site_published}>
              <ExternalLink className="w-4 h-4 mr-1" /> Ver site
            </Button>
            <Button variant={cfg.site_published ? 'destructive' : 'default'} size="sm" onClick={togglePublish}>
              {cfg.site_published ? 'Despublicar' : 'Publicar agora'}
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="w-4 h-4 mr-1" /> {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="template">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="template">Template</TabsTrigger>
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="sobre">Sobre</TabsTrigger>
          <TabsTrigger value="equipe">Equipe</TabsTrigger>
          <TabsTrigger value="galeria">Galeria</TabsTrigger>
          <TabsTrigger value="planos">Planos</TabsTrigger>
          <TabsTrigger value="secoes">Seções</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="template">
          <Card>
            <CardHeader><CardTitle>Escolha um template</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {SITE_TEMPLATES.map(t => (
                  <Card key={t.id} className={`cursor-pointer transition hover:shadow-lg ${cfg.site_template === t.id ? 'ring-2 ring-primary' : ''}`} onClick={() => aplicarTemplate(t.id)}>
                    <div className="h-24 rounded-t-lg" style={{ background: `linear-gradient(135deg, ${t.theme.primary}, ${t.theme.secondary})` }} />
                    <CardContent className="p-4">
                      <div className="font-semibold">{t.nome}</div>
                      <p className="text-xs text-muted-foreground mt-1">{t.descricao}</p>
                      {cfg.site_template === t.id && <Badge className="mt-2">Selecionado</Badge>}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="mt-6 grid sm:grid-cols-3 gap-4">
                <div>
                  <Label>Cor primária</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={cfg.site_theme?.primary || '#8B5CF6'} onChange={(e) => setCfg(p => ({ ...p, site_theme: { ...p.site_theme!, primary: e.target.value } }))} className="w-16 h-10 p-1" />
                    <Input value={cfg.site_theme?.primary || ''} onChange={(e) => setCfg(p => ({ ...p, site_theme: { ...p.site_theme!, primary: e.target.value } }))} />
                  </div>
                </div>
                <div>
                  <Label>Cor secundária</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={cfg.site_theme?.secondary || '#6D28D9'} onChange={(e) => setCfg(p => ({ ...p, site_theme: { ...p.site_theme!, secondary: e.target.value } }))} className="w-16 h-10 p-1" />
                    <Input value={cfg.site_theme?.secondary || ''} onChange={(e) => setCfg(p => ({ ...p, site_theme: { ...p.site_theme!, secondary: e.target.value } }))} />
                  </div>
                </div>
                <div>
                  <Label>Cor de destaque</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={cfg.site_theme?.accent || '#EC4899'} onChange={(e) => setCfg(p => ({ ...p, site_theme: { ...p.site_theme!, accent: e.target.value } }))} className="w-16 h-10 p-1" />
                    <Input value={cfg.site_theme?.accent || ''} onChange={(e) => setCfg(p => ({ ...p, site_theme: { ...p.site_theme!, accent: e.target.value } }))} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hero">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Seção Hero (Banner principal)</CardTitle>
                <Button variant="outline" size="sm" onClick={() => gerarComIA('hero')} disabled={generatingAI === 'hero'}>
                  <Sparkles className="w-4 h-4 mr-1" /> {generatingAI === 'hero' ? 'Gerando...' : 'Gerar com IA'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Título principal</Label>
                <Input value={cfg.hero_titulo || ''} onChange={(e) => setCfg(p => ({ ...p, hero_titulo: e.target.value }))} placeholder="Bem-vindo à nossa empresa" />
              </div>
              <div>
                <Label>Subtítulo</Label>
                <Textarea value={cfg.hero_subtitulo || ''} onChange={(e) => setCfg(p => ({ ...p, hero_subtitulo: e.target.value }))} />
              </div>
              <div>
                <Label>Texto do botão CTA</Label>
                <Input value={cfg.hero_cta_texto || ''} onChange={(e) => setCfg(p => ({ ...p, hero_cta_texto: e.target.value }))} placeholder="Fale conosco" />
              </div>
              <div>
                <Label>URL da imagem (opcional)</Label>
                <Input value={cfg.hero_imagem_url || ''} onChange={(e) => setCfg(p => ({ ...p, hero_imagem_url: e.target.value }))} placeholder="https://..." />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sobre">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sobre a empresa</CardTitle>
                <Button variant="outline" size="sm" onClick={() => gerarComIA('sobre')} disabled={generatingAI === 'sobre'}>
                  <Sparkles className="w-4 h-4 mr-1" /> {generatingAI === 'sobre' ? 'Gerando...' : 'Gerar com IA'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Título</Label><Input value={cfg.sobre_titulo || ''} onChange={(e) => setCfg(p => ({ ...p, sobre_titulo: e.target.value }))} /></div>
              <div><Label>Texto</Label><Textarea rows={4} value={cfg.sobre_texto || ''} onChange={(e) => setCfg(p => ({ ...p, sobre_texto: e.target.value }))} /></div>
              <div><Label>Missão</Label><Textarea rows={2} value={cfg.sobre_missao || ''} onChange={(e) => setCfg(p => ({ ...p, sobre_missao: e.target.value }))} /></div>
              <div><Label>Visão</Label><Textarea rows={2} value={cfg.sobre_visao || ''} onChange={(e) => setCfg(p => ({ ...p, sobre_visao: e.target.value }))} /></div>
              <div>
                <Label>Valores (separados por vírgula)</Label>
                <Input value={(cfg.sobre_valores || []).join(', ')} onChange={(e) => setCfg(p => ({ ...p, sobre_valores: e.target.value.split(',').map(v => v.trim()).filter(Boolean) }))} placeholder="Ética, Compromisso, Excelência" />
              </div>
              <div><Label>URL da imagem</Label><Input value={cfg.sobre_imagem_url || ''} onChange={(e) => setCfg(p => ({ ...p, sobre_imagem_url: e.target.value }))} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipe">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Equipe</CardTitle>
                <Button size="sm" onClick={addMembro}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(cfg.equipe || []).length === 0 && <p className="text-sm text-muted-foreground">Nenhum membro adicionado.</p>}
              {(cfg.equipe || []).map((m, i) => (
                <Card key={i} className="p-3">
                  <div className="grid sm:grid-cols-2 gap-2">
                    <Input placeholder="Nome" value={m.nome} onChange={(e) => updMembro(i, 'nome', e.target.value)} />
                    <Input placeholder="Cargo" value={m.cargo} onChange={(e) => updMembro(i, 'cargo', e.target.value)} />
                    <Input placeholder="URL da foto" value={m.foto_url || ''} onChange={(e) => updMembro(i, 'foto_url', e.target.value)} />
                    <Input placeholder="Bio curta" value={m.bio || ''} onChange={(e) => updMembro(i, 'bio', e.target.value)} />
                  </div>
                  <Button size="sm" variant="ghost" className="mt-2 text-destructive" onClick={() => rmMembro(i)}>
                    <Trash2 className="w-4 h-4 mr-1" /> Remover
                  </Button>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="galeria">
          <Card>
            <CardHeader><CardTitle>Galeria de imagens</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input id="gal-input" placeholder="Cole uma URL de imagem e pressione Adicionar" />
                <Button onClick={() => {
                  const el = document.getElementById('gal-input') as HTMLInputElement;
                  if (el?.value) { addImagemGaleria(el.value); el.value = ''; }
                }}>Adicionar</Button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {(cfg.galeria || []).map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt={`g${i}`} className="w-full aspect-square object-cover rounded" />
                    <button onClick={() => rmImagemGaleria(i)} className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planos">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Planos & Preços</CardTitle>
                <Button size="sm" onClick={addPlano}><Plus className="w-4 h-4 mr-1" /> Adicionar plano</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(cfg.planos || []).map((p, i) => (
                <Card key={i} className="p-3 space-y-2">
                  <div className="grid sm:grid-cols-3 gap-2">
                    <Input placeholder="Nome do plano" value={p.nome} onChange={(e) => updPlano(i, 'nome', e.target.value)} />
                    <Input placeholder="Preço (ex: R$ 99)" value={p.preco} onChange={(e) => updPlano(i, 'preco', e.target.value)} />
                    <Input placeholder="Período (ex: mês)" value={p.periodo || ''} onChange={(e) => updPlano(i, 'periodo', e.target.value)} />
                  </div>
                  <Input placeholder="Descrição curta" value={p.descricao || ''} onChange={(e) => updPlano(i, 'descricao', e.target.value)} />
                  <Textarea
                    placeholder="Itens (um por linha)"
                    rows={4}
                    value={p.itens.join('\n')}
                    onChange={(e) => updPlano(i, 'itens', e.target.value.split('\n').filter(Boolean))}
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <Switch checked={!!p.destaque} onCheckedChange={(v) => updPlano(i, 'destaque', v)} />
                      Plano em destaque
                    </label>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => rmPlano(i)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="secoes">
          <Card>
            <CardHeader><CardTitle>Ativar/Desativar seções</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(cfg.site_sections || DEFAULT_SITE_SECTIONS).map((s, i) => (
                <div key={s.key} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium capitalize">{s.title || s.key}</div>
                    <div className="text-xs text-muted-foreground">{s.key}</div>
                  </div>
                  <Switch
                    checked={s.enabled}
                    onCheckedChange={(v) => setCfg(p => ({
                      ...p,
                      site_sections: (p.site_sections || DEFAULT_SITE_SECTIONS).map((sec, idx) => idx === i ? { ...sec, enabled: v } : sec)
                    }))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle><Eye className="w-4 h-4 inline mr-1" /> Preview ao vivo</CardTitle>
                <span className="text-xs text-muted-foreground">Como o site aparecerá ao público</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border-t max-h-[800px] overflow-y-auto">
                <SiteRenderer config={cfg as any} companyId={companyId} companyName={companyName} slug={slug} previewMode />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

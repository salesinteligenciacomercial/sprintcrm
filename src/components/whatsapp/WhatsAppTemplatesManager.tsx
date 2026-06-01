import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { 
  Plus, 
  RefreshCw, 
  Trash2, 
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle,
  AlertCircle,
  Eye,
  Loader2,
  Copy,
  Image as ImageIcon,
  Video,
  File as FileIcon,
  Type as TypeIcon,
  Ban,
  Send,
  Sparkles,
  Reply,
  Link as LinkIcon,
  Phone
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TemplatePreview } from "./TemplatePreview";

interface TemplatesManagerProps {
  companyId: string;
}

interface Template {
  id: string;
  meta_template_id: string | null;
  name: string;
  language: string;
  category: string;
  status: string;
  components: any[];
  quality_score: string | null;
  synced_at: string | null;
  created_at: string;
}

interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  example?: { header_text?: string[]; body_text?: string[][] };
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

export function WhatsAppTemplatesManager({ companyId }: TemplatesManagerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [metaNotConfigured, setMetaNotConfigured] = useState(false);

  // Form state
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: 'MARKETING' as 'UTILITY' | 'MARKETING' | 'AUTHENTICATION',
    language: 'pt_BR',
    headerType: 'none' as 'none' | 'text' | 'image' | 'video' | 'document',
    headerText: '',
    headerMediaUrl: '',
    bodyText: '',
    bodyExamples: [] as string[],
    footerText: '',
    buttons: [] as Array<{ type: string; text: string; url?: string; phone?: string }>
  });

  // Sincronizar exemplos com variáveis detectadas no corpo
  useEffect(() => {
    const vars = newTemplate.bodyText.match(/\{\{(\d+)\}\}/g) || [];
    const unique = Array.from(new Set(vars));
    setNewTemplate(prev => {
      if (prev.bodyExamples.length === unique.length) return prev;
      return { ...prev, bodyExamples: unique.map((_, i) => prev.bodyExamples[i] || '') };
    });
  }, [newTemplate.bodyText]);

  const sanitizeName = (v: string) =>
    v.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 60);

  const loadTemplates = async (sync = false) => {
    try {
      if (sync) setSyncing(true);
      else setLoading(true);
      setMetaNotConfigured(false);

      const { data: result, error: fnError } = await supabase.functions.invoke('whatsapp-templates', {
        method: 'POST',
        body: { company_id: companyId, action: 'list', sync }
      });

      // Edge function retorna 400 com JSON — extrair mensagem de erro do body
      const errorMsg = result?.error || fnError?.message || '';
      if (fnError || (result && result.error)) {
        const msg = errorMsg || 'Erro ao carregar templates';
        if (msg.includes('não configurada') || msg.includes('not configured')) {
          setMetaNotConfigured(true);
          setTemplates([]);
          return;
        }
        if (msg.includes('Invalid OAuth') || msg.includes('access token') || msg.includes('Credenciais Meta')) {
          toast({
            variant: "destructive",
            title: "Token Meta inválido",
            description: "O Access Token da Meta API está inválido ou expirado. Vá em Configurações → Meta API e atualize o token com um token permanente (EAA...)."
          });
          setTemplates([]);
          return;
        }
        throw new Error(msg);
      }

      if (sync) {
        setTemplates(result.templates || []);
        toast({
          title: "Templates sincronizados",
          description: `${result.synced || 0} templates sincronizados com a Meta`
        });
        // Recarregar do banco local
        await loadTemplates(false);
      } else {
        setTemplates(result.templates || []);
      }
    } catch (error: any) {
      console.error('Erro ao carregar templates:', error);
      // Verificar se é erro de conexão
      if (error.message?.includes('não configurada') || error.message?.includes('not configured')) {
        setMetaNotConfigured(true);
        setTemplates([]);
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao carregar templates",
          description: error.message
        });
      }
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadTemplates();
    }
  }, [companyId]);

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.bodyText) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Nome e corpo do template são obrigatórios"
      });
      return;
    }

    try {
      setCreating(true);

      // Montar componentes
      const components: TemplateComponent[] = [];

      // Header
      if (newTemplate.headerType === 'text' && newTemplate.headerText) {
        components.push({
          type: 'HEADER',
          format: 'TEXT',
          text: newTemplate.headerText,
          example: { header_text: [newTemplate.headerText] }
        });
      } else if (['image', 'video', 'document'].includes(newTemplate.headerType)) {
        if (!newTemplate.headerMediaUrl) {
          toast({
            variant: 'destructive',
            title: 'URL de mídia obrigatória',
            description: 'Informe a URL pública do arquivo para o cabeçalho.'
          });
          setCreating(false);
          return;
        }
        components.push({
          type: 'HEADER',
          format: newTemplate.headerType.toUpperCase() as any,
        });
      }

      // Body (obrigatório) — Meta exige valores reais de exemplo para cada variável
      const bodyVarMatches = newTemplate.bodyText.match(/\{\{(\d+)\}\}/g) || [];
      const uniqueVars = Array.from(new Set(bodyVarMatches));
      const examples = uniqueVars.map((_, i) => newTemplate.bodyExamples[i] || `Exemplo ${i + 1}`);
      components.push({
        type: 'BODY',
        text: newTemplate.bodyText,
        example: uniqueVars.length > 0 ? { body_text: [examples] } : undefined
      });

      // Footer
      if (newTemplate.footerText) {
        components.push({
          type: 'FOOTER',
          text: newTemplate.footerText
        });
      }

      // Buttons
      if (newTemplate.buttons.length > 0) {
        components.push({
          type: 'BUTTONS',
          buttons: newTemplate.buttons.map(btn => ({
            type: btn.type as any,
            text: btn.text,
            url: btn.url,
            phone_number: btn.phone
          }))
        });
      }

      const { data: result, error: fnError } = await supabase.functions.invoke('whatsapp-templates', {
        method: 'POST',
        body: {
          action: 'create',
          company_id: companyId,
          name: newTemplate.name,
          category: newTemplate.category,
          language: newTemplate.language,
          components,
          header_media_url: ['image','video','document'].includes(newTemplate.headerType) ? newTemplate.headerMediaUrl : undefined,
          header_format: ['image','video','document'].includes(newTemplate.headerType) ? newTemplate.headerType.toUpperCase() : undefined,
        }
      });

      if (fnError || result?.error) {
        throw new Error(result?.error || fnError?.message || 'Erro ao criar template');
      }

      toast({
        title: "Template criado!",
        description: "O template foi enviado para aprovação da Meta. Status: PENDING"
      });

      setCreateDialogOpen(false);
      resetForm();
      loadTemplates();

    } catch (error: any) {
      console.error('Erro ao criar template:', error);
      toast({
        variant: "destructive",
        title: "Erro ao criar template",
        description: error.message
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTemplate = async (template: Template) => {
    if (!confirm(`Tem certeza que deseja deletar o template "${template.name}"?`)) return;

    try {
      setDeleting(template.id);

      const { data: result, error: fnError } = await supabase.functions.invoke('whatsapp-templates', {
        method: 'POST',
        body: {
          action: 'delete',
          company_id: companyId,
          template_name: template.name
        }
      });

      if (fnError || result?.error) {
        throw new Error(result?.error || fnError?.message || 'Erro ao deletar template');
      }

      toast({
        title: "Template deletado",
        description: `O template "${template.name}" foi removido`
      });

      loadTemplates();

    } catch (error: any) {
      console.error('Erro ao deletar template:', error);
      toast({
        variant: "destructive",
        title: "Erro ao deletar template",
        description: error.message
      });
    } finally {
      setDeleting(null);
    }
  };

  const resetForm = () => {
    setNewTemplate({
      name: '',
      category: 'MARKETING',
      language: 'pt_BR',
      headerType: 'none',
      headerText: '',
      headerMediaUrl: '',
      bodyText: '',
      bodyExamples: [],
      footerText: '',
      buttons: []
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      APPROVED: 'default',
      PENDING: 'secondary',
      REJECTED: 'destructive',
      PAUSED: 'outline',
      DISABLED: 'outline'
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      UTILITY: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      MARKETING: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      AUTHENTICATION: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[category] || 'bg-gray-100 text-gray-800'}`}>
        {category}
      </span>
    );
  };

  const addButton = () => {
    if (newTemplate.buttons.length >= 3) return;
    setNewTemplate(prev => ({
      ...prev,
      buttons: [...prev.buttons, { type: 'QUICK_REPLY', text: '' }]
    }));
  };

  const removeButton = (index: number) => {
    setNewTemplate(prev => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index)
    }));
  };

  const updateButton = (index: number, field: string, value: string) => {
    setNewTemplate(prev => ({
      ...prev,
      buttons: prev.buttons.map((btn, i) => i === index ? { ...btn, [field]: value } : btn)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Mostrar mensagem quando Meta não está configurada
  if (metaNotConfigured) {
    return (
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-700">
            <AlertCircle className="h-5 w-5" />
            Conexão Meta não Configurada
          </CardTitle>
          <CardDescription>
            Para gerenciar templates da API oficial do WhatsApp, você precisa configurar a conexão com a Meta API primeiro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Para configurar:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Acesse a aba <strong>"Canais"</strong> nas configurações</li>
              <li>Encontre a seção <strong>"Meta API (WhatsApp Business)"</strong></li>
              <li>Configure o <strong>Phone Number ID</strong> e o <strong>Access Token</strong> da sua conta Meta Business</li>
              <li>Salve as configurações e volte aqui</li>
            </ol>
          </div>
          <Button variant="outline" onClick={() => loadTemplates()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Verificar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Templates WhatsApp</h2>
          <p className="text-muted-foreground">
            Gerencie templates de mensagem da Meta API
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => loadTemplates(true)} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Criar Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Novo Template — Enviar para Meta
                </DialogTitle>
              </DialogHeader>

              {/* Banner informativo */}
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 flex gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p>
                  <strong>Criação direta via API!</strong> O template será enviado automaticamente para aprovação da Meta.
                  Após aprovado (geralmente em minutos a horas), ficará disponível para uso nos disparos em massa.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
                {/* Coluna esquerda: formulário */}
                <div className="space-y-4">
                  {/* Nome e Categoria */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome do template *</Label>
                      <Input
                        placeholder="ex: boas_vindas"
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate(prev => ({ ...prev, name: sanitizeName(e.target.value) }))}
                      />
                      <p className="text-xs text-muted-foreground">Apenas minúsculas e underscores</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Categoria *</Label>
                      <Select
                        value={newTemplate.category}
                        onValueChange={(v) => setNewTemplate(prev => ({ ...prev, category: v as any }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MARKETING">Marketing (R$ 0,065)</SelectItem>
                          <SelectItem value="UTILITY">Utility (R$ 0,035)</SelectItem>
                          <SelectItem value="AUTHENTICATION">Authentication (R$ 0,045)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Idioma */}
                  <div className="space-y-2">
                    <Label>Idioma</Label>
                    <Select
                      value={newTemplate.language}
                      onValueChange={(v) => setNewTemplate(prev => ({ ...prev, language: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt_BR">Português (Brasil)</SelectItem>
                        <SelectItem value="en_US">English (US)</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tipo de Cabeçalho — botões */}
                  <div className="space-y-2">
                    <Label>Tipo de Cabeçalho</Label>
                    <div className="flex flex-wrap gap-2">
                      {([
                        { v: 'none', label: 'Nenhum', icon: Ban },
                        { v: 'text', label: 'Texto', icon: TypeIcon },
                        { v: 'image', label: 'Imagem', icon: ImageIcon },
                        { v: 'video', label: 'Vídeo', icon: Video },
                        { v: 'document', label: 'Documento', icon: FileIcon },
                      ] as const).map(({ v, label, icon: Icon }) => (
                        <Button
                          key={v}
                          type="button"
                          size="sm"
                          variant={newTemplate.headerType === v ? 'default' : 'outline'}
                          onClick={() => setNewTemplate(prev => ({ ...prev, headerType: v }))}
                          className="gap-1.5"
                        >
                          {v === 'none' ? <span className="text-muted-foreground">—</span> : <Icon className="h-4 w-4" />}
                          {label}
                        </Button>
                      ))}
                    </div>

                    {newTemplate.headerType === 'text' && (
                      <div className="space-y-1 pt-1">
                        <Label className="text-xs">Texto do Cabeçalho</Label>
                        <Input
                          placeholder="Ex: 🎁 Oferta Especial!"
                          maxLength={60}
                          value={newTemplate.headerText}
                          onChange={(e) => setNewTemplate(prev => ({ ...prev, headerText: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">{newTemplate.headerText.length}/60 caracteres</p>
                      </div>
                    )}

                    {['image', 'video', 'document'].includes(newTemplate.headerType) && (
                      <div className="space-y-1 pt-1">
                        <Label className="text-xs flex items-center gap-1">
                          {newTemplate.headerType === 'image' && <ImageIcon className="h-3.5 w-3.5" />}
                          {newTemplate.headerType === 'video' && <Video className="h-3.5 w-3.5" />}
                          {newTemplate.headerType === 'document' && <FileIcon className="h-3.5 w-3.5" />}
                          URL {newTemplate.headerType === 'image' ? 'da Imagem' : newTemplate.headerType === 'video' ? 'do Vídeo' : 'do Documento'} do Cabeçalho
                        </Label>
                        <Input
                          placeholder={`https://... (link público do ${newTemplate.headerType === 'image' ? 'arquivo JPG/PNG' : newTemplate.headerType === 'video' ? 'vídeo MP4' : 'PDF'})`}
                          value={newTemplate.headerMediaUrl}
                          onChange={(e) => setNewTemplate(prev => ({ ...prev, headerMediaUrl: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">
                          Cole uma URL pública. O arquivo será enviado à Meta como exemplo para aprovação.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="space-y-2">
                    <Label>Corpo da mensagem *</Label>
                    <Textarea
                      placeholder="Olá {{1}}! 👋&#10;Temos uma oferta especial para você.&#10;Clique abaixo para saber mais!"
                      value={newTemplate.bodyText}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, bodyText: e.target.value }))}
                      rows={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use <code>{"{{1}}"}</code>, <code>{"{{2}}"}</code> para variáveis. {newTemplate.bodyText.length} caracteres.
                    </p>

                    {newTemplate.bodyExamples.length > 0 && (
                      <div className="space-y-2 mt-2 p-3 rounded-md bg-muted/40 border">
                        <p className="text-xs font-medium">Valores de exemplo (obrigatório pela Meta)</p>
                        {newTemplate.bodyExamples.map((val, i) => (
                          <Input
                            key={i}
                            placeholder={`Exemplo para {{${i + 1}}}`}
                            value={val}
                            onChange={(e) => {
                              const next = [...newTemplate.bodyExamples];
                              next[i] = e.target.value;
                              setNewTemplate(prev => ({ ...prev, bodyExamples: next }));
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="space-y-2">
                    <Label>Rodapé (opcional)</Label>
                    <Input
                      placeholder="Ex: Para cancelar, responda SAIR"
                      maxLength={60}
                      value={newTemplate.footerText}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, footerText: e.target.value }))}
                    />
                  </div>

                  {/* Botões com chips de adição */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <Label>Botões (opcional, máx. 3)</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button" size="sm" variant="outline"
                          disabled={newTemplate.buttons.length >= 3}
                          onClick={() => setNewTemplate(prev => ({ ...prev, buttons: [...prev.buttons, { type: 'QUICK_REPLY', text: '' }] }))}
                          className="gap-1 bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30"
                        >
                          <Reply className="h-3.5 w-3.5" /> + Resposta Rápida
                        </Button>
                        <Button
                          type="button" size="sm" variant="outline"
                          disabled={newTemplate.buttons.length >= 3}
                          onClick={() => setNewTemplate(prev => ({ ...prev, buttons: [...prev.buttons, { type: 'URL', text: '', url: '' }] }))}
                          className="gap-1 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30"
                        >
                          <LinkIcon className="h-3.5 w-3.5" /> Link
                        </Button>
                        <Button
                          type="button" size="sm" variant="outline"
                          disabled={newTemplate.buttons.length >= 3}
                          onClick={() => setNewTemplate(prev => ({ ...prev, buttons: [...prev.buttons, { type: 'PHONE_NUMBER', text: '', phone: '' }] }))}
                          className="gap-1 bg-green-500/10 hover:bg-green-500/20 border-green-500/30"
                        >
                          <Phone className="h-3.5 w-3.5" /> Telefone
                        </Button>
                      </div>
                    </div>
                    {newTemplate.buttons.length === 0 && (
                      <p className="text-xs text-center text-muted-foreground py-3 border border-dashed rounded-md">
                        Nenhum botão adicionado. Clique em + para adicionar.
                      </p>
                    )}
                    {newTemplate.buttons.map((btn, index) => (
                      <div key={index} className="flex gap-2 items-center border rounded-lg p-2">
                        <span className="text-xs px-2 py-1 rounded bg-muted shrink-0">
                          {btn.type === 'QUICK_REPLY' ? 'Resposta' : btn.type === 'URL' ? 'Link' : 'Telefone'}
                        </span>
                        <Input
                          placeholder="Texto do botão"
                          value={btn.text}
                          onChange={(e) => updateButton(index, 'text', e.target.value)}
                          className="flex-1"
                        />
                        {btn.type === 'URL' && (
                          <Input
                            placeholder="https://..."
                            value={btn.url || ''}
                            onChange={(e) => updateButton(index, 'url', e.target.value)}
                            className="flex-1"
                          />
                        )}
                        {btn.type === 'PHONE_NUMBER' && (
                          <Input
                            placeholder="+5511999999999"
                            value={btn.phone || ''}
                            onChange={(e) => updateButton(index, 'phone', e.target.value)}
                            className="flex-1"
                          />
                        )}
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeButton(index)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Coluna direita: Pré-visualização */}
                <div className="lg:sticky lg:top-0 h-fit">
                  <p className="text-xs font-medium mb-2 flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5 text-primary" /> Pré-visualização WhatsApp
                  </p>
                  <div className="rounded-lg bg-[#e5ddd5] dark:bg-muted/30 p-4 min-h-[420px]">
                    <div className="ml-auto max-w-[260px] bg-white dark:bg-card rounded-lg p-2 shadow-sm">
                      {newTemplate.headerType === 'text' && newTemplate.headerText && (
                        <p className="font-semibold text-sm mb-1 px-1">{newTemplate.headerText}</p>
                      )}
                      {newTemplate.headerType === 'image' && (
                        <div className="aspect-video bg-blue-50 dark:bg-blue-950/30 rounded mb-2 flex items-center justify-center text-blue-500 text-xs gap-1">
                          {newTemplate.headerMediaUrl ? (
                            <img src={newTemplate.headerMediaUrl} alt="" className="w-full h-full object-cover rounded" onError={(e) => (e.currentTarget.style.display = 'none')} />
                          ) : (
                            <><ImageIcon className="h-4 w-4" /> Imagem (cole a URL)</>
                          )}
                        </div>
                      )}
                      {newTemplate.headerType === 'video' && (
                        <div className="aspect-video bg-purple-50 dark:bg-purple-950/30 rounded mb-2 flex items-center justify-center text-purple-500 text-xs gap-1">
                          <Video className="h-4 w-4" /> {newTemplate.headerMediaUrl ? 'Vídeo' : 'Vídeo (cole a URL)'}
                        </div>
                      )}
                      {newTemplate.headerType === 'document' && (
                        <div className="bg-gray-100 dark:bg-muted rounded mb-2 p-3 flex items-center gap-2 text-xs">
                          <FileIcon className="h-5 w-5 text-red-500" />
                          <span className="truncate">{newTemplate.headerMediaUrl ? 'documento.pdf' : 'Documento (cole a URL)'}</span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap px-1 text-gray-800 dark:text-foreground">
                        {newTemplate.bodyText || <span className="text-muted-foreground italic">Corpo da mensagem aparecerá aqui...</span>}
                      </p>
                      {newTemplate.footerText && (
                        <p className="text-[11px] text-muted-foreground pt-1 px-1">{newTemplate.footerText}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground text-right pt-1">agora ✓✓</p>
                      {newTemplate.buttons.length > 0 && (
                        <div className="pt-2 mt-2 border-t space-y-0.5">
                          {newTemplate.buttons.map((b, i) => (
                            <div key={i} className="text-center text-primary text-xs py-1.5">
                              {b.text || `Botão ${i + 1}`}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateTemplate} disabled={creating} className="gap-2">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Criar e Enviar para Aprovação
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum template encontrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Sincronize com a Meta ou crie um novo template
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => loadTemplates(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sincronizar
              </Button>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Template
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  {getStatusIcon(template.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{template.name}</h3>
                      {getStatusBadge(template.status)}
                      {getCategoryBadge(template.category)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Idioma: {template.language} 
                      {template.quality_score && ` • Qualidade: ${template.quality_score}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setPreviewDialogOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(template.name);
                      toast({ title: "Nome copiado!" });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteTemplate(template)}
                    disabled={deleting === template.id}
                  >
                    {deleting === template.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-red-500" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Preview do Template</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <TemplatePreview 
              components={selectedTemplate.components}
              name={selectedTemplate.name}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
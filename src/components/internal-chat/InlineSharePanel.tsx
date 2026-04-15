import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Users, CheckSquare, Layers, Search, Loader2, ArrowLeft, Calendar, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InlineSharePanelProps {
  onShare: (itemType: string, itemId: string, itemName: string) => void;
  onBack: () => void;
}

interface Lead { id: string; name: string; email?: string; telefone?: string; phone?: string; }
interface TaskBoard { id: string; nome: string; }
interface TaskColumn { id: string; nome: string; board_id: string; }
interface Task { id: string; title: string; column_id: string; status: string; }
interface Funnel { id: string; nome: string; descricao?: string; }
interface Stage { id: string; nome: string; funil_id: string; cor?: string; }
interface Agenda { id: string; nome: string; tipo: string; status?: string; }
interface Profissional { id: string; nome: string; especialidade?: string; }
interface Compromisso { id: string; titulo?: string; paciente?: string; tipo_servico: string; data_hora_inicio: string; data_hora_fim: string; status?: string; agenda_id?: string; profissional_id?: string; }

export const InlineSharePanel = ({ onShare, onBack }: InlineSharePanelProps) => {
  const [activeTab, setActiveTab] = useState('lead');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [boards, setBoards] = useState<TaskBoard[]>([]);
  const [columns, setColumns] = useState<TaskColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedBoard, setSelectedBoard] = useState('');
  const [selectedColumn, setSelectedColumn] = useState('');
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [funnelLeads, setFunnelLeads] = useState<Lead[]>([]);
  const [selectedFunnel, setSelectedFunnel] = useState('');
  const [selectedStage, setSelectedStage] = useState('');

  // Agenda state
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [compromissos, setCompromissos] = useState<Compromisso[]>([]);
  const [selectedAgenda, setSelectedAgenda] = useState('');
  const [agendaFilter, setAgendaFilter] = useState<'agendas' | 'profissionais' | 'compromissos'>('agendas');

  useEffect(() => { loadInitialData(); }, []);

  useEffect(() => {
    if (selectedBoard) { loadColumns(selectedBoard); setSelectedColumn(''); }
  }, [selectedBoard]);

  useEffect(() => {
    if (selectedColumn) loadTasks(selectedColumn);
  }, [selectedColumn]);

  useEffect(() => {
    if (selectedFunnel) { loadStages(selectedFunnel); loadFunnelLeads(selectedFunnel, ''); setSelectedStage(''); }
  }, [selectedFunnel]);

  useEffect(() => {
    if (selectedFunnel) loadFunnelLeads(selectedFunnel, selectedStage);
  }, [selectedStage]);

  useEffect(() => {
    if (selectedAgenda) loadCompromissos(selectedAgenda);
  }, [selectedAgenda]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [leadsRes, boardsRes, funnelsRes, agendasRes, profissionaisRes] = await Promise.all([
        supabase.from('leads').select('id, name, email, telefone, phone').order('name').limit(100),
        supabase.from('task_boards').select('id, nome').order('nome'),
        supabase.from('funis').select('id, nome, descricao').order('nome'),
        supabase.from('agendas').select('id, nome, tipo, status').order('nome'),
        supabase.from('profissionais').select('id, nome, especialidade').order('nome'),
      ]);
      if (leadsRes.data) setLeads(leadsRes.data);
      if (boardsRes.data) setBoards(boardsRes.data);
      if (funnelsRes.data) setFunnels(funnelsRes.data);
      if (agendasRes.data) setAgendas(agendasRes.data);
      if (profissionaisRes.data) setProfissionais(profissionaisRes.data);
    } catch (error) { console.error('Error loading data:', error); }
    finally { setLoading(false); }
  };

  const loadColumns = async (boardId: string) => {
    const { data } = await supabase.from('task_columns').select('id, nome, board_id').eq('board_id', boardId).order('posicao');
    if (data) setColumns(data);
  };

  const loadTasks = async (columnId: string) => {
    const { data } = await supabase.from('tasks').select('id, title, column_id, status').eq('column_id', columnId).order('title');
    if (data) setTasks(data);
  };

  const loadStages = async (funnelId: string) => {
    const { data } = await supabase.from('etapas').select('id, nome, funil_id, cor').eq('funil_id', funnelId).order('posicao');
    if (data) setStages(data);
  };

  const loadFunnelLeads = async (funnelId: string, stageId?: string) => {
    let query = supabase.from('leads').select('id, name, email, telefone, phone').eq('funil_id', funnelId);
    if (stageId && stageId !== 'all') query = query.eq('etapa_id', stageId);
    const { data } = await query.order('name').limit(50);
    if (data) setFunnelLeads(data);
  };

  const loadCompromissos = async (agendaId: string) => {
    const { data } = await supabase
      .from('compromissos')
      .select('id, titulo, paciente, tipo_servico, data_hora_inicio, data_hora_fim, status, agenda_id, profissional_id')
      .eq('agenda_id', agendaId)
      .gte('data_hora_inicio', new Date().toISOString())
      .order('data_hora_inicio', { ascending: true })
      .limit(50);
    if (data) setCompromissos(data);
  };

  const loadAllCompromissos = async () => {
    const { data } = await supabase
      .from('compromissos')
      .select('id, titulo, paciente, tipo_servico, data_hora_inicio, data_hora_fim, status, agenda_id, profissional_id')
      .gte('data_hora_inicio', new Date().toISOString())
      .order('data_hora_inicio', { ascending: true })
      .limit(50);
    if (data) setCompromissos(data);
  };

  const getFilteredLeads = () => {
    if (!search.trim()) return leads;
    const s = search.toLowerCase();
    return leads.filter(l => l.name.toLowerCase().includes(s) || l.email?.toLowerCase().includes(s) || l.telefone?.includes(search) || l.phone?.includes(search));
  };

  const getFilteredTasks = () => {
    if (!search.trim()) return tasks;
    return tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
  };

  const getFilteredAgendas = () => {
    if (!search.trim()) return agendas;
    return agendas.filter(a => a.nome.toLowerCase().includes(search.toLowerCase()));
  };

  const getFilteredProfissionais = () => {
    if (!search.trim()) return profissionais;
    const s = search.toLowerCase();
    return profissionais.filter(p => p.nome.toLowerCase().includes(s) || p.especialidade?.toLowerCase().includes(s));
  };

  const getFilteredCompromissos = () => {
    if (!search.trim()) return compromissos;
    const s = search.toLowerCase();
    return compromissos.filter(c => 
      c.titulo?.toLowerCase().includes(s) || 
      c.paciente?.toLowerCase().includes(s) || 
      c.tipo_servico.toLowerCase().includes(s)
    );
  };

  const formatCompromissoDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM 'às' HH:mm", { locale: ptBR });
    } catch { return dateStr; }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedBoard(''); setSelectedColumn(''); setSelectedFunnel(''); setSelectedStage(''); setSelectedAgenda(''); setSearch('');
    if (tab === 'agenda') {
      setAgendaFilter('agendas');
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
        <button onClick={onBack} className="p-1 rounded hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">Compartilhar Item</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full grid grid-cols-4 h-8">
            <TabsTrigger value="lead" className="gap-1 text-[10px] py-1"><Users className="h-3 w-3" />Leads</TabsTrigger>
            <TabsTrigger value="task" className="gap-1 text-[10px] py-1"><CheckSquare className="h-3 w-3" />Tarefas</TabsTrigger>
            <TabsTrigger value="funnel" className="gap-1 text-[10px] py-1"><Layers className="h-3 w-3" />Funis</TabsTrigger>
            <TabsTrigger value="agenda" className="gap-1 text-[10px] py-1"><Calendar className="h-3 w-3" />Agenda</TabsTrigger>
          </TabsList>

          {/* LEADS TAB */}
          <TabsContent value="lead" className="mt-2">
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <ScrollArea className="h-[280px]">
                <div className="space-y-0.5 pr-1">
                  {getFilteredLeads().map(lead => (
                    <div key={lead.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent/50 transition-colors">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Users className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{lead.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{lead.telefone || lead.phone || lead.email || ''}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => onShare('lead', lead.id, lead.name)} className="h-6 px-2 text-[10px]">Enviar</Button>
                    </div>
                  ))}
                  {getFilteredLeads().length === 0 && <p className="text-center text-muted-foreground py-6 text-xs">Nenhum resultado</p>}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* TASKS TAB */}
          <TabsContent value="task" className="mt-2 space-y-2">
            <Select value={selectedBoard} onValueChange={setSelectedBoard}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione um quadro" /></SelectTrigger>
              <SelectContent>{boards.map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}</SelectContent>
            </Select>
            {selectedBoard && (
              <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione uma coluna" /></SelectTrigger>
                <SelectContent>{columns.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {selectedColumn && (
              <ScrollArea className="h-[180px]">
                <div className="space-y-0.5">
                  {getFilteredTasks().map(task => (
                    <div key={task.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent/50">
                      <CheckSquare className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{task.title}</p>
                        <p className="text-[10px] text-muted-foreground">{task.status}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => onShare('task', task.id, task.title)} className="h-6 px-2 text-[10px]">Enviar</Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            {!selectedBoard && <p className="text-center text-muted-foreground py-6 text-xs">Selecione um quadro</p>}
          </TabsContent>

          {/* FUNNELS TAB */}
          <TabsContent value="funnel" className="mt-2 space-y-2">
            <Select value={selectedFunnel} onValueChange={setSelectedFunnel}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione um funil" /></SelectTrigger>
              <SelectContent>{funnels.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
            </Select>
            {selectedFunnel && (
              <>
                <Select value={selectedStage} onValueChange={setSelectedStage}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas as etapas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as etapas</SelectItem>
                    {stages.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.cor || '#3b82f6' }} />
                          {s.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="default" size="sm" onClick={() => {
                  const funnel = funnels.find(f => f.id === selectedFunnel);
                  if (funnel) {
                    const stageName = selectedStage && selectedStage !== 'all' ? stages.find(s => s.id === selectedStage)?.nome : '';
                    onShare('funnel', selectedFunnel, stageName ? `${funnel.nome} - ${stageName}` : funnel.nome);
                  }
                }} className="w-full h-8 text-xs">
                  <Layers className="h-3 w-3 mr-1" />Compartilhar Funil
                </Button>
                {funnelLeads.length > 0 && (
                  <ScrollArea className="h-[120px]">
                    <div className="space-y-0.5">
                      {funnelLeads.map(lead => (
                        <div key={lead.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent/50">
                          <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                          <p className="text-xs font-medium truncate flex-1">{lead.name}</p>
                          <Button variant="ghost" size="sm" onClick={() => onShare('lead', lead.id, lead.name)} className="h-6 px-2 text-[10px]">Enviar</Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </>
            )}
            {!selectedFunnel && <p className="text-center text-muted-foreground py-6 text-xs">Selecione um funil</p>}
          </TabsContent>

          {/* AGENDA TAB */}
          <TabsContent value="agenda" className="mt-2 space-y-2">
            {/* Sub-filter buttons */}
            <div className="flex gap-1">
              <Button
                variant={agendaFilter === 'agendas' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setAgendaFilter('agendas'); setSelectedAgenda(''); }}
                className="h-7 text-[10px] flex-1 gap-1"
              >
                <Calendar className="h-3 w-3" />Agendas
              </Button>
              <Button
                variant={agendaFilter === 'profissionais' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAgendaFilter('profissionais')}
                className="h-7 text-[10px] flex-1 gap-1"
              >
                <User className="h-3 w-3" />Profissionais
              </Button>
              <Button
                variant={agendaFilter === 'compromissos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setAgendaFilter('compromissos'); loadAllCompromissos(); }}
                className="h-7 text-[10px] flex-1 gap-1"
              >
                <Clock className="h-3 w-3" />Compromissos
              </Button>
            </div>

            {/* Agendas list */}
            {agendaFilter === 'agendas' && (
              <ScrollArea className="h-[240px]">
                <div className="space-y-0.5">
                  {getFilteredAgendas().map(agenda => (
                    <div key={agenda.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent/50 transition-colors">
                      <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Calendar className="h-3.5 w-3.5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{agenda.nome}</p>
                        <p className="text-[10px] text-muted-foreground">{agenda.tipo} {agenda.status && agenda.status !== 'ativo' ? `• ${agenda.status}` : ''}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedAgenda(agenda.id); setAgendaFilter('compromissos'); }} className="h-6 px-1.5 text-[10px]">
                          <Clock className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onShare('agenda', agenda.id, `📅 ${agenda.nome}`)} className="h-6 px-2 text-[10px]">Enviar</Button>
                      </div>
                    </div>
                  ))}
                  {getFilteredAgendas().length === 0 && <p className="text-center text-muted-foreground py-6 text-xs">Nenhuma agenda encontrada</p>}
                </div>
              </ScrollArea>
            )}

            {/* Profissionais list */}
            {agendaFilter === 'profissionais' && (
              <ScrollArea className="h-[240px]">
                <div className="space-y-0.5">
                  {getFilteredProfissionais().map(prof => (
                    <div key={prof.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent/50 transition-colors">
                      <div className="h-7 w-7 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                        <User className="h-3.5 w-3.5 text-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{prof.nome}</p>
                        {prof.especialidade && <p className="text-[10px] text-muted-foreground truncate">{prof.especialidade}</p>}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => onShare('profissional', prof.id, `👨‍⚕️ ${prof.nome}${prof.especialidade ? ` - ${prof.especialidade}` : ''}`)} className="h-6 px-2 text-[10px]">Enviar</Button>
                    </div>
                  ))}
                  {getFilteredProfissionais().length === 0 && <p className="text-center text-muted-foreground py-6 text-xs">Nenhum profissional encontrado</p>}
                </div>
              </ScrollArea>
            )}

            {/* Compromissos list */}
            {agendaFilter === 'compromissos' && (
              <>
                {!selectedAgenda && agendas.length > 0 && (
                  <Select value={selectedAgenda} onValueChange={setSelectedAgenda}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Filtrar por agenda (opcional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os compromissos</SelectItem>
                      {agendas.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <ScrollArea className="h-[200px]">
                  <div className="space-y-0.5">
                    {getFilteredCompromissos().map(comp => (
                      <div key={comp.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent/50 transition-colors">
                        <div className="h-7 w-7 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                          <Clock className="h-3.5 w-3.5 text-purple-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{comp.titulo || comp.tipo_servico}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {formatCompromissoDate(comp.data_hora_inicio)}
                            {comp.paciente ? ` • ${comp.paciente}` : ''}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => {
                          const title = comp.titulo || comp.tipo_servico;
                          const dateStr = formatCompromissoDate(comp.data_hora_inicio);
                          onShare('compromisso', comp.id, `📅 ${title} - ${dateStr}${comp.paciente ? ` (${comp.paciente})` : ''}`);
                        }} className="h-6 px-2 text-[10px]">Enviar</Button>
                      </div>
                    ))}
                    {getFilteredCompromissos().length === 0 && <p className="text-center text-muted-foreground py-6 text-xs">Nenhum compromisso futuro</p>}
                  </div>
                </ScrollArea>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

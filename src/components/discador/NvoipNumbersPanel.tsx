import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Phone, Plus, ExternalLink, Wallet, AlertTriangle, Loader2, Trash2, Pencil, Star, MessageCircle, RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const NVOIP_PANEL_URL = 'https://painel.nvoip.com.br';
const LOW_BALANCE_THRESHOLD = 20; // BRL

interface VirtualNumber {
  id: string;
  phone_number: string;
  label: string | null;
  city: string | null;
  state: string | null;
  number_type: string | null;
  whatsapp_enabled: boolean;
  is_default_caller_id: boolean;
  monthly_cost: number | null;
  renewal_date: string | null;
  notes: string | null;
  active: boolean;
}

const emptyForm = {
  phone_number: '',
  label: '',
  city: '',
  state: '',
  number_type: 'fixo',
  whatsapp_enabled: false,
  is_default_caller_id: false,
  monthly_cost: '',
  renewal_date: '',
  notes: '',
};

export const NvoipNumbersPanel: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [numbers, setNumbers] = useState<VirtualNumber[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('nvoip_virtual_numbers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Erro ao carregar números: ' + error.message);
    } else {
      setNumbers((data || []) as VirtualNumber[]);
    }
    setLoading(false);
  }, []);

  const loadBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const { data } = await supabase.functions.invoke('nvoip-call', {
        body: { action: 'account-info' },
      });
      const b = data?.balance;
      const value = b?.balance ?? b?.saldo ?? b?.value ?? b?.amount;
      if (typeof value === 'number') setBalance(value);
      else if (typeof value === 'string') setBalance(parseFloat(value.replace(',', '.')) || null);
      else setBalance(null);
    } catch {
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadBalance();
  }, [load, loadBalance]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (n: VirtualNumber) => {
    setEditingId(n.id);
    setForm({
      phone_number: n.phone_number,
      label: n.label || '',
      city: n.city || '',
      state: n.state || '',
      number_type: n.number_type || 'fixo',
      whatsapp_enabled: n.whatsapp_enabled,
      is_default_caller_id: n.is_default_caller_id,
      monthly_cost: n.monthly_cost?.toString() || '',
      renewal_date: n.renewal_date || '',
      notes: n.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.phone_number.trim()) {
      toast.error('Informe o número virtual');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', user!.id)
        .maybeSingle();
      const companyId = roleRow?.company_id;
      if (!companyId) throw new Error('Empresa não encontrada');

      const payload: any = {
        company_id: companyId,
        phone_number: form.phone_number.replace(/\D/g, ''),
        label: form.label || null,
        city: form.city || null,
        state: form.state || null,
        number_type: form.number_type,
        whatsapp_enabled: form.whatsapp_enabled,
        is_default_caller_id: form.is_default_caller_id,
        monthly_cost: form.monthly_cost ? parseFloat(form.monthly_cost) : null,
        renewal_date: form.renewal_date || null,
        notes: form.notes || null,
        created_by: user!.id,
      };

      // If marking as default, unset others first
      if (form.is_default_caller_id) {
        await supabase
          .from('nvoip_virtual_numbers')
          .update({ is_default_caller_id: false })
          .eq('company_id', companyId);
      }

      if (editingId) {
        const { error } = await supabase
          .from('nvoip_virtual_numbers')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Número atualizado');
      } else {
        const { error } = await supabase
          .from('nvoip_virtual_numbers')
          .insert(payload);
        if (error) throw error;
        toast.success('Número cadastrado');
      }
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este número da lista?')) return;
    const { error } = await supabase.from('nvoip_virtual_numbers').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Número removido');
      load();
    }
  };

  const setDefault = async (n: VirtualNumber) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: roleRow } = await supabase
      .from('user_roles').select('company_id').eq('user_id', user!.id).maybeSingle();
    if (!roleRow?.company_id) return;
    await supabase
      .from('nvoip_virtual_numbers')
      .update({ is_default_caller_id: false })
      .eq('company_id', roleRow.company_id);
    await supabase
      .from('nvoip_virtual_numbers')
      .update({ is_default_caller_id: true })
      .eq('id', n.id);
    toast.success(`${n.phone_number} definido como CallerID padrão`);
    load();
  };

  const lowBalance = balance !== null && balance < LOW_BALANCE_THRESHOLD;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Balance & quick actions */}
      <Card className={lowBalance ? 'border-destructive/50 bg-destructive/5' : ''}>
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center ${lowBalance ? 'bg-destructive/15 text-destructive' : 'bg-primary/10 text-primary'}`}>
              {lowBalance ? <AlertTriangle className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Saldo atual da conta Nvoip</div>
              <div className="text-2xl font-bold">
                {balanceLoading
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : balance !== null
                    ? balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    : '—'}
              </div>
              {lowBalance && (
                <div className="text-xs text-destructive font-medium mt-0.5">
                  Saldo baixo — faça uma recarga para evitar interrupções.
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadBalance} disabled={balanceLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${balanceLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button size="sm" onClick={() => window.open(NVOIP_PANEL_URL, '_blank')}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir painel Nvoip
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Numbers list */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              Meus Números
            </CardTitle>
            <CardDescription>
              Cadastre os números virtuais comprados na Nvoip para visualizar e usá-los como CallerID.
            </CardDescription>
          </div>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" />
            Cadastrar número
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : numbers.length === 0 ? (
            <Alert>
              <AlertDescription>
                Nenhum número cadastrado ainda. Compre seus números virtuais no painel da Nvoip e cadastre-os aqui para usar no CRM.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-3">
              {numbers.map((n) => (
                <div
                  key={n.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-lg border bg-card hover:border-primary/40 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-bold font-mono">{n.phone_number}</span>
                      {n.label && <span className="text-sm text-muted-foreground">— {n.label}</span>}
                      {n.is_default_caller_id && (
                        <Badge className="bg-primary/15 text-primary border-primary/40">
                          <Star className="w-3 h-3 mr-1" />
                          CallerID padrão
                        </Badge>
                      )}
                      {n.whatsapp_enabled && (
                        <Badge variant="outline" className="border-green-500/50 text-green-600">
                          <MessageCircle className="w-3 h-3 mr-1" />
                          WhatsApp
                        </Badge>
                      )}
                      <Badge variant="secondary" className="capitalize">{n.number_type}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                      {(n.city || n.state) && <span>{[n.city, n.state].filter(Boolean).join(' / ')}</span>}
                      {n.monthly_cost !== null && (
                        <span>
                          Mensalidade: {Number(n.monthly_cost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      )}
                      {n.renewal_date && (
                        <span>Renovação: {new Date(n.renewal_date).toLocaleDateString('pt-BR')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!n.is_default_caller_id && (
                      <Button variant="outline" size="sm" onClick={() => setDefault(n)}>
                        <Star className="w-4 h-4 mr-1" />
                        Tornar padrão
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(n)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(n.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar número' : 'Cadastrar novo número'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Número virtual *</Label>
                <Input
                  placeholder="Ex: 1140028922"
                  value={form.phone_number}
                  onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Apelido / Setor</Label>
                <Input
                  placeholder="Ex: Comercial SP"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>UF</Label>
                <Input maxLength={2} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.number_type} onValueChange={(v) => setForm({ ...form, number_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixo">Fixo</SelectItem>
                    <SelectItem value="movel">Móvel</SelectItem>
                    <SelectItem value="0800">0800</SelectItem>
                    <SelectItem value="4003">4003</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Mensalidade (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.monthly_cost}
                  onChange={(e) => setForm({ ...form, monthly_cost: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data de renovação</Label>
                <Input
                  type="date"
                  value={form.renewal_date}
                  onChange={(e) => setForm({ ...form, renewal_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <label className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">CallerID padrão</div>
                  <div className="text-xs text-muted-foreground">Usar este número como origem das ligações.</div>
                </div>
                <Switch
                  checked={form.is_default_caller_id}
                  onCheckedChange={(c) => setForm({ ...form, is_default_caller_id: c })}
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">WhatsApp habilitado</div>
                  <div className="text-xs text-muted-foreground">
                    Marque se este número também está verificado no WhatsApp Business.
                  </div>
                </div>
                <Switch
                  checked={form.whatsapp_enabled}
                  onCheckedChange={(c) => setForm({ ...form, whatsapp_enabled: c })}
                />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? 'Salvar alterações' : 'Cadastrar número'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NvoipNumbersPanel;

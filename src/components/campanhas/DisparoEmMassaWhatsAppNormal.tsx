import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Lead { id: string; name?: string; telefone?: string | null; phone?: string | null }

export function DisparoEmMassaWhatsAppNormal() {
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => { loadCompanyAndLeads(); }, []);

  const loadCompanyAndLeads = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userRole } = await supabase.from('user_roles').select('company_id').eq('user_id', user.id).maybeSingle();
      if (!userRole?.company_id) {
        toast.error('Conta sem empresa vinculada');
        return;
      }
      setCompanyId(userRole.company_id);
      const { data } = await supabase.from('leads').select('id,name,telefone,phone').eq('company_id', userRole.company_id).or('telefone.not.is.null,phone.not.is.null').limit(2000);
      setLeads(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar leads');
    } finally { setLoading(false); }
  };

  const toggle = (id: string) => {
    setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const handleSend = async () => {
    if (!companyId) return toast.error('Empresa não encontrada');
    const targets = leads.filter(l => selected.has(l.id));
    if (targets.length === 0) return toast.error('Selecione pelo menos um lead');
    if (!message.trim()) return toast.error('Digite a mensagem');

    setSending(true);
    const campaignId = `wpp_normal_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;

    const { error: insertError } = await supabase.from('disparo_campaigns').insert({
      id: campaignId,
      company_id: companyId,
      campaign_name: `WPP Normal ${new Date().toLocaleString()}`,
      status: 'pending',
      total_leads: targets.length,
      message_type: 'text',
      message_content: message,
      channel: 'whatsapp_normal',
      leads_data: targets.map(t => ({ id: t.id, name: t.name, telefone: t.telefone, phone: t.phone })),
    });

    if (insertError) {
      console.error(insertError);
      toast.error('Falha ao criar campanha');
      setSending(false);
      return;
    }

    // Invoke edge function that should implement the unofficial WhatsApp sending logic
    supabase.functions.invoke('disparo-em-massa-whatsapp-normal', { body: { campaign_id: campaignId } })
      .then(({ error }) => {
        if (error) {
          console.error('Edge function error', error);
          toast.error('Erro ao iniciar disparo');
        } else {
          toast.success('Disparo iniciado via WhatsApp (normal)');
        }
      }).finally(() => setSending(false));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Send className="h-4 w-4"/> WhatsApp (normal) — Disparo em Massa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Users className="h-4 w-4" />
          <div>{leads.length} leads com telefone</div>
        </div>

        <div>
          <Label>Mensagem</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mensagem a enviar via WhatsApp" />
        </div>

        <div className="max-h-48 overflow-y-auto border rounded p-2">
          {loading ? (
            <div className="p-4 text-center"><Loader2 className="animate-spin mx-auto"/></div>
          ) : leads.map(l => (
            <div key={l.id} className="flex items-center justify-between p-1">
              <div className="truncate">{l.name || 'Sem nome'} — {l.telefone || l.phone}</div>
              <Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggle(l.id)} />
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSend} disabled={sending}>{sending ? 'Enviando...' : 'Iniciar Disparo'}</Button>
          <Button variant="ghost" onClick={() => { setSelected(new Set()); setMessage(''); }}>Limpar</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default DisparoEmMassaWhatsAppNormal;

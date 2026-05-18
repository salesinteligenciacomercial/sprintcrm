import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2, KeyRound, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const NvoipAccountPanel: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [form, setForm] = useState({
    number_sip: '',
    user_token: '',
    napikey: '',
    login_email: '',
    login_password: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('nvoip-call', {
        body: { action: 'get-config' },
      });
      if (error) throw error;
      const cfg = data?.config;
      if (cfg) {
        setForm((f) => ({
          ...f,
          number_sip: cfg.number_sip || '',
          user_token: cfg.has_token ? '••••••••' : '',
          napikey: cfg.napikey || '',
          login_email: cfg.login_email || '',
        }));
        setHasToken(!!cfg.has_token);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.number_sip.trim() || (!hasToken && !form.user_token.trim())) {
      toast.error('Preencha o ID da central e a chave de acesso');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke('nvoip-call', {
        body: {
          action: 'save-config',
          number_sip: form.number_sip,
          user_token: form.user_token,
          napikey: form.napikey,
          login_email: form.login_email,
        },
      });
      if (error) throw error;
      toast.success('Central conectada com sucesso');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('nvoip-call', {
        body: { action: 'test-connection' },
      });
      if (error) throw error;
      toast.success(`Central conectada (ID ${data?.numberSip})`);
    } catch (e: any) {
      toast.error(e.message || 'Falha na conexão');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {hasToken ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <KeyRound className="w-5 h-5 text-primary" />
            )}
            Acesso à Central Telefônica
          </CardTitle>
          <CardDescription>
            {hasToken
              ? 'Sua central está conectada. Você pode atualizar as credenciais quando quiser.'
              : 'Informe as credenciais da sua central telefônica para habilitar ligações dentro do CRM.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="login_email">Email de acesso</Label>
                  <Input
                    id="login_email"
                    type="email"
                    placeholder="seuemail@empresa.com"
                    value={form.login_email}
                    onChange={(e) => setForm({ ...form, login_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login_password">Senha (opcional)</Label>
                  <Input
                    id="login_password"
                    type="password"
                    placeholder="••••••••"
                    value={form.login_password}
                    onChange={(e) => setForm({ ...form, login_password: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="number_sip">ID da Central *</Label>
                  <Input
                    id="number_sip"
                    placeholder="Ex: 137715001"
                    value={form.number_sip}
                    onChange={(e) => setForm({ ...form, number_sip: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user_token">Chave de Acesso *</Label>
                  <Input
                    id="user_token"
                    type="password"
                    placeholder={hasToken ? 'Mantenha em branco para preservar' : 'Cole sua chave'}
                    value={form.user_token}
                    onChange={(e) => setForm({ ...form, user_token: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="napikey">Chave de API (opcional)</Label>
                <Input
                  id="napikey"
                  placeholder="Usada para iniciar chamadas"
                  value={form.napikey}
                  onChange={(e) => setForm({ ...form, napikey: e.target.value })}
                />
              </div>

              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Suas credenciais são armazenadas de forma segura na nossa nuvem e usadas apenas para autenticar
                  ligações em nome da sua empresa. Nenhum dado é compartilhado com terceiros.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {hasToken ? 'Atualizar conexão' : 'Conectar central'}
                </Button>
                <Button variant="outline" onClick={handleTest} disabled={testing || !hasToken}>
                  {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Testar conexão
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NvoipAccountPanel;

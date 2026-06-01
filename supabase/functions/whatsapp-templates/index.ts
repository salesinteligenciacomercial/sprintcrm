import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const META_API_VERSION = 'v18.0';
const META_API_BASE_URL = 'https://graph.facebook.com';

function buildTemplateKey(name: string | null | undefined, language: string | null | undefined) {
  return `${String(name || '').trim().toLowerCase()}::${String(language || '').trim()}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || (req.method === 'GET' ? 'list' : req.method === 'DELETE' ? 'delete' : 'create');
    const companyId = body.company_id;

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'company_id é obrigatório' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`WhatsApp Templates - action: ${action} - Company: ${companyId}`);

    // Buscar conexão Meta da empresa
    const { data: connection, error: connError } = await supabase
      .from('whatsapp_connections')
      .select('meta_phone_number_id, meta_access_token, meta_business_account_id, api_provider')
      .eq('company_id', companyId)
      .in('api_provider', ['meta', 'both'])
      .single();

    if (connError || !connection) {
      console.error('Conexão Meta não encontrada:', connError);
      return new Response(
        JSON.stringify({ error: 'Conexão Meta não configurada' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { meta_access_token, meta_business_account_id } = connection;

    if (!meta_access_token || !meta_business_account_id) {
      return new Response(
        JSON.stringify({ error: 'Credenciais Meta incompletas. Configure o Business Account ID.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar formato do token (deve começar com EAA para WhatsApp Business)
    if (meta_access_token.startsWith('IG')) {
      console.error('Token inválido: token de Instagram detectado em vez de WhatsApp Business');
      return new Response(
        JSON.stringify({ error: 'Token inválido: o Access Token salvo é de Instagram (IG...). Use um token de WhatsApp Business (EAA...) gerado no Meta Developers Portal.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === LIST: Listar templates ===
    if (action === 'list') {
      const syncFromMeta = body.sync === true;
      
      if (syncFromMeta) {
        const metaUrl = `${META_API_BASE_URL}/${META_API_VERSION}/${meta_business_account_id}/message_templates?fields=id,name,status,category,language,components,quality_score`;
        console.log('Sincronizando templates da Meta:', metaUrl);
        
        const metaResponse = await fetch(metaUrl, {
          headers: { 'Authorization': `Bearer ${meta_access_token}` }
        });
        const metaData = await metaResponse.json();
        
        if (!metaResponse.ok) {
          console.error('Erro Meta API:', metaData);
          return new Response(
            JSON.stringify({ error: metaData.error?.message || 'Erro ao buscar templates da Meta' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const templates = metaData.data || [];
        console.log(`Templates encontrados: ${templates.length}`);
        const remoteTemplateKeys = new Set<string>();

        for (const template of templates) {
          remoteTemplateKeys.add(buildTemplateKey(template.name, template.language));

          await supabase
            .from('whatsapp_templates')
            .upsert({
              company_id: companyId,
              meta_template_id: template.id,
              name: template.name,
              language: template.language,
              category: template.category,
              status: template.status,
              components: template.components || [],
              quality_score: template.quality_score?.score,
              synced_at: new Date().toISOString()
            }, {
              onConflict: 'company_id,name,language'
            });
        }

        let removed = 0;
        const { data: localTemplates, error: localTemplatesError } = await supabase
          .from('whatsapp_templates')
          .select('id, name, language')
          .eq('company_id', companyId);

        if (localTemplatesError) {
          console.error('Erro ao listar templates locais para limpeza:', localTemplatesError);
        } else {
          const staleTemplateIds = (localTemplates || [])
            .filter((template) => !remoteTemplateKeys.has(buildTemplateKey(template.name, template.language)))
            .map((template) => template.id);

          if (staleTemplateIds.length > 0) {
            const { error: deleteError } = await supabase
              .from('whatsapp_templates')
              .delete()
              .in('id', staleTemplateIds);

            if (deleteError) {
              console.error('Erro ao remover templates órfãos:', deleteError);
            } else {
              removed = staleTemplateIds.length;
              console.log(`Templates órfãos removidos: ${removed}`);
            }
          }
        }

        return new Response(
          JSON.stringify({ success: true, templates, synced: templates.length, removed }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Buscar templates do banco local
      const { data: localTemplates, error: localError } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (localError) throw localError;

      return new Response(
        JSON.stringify({ templates: localTemplates || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === CREATE: Criar template ===
    if (action === 'create') {
      if (!body.name || !body.category || !body.components) {
        return new Response(
          JSON.stringify({ error: 'name, category e components são obrigatórios' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const templateName = body.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const components: any[] = Array.isArray(body.components) ? [...body.components] : [];

      // Se houver cabeçalho de mídia, faz upload via Resumable Upload API e injeta header_handle
      if (body.header_media_url && body.header_format) {
        try {
          console.log('Fazendo upload da mídia do cabeçalho:', body.header_media_url);

          // 1) Descobrir o app_id do token via debug_token
          const debugRes = await fetch(`${META_API_BASE_URL}/${META_API_VERSION}/debug_token?input_token=${meta_access_token}&access_token=${meta_access_token}`);
          const debugData = await debugRes.json();
          const appId = debugData?.data?.app_id;
          if (!appId) throw new Error('Não foi possível obter o app_id do Access Token. Use um token de App válido.');

          // 2) Baixar o arquivo
          const fileRes = await fetch(body.header_media_url);
          if (!fileRes.ok) throw new Error(`Falha ao baixar arquivo: HTTP ${fileRes.status}`);
          const fileBuf = new Uint8Array(await fileRes.arrayBuffer());
          const contentType = fileRes.headers.get('content-type') || (
            body.header_format === 'IMAGE' ? 'image/jpeg' :
            body.header_format === 'VIDEO' ? 'video/mp4' : 'application/pdf'
          );

          // 3) Iniciar sessão de upload
          const startUrl = `${META_API_BASE_URL}/${META_API_VERSION}/${appId}/uploads?file_length=${fileBuf.byteLength}&file_type=${encodeURIComponent(contentType)}&access_token=${meta_access_token}`;
          const startRes = await fetch(startUrl, { method: 'POST' });
          const startData = await startRes.json();
          if (!startRes.ok || !startData.id) throw new Error(`Erro ao iniciar upload: ${startData?.error?.message || JSON.stringify(startData)}`);

          // 4) Enviar bytes
          const sessionId = startData.id; // "upload:<id>"
          const uploadRes = await fetch(`${META_API_BASE_URL}/${META_API_VERSION}/${sessionId}`, {
            method: 'POST',
            headers: {
              'Authorization': `OAuth ${meta_access_token}`,
              'file_offset': '0',
              'Content-Type': contentType,
            },
            body: fileBuf,
          });
          const uploadData = await uploadRes.json();
          if (!uploadRes.ok || !uploadData.h) throw new Error(`Erro no upload: ${uploadData?.error?.message || JSON.stringify(uploadData)}`);

          const handle = uploadData.h;
          console.log('Handle obtido:', handle);

          // 5) Injetar handle no componente HEADER
          const headerIdx = components.findIndex((c) => c.type === 'HEADER');
          const headerComp = {
            type: 'HEADER',
            format: body.header_format,
            example: { header_handle: [handle] },
          };
          if (headerIdx >= 0) components[headerIdx] = headerComp;
          else components.unshift(headerComp);
        } catch (mediaErr: any) {
          console.error('Erro no upload de mídia:', mediaErr);
          return new Response(
            JSON.stringify({ error: `Falha ao enviar mídia do cabeçalho à Meta: ${mediaErr.message}` }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const metaPayload = {
        name: templateName,
        language: body.language || 'pt_BR',
        category: body.category,
        components,
      };

      console.log('Criando template na Meta:', JSON.stringify(metaPayload, null, 2));

      const metaUrl = `${META_API_BASE_URL}/${META_API_VERSION}/${meta_business_account_id}/message_templates`;
      const metaResponse = await fetch(metaUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${meta_access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metaPayload)
      });

      const metaData = await metaResponse.json();

      if (!metaResponse.ok) {
        console.error('Erro ao criar template:', metaData);
        return new Response(
          JSON.stringify({ 
            error: metaData.error?.message || 'Erro ao criar template',
            details: metaData.error
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Salvar no banco local
      const { data: savedTemplate, error: saveError } = await supabase
        .from('whatsapp_templates')
        .insert({
          company_id: companyId,
          meta_template_id: metaData.id,
          name: templateName,
          language: body.language || 'pt_BR',
          category: body.category,
          status: 'PENDING',
          components,
          synced_at: new Date().toISOString()
        })
        .select()
        .single();

      if (saveError) {
        console.error('Erro ao salvar template localmente:', saveError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          template_id: metaData.id,
          status: metaData.status || 'PENDING',
          local: savedTemplate
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === DELETE: Deletar template ===
    if (action === 'delete') {
      const templateName = body.template_name;

      if (!templateName) {
        return new Response(
          JSON.stringify({ error: 'template_name é obrigatório para deletar' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const metaUrl = `${META_API_BASE_URL}/${META_API_VERSION}/${meta_business_account_id}/message_templates?name=${templateName}`;
      console.log('Deletando template:', templateName);

      let metaDeleteSuccess = false;
      let metaError = null;

      try {
        const metaResponse = await fetch(metaUrl, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${meta_access_token}` }
        });

        const metaData = await metaResponse.json();

        if (metaResponse.ok) {
          metaDeleteSuccess = true;
        } else {
          console.error('Erro ao deletar template na Meta:', metaData);
          metaError = metaData.error?.error_user_msg || metaData.error?.message || 'Erro na Meta API';
          // Se o template não existe na Meta (subcode 2593002), considerar como sucesso
          if (metaData.error?.error_subcode === 2593002) {
            metaDeleteSuccess = true;
            console.log('Template não existe na Meta, removendo apenas localmente');
          }
        }
      } catch (fetchErr) {
        console.error('Erro de rede ao deletar da Meta:', fetchErr);
        // Em caso de erro de rede, ainda permitir deletar localmente
        metaDeleteSuccess = true;
        metaError = 'Erro de rede ao comunicar com a Meta';
      }

      if (!metaDeleteSuccess) {
        return new Response(
          JSON.stringify({ error: metaError || 'Erro ao deletar template' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Remover do banco local
      await supabase
        .from('whatsapp_templates')
        .delete()
        .eq('company_id', companyId)
        .eq('name', templateName);

      return new Response(
        JSON.stringify({ success: true, deleted: templateName }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ação não suportada' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('WhatsApp Templates Error:', error);
    const message = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SupportMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_company_id: string;
  content: string | null;
  message_type: string;
  media_url: string | null;
  file_name: string | null;
  is_read: boolean;
  created_at: string;
  sender_profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface SupportConversation {
  id: string;
  master_company_id: string;
  sub_company_id: string;
  subject: string;
  status: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  sub_company_name?: string;
  unread_count: number;
  last_message_content?: string;
}

export const useSupportChat = () => {
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);
  const [isMasterAccount, setIsMasterAccount] = useState(false);
  const [masterCompanyId, setMasterCompanyId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    init();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    // Get user's company info
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('company_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!roleData) return;
    setCurrentCompanyId(roleData.company_id);

    const { data: companyData } = await supabase
      .from('companies')
      .select('id, is_master_account, parent_company_id')
      .eq('id', roleData.company_id)
      .single();

    if (!companyData) return;

    const isMaster = companyData.is_master_account === true;
    setIsMasterAccount(isMaster);

    if (isMaster) {
      setMasterCompanyId(companyData.id);
    } else if (companyData.parent_company_id) {
      setMasterCompanyId(companyData.parent_company_id);
    }

    await loadConversations(user.id, roleData.company_id, isMaster, companyData.parent_company_id);
    setupRealtime(roleData.company_id, isMaster);
  };

  const loadConversations = async (
    userId: string,
    companyId: string,
    isMaster: boolean,
    parentCompanyId?: string | null
  ) => {
    setLoading(true);
    try {
      let query = supabase
        .from('support_conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (isMaster) {
        query = query.eq('master_company_id', companyId);
      } else {
        query = query.eq('sub_company_id', companyId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with company names and unread counts
      const enriched: SupportConversation[] = [];
      for (const conv of (data || [])) {
        const targetCompanyId = isMaster ? conv.sub_company_id : conv.master_company_id;
        const { data: compData } = await supabase
          .from('companies')
          .select('name')
          .eq('id', targetCompanyId)
          .single();

        // Count unread
        const { count } = await supabase
          .from('support_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('is_read', false)
          .neq('sender_company_id', companyId);

        // Get last message
        const { data: lastMsg } = await supabase
          .from('support_messages')
          .select('content, message_type')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        enriched.push({
          ...conv,
          sub_company_name: compData?.name || 'Empresa',
          unread_count: count || 0,
          last_message_content: lastMsg?.message_type === 'text'
            ? lastMsg?.content || ''
            : lastMsg?.message_type === 'audio' ? '🎤 Áudio' : '📎 Arquivo',
        });
      }

      setConversations(enriched);
    } catch (err) {
      console.error('Error loading support conversations:', err);
    }
    setLoading(false);
  };

  const setupRealtime = (companyId: string, isMaster: boolean) => {
    const channel = supabase
      .channel('support-chat-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, () => {
        // Reload conversations on any message change
        if (currentUserId) {
          loadConversations(currentUserId, companyId, isMaster);
        }
      })
      .subscribe();
    channelRef.current = channel;
  };

  const getOrCreateConversation = useCallback(async (subCompanyId: string): Promise<string | null> => {
    if (!masterCompanyId) return null;

    // Check existing
    const { data: existing } = await supabase
      .from('support_conversations')
      .select('id')
      .eq('master_company_id', masterCompanyId)
      .eq('sub_company_id', subCompanyId)
      .single();

    if (existing) return existing.id;

    // Create new
    const { data: newConv, error } = await supabase
      .from('support_conversations')
      .insert({
        master_company_id: masterCompanyId,
        sub_company_id: subCompanyId,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating support conversation:', error);
      return null;
    }
    return newConv?.id || null;
  }, [masterCompanyId]);

  const getTotalUnread = useCallback(() => {
    return conversations.reduce((sum, c) => sum + c.unread_count, 0);
  }, [conversations]);

  const refresh = useCallback(async () => {
    if (currentUserId && currentCompanyId) {
      await loadConversations(currentUserId, currentCompanyId, isMasterAccount);
    }
  }, [currentUserId, currentCompanyId, isMasterAccount]);

  return {
    conversations,
    loading,
    currentUserId,
    currentCompanyId,
    isMasterAccount,
    masterCompanyId,
    getTotalUnread,
    getOrCreateConversation,
    refresh,
  };
};

// Hook for messages within a support conversation
export const useSupportMessages = (conversationId: string | null) => {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: role } = await supabase
          .from('user_roles')
          .select('company_id')
          .eq('user_id', user.id)
          .limit(1)
          .single();
        if (role) setCurrentCompanyId(role.company_id);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!conversationId) { setMessages([]); return; }
    loadMessages();
    const cleanup = setupRealtime();
    return cleanup;
  }, [conversationId]);

  const loadMessages = async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .range(0, 200);

      if (error) throw error;

      // Enrich with sender profiles
      const enriched: SupportMessage[] = [];
      for (const msg of (data || [])) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', msg.sender_id)
          .single();
        enriched.push({ ...msg, sender_profile: profile || undefined });
      }
      setMessages(enriched);
    } catch (err) {
      console.error('Error loading support messages:', err);
    }
    setLoading(false);
  };

  const setupRealtime = () => {
    if (!conversationId) return () => {};
    const channel = supabase
      .channel(`support-msgs-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload) => {
        const newMsg = payload.new as any;
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', newMsg.sender_id)
          .single();
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, { ...newMsg, sender_profile: profile || undefined }];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const sendMessage = useCallback(async (
    content: string,
    messageType: string = 'text',
    mediaUrl?: string,
    fileName?: string
  ): Promise<boolean> => {
    if (!conversationId || !currentUserId || !currentCompanyId) return false;
    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          sender_company_id: currentCompanyId,
          content,
          message_type: messageType,
          media_url: mediaUrl || null,
          file_name: fileName || null,
        });
      if (error) throw error;

      // Update conversation timestamp
      await supabase
        .from('support_conversations')
        .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      return true;
    } catch (err) {
      console.error('Error sending support message:', err);
      return false;
    }
  }, [conversationId, currentUserId, currentCompanyId]);

  const uploadMedia = useCallback(async (file: File): Promise<string | null> => {
    if (!currentUserId) return null;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `support/${currentUserId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('internal-chat-media')
        .upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('internal-chat-media')
        .getPublicUrl(fileName);
      return publicUrl;
    } catch (err) {
      console.error('Upload error:', err);
      return null;
    }
  }, [currentUserId]);

  const markAsRead = useCallback(async () => {
    if (!conversationId || !currentCompanyId) return;
    await supabase
      .from('support_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_company_id', currentCompanyId)
      .eq('is_read', false);
  }, [conversationId, currentCompanyId]);

  return { messages, loading, sendMessage, uploadMedia, markAsRead };
};

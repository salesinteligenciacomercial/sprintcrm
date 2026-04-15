
-- Support chat conversations between master admin and sub-accounts
CREATE TABLE public.support_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  master_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sub_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subject TEXT DEFAULT 'Suporte Técnico',
  status TEXT NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(master_company_id, sub_company_id)
);

-- Support messages
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  media_url TEXT,
  file_name TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- RLS for support_conversations: users can see conversations where their company is master or sub
CREATE POLICY "Users can view their support conversations"
  ON public.support_conversations FOR SELECT TO authenticated
  USING (
    master_company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
    OR sub_company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Master admin can create support conversations"
  ON public.support_conversations FOR INSERT TO authenticated
  WITH CHECK (
    master_company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
    OR sub_company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their support conversations"
  ON public.support_conversations FOR UPDATE TO authenticated
  USING (
    master_company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
    OR sub_company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  );

-- RLS for support_messages: users can see messages in conversations they have access to
CREATE POLICY "Users can view support messages"
  ON public.support_messages FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM public.support_conversations
      WHERE master_company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
         OR sub_company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can send support messages"
  ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT id FROM public.support_conversations
      WHERE master_company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
         OR sub_company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update read status"
  ON public.support_messages FOR UPDATE TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM public.support_conversations
      WHERE master_company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
         OR sub_company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations;

-- Index for performance
CREATE INDEX idx_support_messages_conversation ON public.support_messages(conversation_id, created_at);
CREATE INDEX idx_support_conversations_companies ON public.support_conversations(master_company_id, sub_company_id);

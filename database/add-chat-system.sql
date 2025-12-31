-- Create chat_messages table for direct messages between users
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id SERIAL PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_online_status table to track who is online
CREATE TABLE IF NOT EXISTS public.user_online_status (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_online BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver ON public.chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages(sender_id, receiver_id);

-- Enable Row Level Security
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_online_status ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update their own received messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view all online statuses" ON public.user_online_status;
DROP POLICY IF EXISTS "Users can update their own status" ON public.user_online_status;

-- RLS Policies for chat_messages
CREATE POLICY "Users can view their own messages" ON public.chat_messages
    FOR SELECT USING (
        auth.uid() = sender_id OR auth.uid() = receiver_id
    );

CREATE POLICY "Users can send messages" ON public.chat_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
    );

CREATE POLICY "Users can update their own received messages" ON public.chat_messages
    FOR UPDATE USING (
        auth.uid() = receiver_id
    );

-- RLS Policies for user_online_status
CREATE POLICY "Users can view all online statuses" ON public.user_online_status
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own status" ON public.user_online_status
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own status" ON public.user_online_status
    FOR UPDATE USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp for chat_messages
DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON public.chat_messages;
CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE
    ON public.chat_messages FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Add trigger to update updated_at timestamp for user_online_status
DROP TRIGGER IF EXISTS update_user_online_status_updated_at ON public.user_online_status;
CREATE TRIGGER update_user_online_status_updated_at BEFORE UPDATE
    ON public.user_online_status FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.chat_messages IS 'Direct messages between users';
COMMENT ON TABLE public.user_online_status IS 'Tracks user online/offline status';
COMMENT ON COLUMN public.chat_messages.is_read IS 'Whether the message has been read by receiver';
COMMENT ON COLUMN public.user_online_status.is_online IS 'Whether user is currently online';
COMMENT ON COLUMN public.user_online_status.last_seen IS 'Last time user was seen online';

-- Add file attachment support to chat messages
-- Run this in Supabase SQL Editor after running add-chat-system.sql

-- Add file attachment columns to chat_messages table
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS file_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text';

-- Update message column to allow null for file-only messages
ALTER TABLE public.chat_messages 
ALTER COLUMN message DROP NOT NULL;

-- Add constraint to ensure either message or file exists
ALTER TABLE public.chat_messages 
ADD CONSTRAINT check_message_or_file 
CHECK (
  (message IS NOT NULL AND message != '') OR 
  (file_url IS NOT NULL AND file_name IS NOT NULL)
);

-- Create index for message_type for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_type ON public.chat_messages(message_type);

-- Add comment to table
COMMENT ON TABLE public.chat_messages IS 'Chat messages with support for text messages and file attachments';
COMMENT ON COLUMN public.chat_messages.message_type IS 'Type of message: text, file, image, video, document';
COMMENT ON COLUMN public.chat_messages.file_url IS 'URL to file in Supabase storage';
COMMENT ON COLUMN public.chat_messages.file_name IS 'Original filename with extension';
COMMENT ON COLUMN public.chat_messages.file_size IS 'File size in bytes';
COMMENT ON COLUMN public.chat_messages.file_type IS 'MIME type of the file';
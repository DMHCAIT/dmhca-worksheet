-- Add work log attachments table
CREATE TABLE IF NOT EXISTS public.work_log_attachments (
    id SERIAL PRIMARY KEY,
    work_log_id INTEGER REFERENCES public.daily_work_logs(id) ON DELETE CASCADE NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(100),
    uploaded_by UUID REFERENCES public.profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.work_log_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for work_log_attachments
CREATE POLICY "Users can view work log attachments" 
ON public.work_log_attachments FOR SELECT 
USING (
  auth.uid() = uploaded_by OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'team_lead')
  )
);

CREATE POLICY "Users can insert their own work log attachments" 
ON public.work_log_attachments FOR INSERT 
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own work log attachments"
ON public.work_log_attachments FOR DELETE 
USING (auth.uid() = uploaded_by);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_work_log_attachments_work_log_id ON public.work_log_attachments(work_log_id);
CREATE INDEX IF NOT EXISTS idx_work_log_attachments_uploaded_by ON public.work_log_attachments(uploaded_by);

-- Add comment
COMMENT ON TABLE public.work_log_attachments IS 'Stores file attachments for daily work logs';

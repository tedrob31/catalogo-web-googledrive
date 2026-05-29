-- Ejecuta esto en tu panel de Supabase (SQL Editor)

CREATE TABLE IF NOT EXISTS public.user_google_tokens (
    user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.user_google_tokens ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
-- Permitir al usuario ver y actualizar su propio token (usado por el cliente web durante el callback)
CREATE POLICY "Users can view their own tokens"
    ON public.user_google_tokens
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update their own tokens"
    ON public.user_google_tokens
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Permitir acceso de lectura a través del Service Role (para el Cron Job del backend)
CREATE POLICY "Service Role has full access"
    ON public.user_google_tokens
    FOR ALL
    USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

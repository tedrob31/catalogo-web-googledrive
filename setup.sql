-- Ya no se utiliza la tabla user_google_tokens.
-- Los tokens de Google se guardan directamente en los metadatos de Supabase Auth (auth.users.raw_user_meta_data).
-- Si habías creado la tabla antes, puedes eliminarla con este comando:

DROP TABLE IF EXISTS public.user_google_tokens;

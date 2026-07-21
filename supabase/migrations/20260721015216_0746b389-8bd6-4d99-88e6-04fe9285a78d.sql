
-- Enums
CREATE TYPE public.project_status AS ENUM ('ativo', 'pausado', 'concluido', 'arquivado');
CREATE TYPE public.project_priority AS ENUM ('baixa', 'media', 'alta', 'critica');
CREATE TYPE public.briefing_periodo AS ENUM ('manha', 'tarde', 'noite');
CREATE TYPE public.post_platform AS ENUM ('instagram', 'tiktok');
CREATE TYPE public.post_status AS ENUM ('ideia', 'rascunho', 'aprovado', 'publicado');

-- Shared trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  elevenlabs_voice_id TEXT DEFAULT 'JBFqnCBsd6RMkjVDRZzb',
  lev_tone TEXT DEFAULT 'estrategico',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.settings (user_id, config) VALUES (NEW.id, '{}'::jsonb) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  status public.project_status NOT NULL DEFAULT 'ativo',
  prioridade public.project_priority NOT NULL DEFAULT 'media',
  progresso INT NOT NULL DEFAULT 0 CHECK (progresso BETWEEN 0 AND 100),
  proximas_acoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own projects" ON public.projects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Project updates
CREATE TABLE public.project_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL,
  ai_analysis TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_updates TO authenticated;
GRANT ALL ON public.project_updates TO service_role;
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own project updates" ON public.project_updates FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Briefings
CREATE TABLE public.briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  periodo public.briefing_periodo NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  conteudo JSONB NOT NULL DEFAULT '{}'::jsonb,
  audio_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefings TO authenticated;
GRANT ALL ON public.briefings TO service_role;
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own briefings" ON public.briefings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Posts (Redes Sociais)
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plataforma public.post_platform NOT NULL,
  status public.post_status NOT NULL DEFAULT 'ideia',
  titulo TEXT NOT NULL,
  caption TEXT,
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  script TEXT,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own posts" ON public.posts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_posts_updated BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Settings
CREATE TABLE public.settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own settings" ON public.settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

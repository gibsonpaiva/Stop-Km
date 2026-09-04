-- ==============================================================================
-- STOPKM - ESTRUTURA DO BANCO DE DADOS SUPABASE
-- Execute este script no menu "SQL Editor" do seu painel Supabase
-- ==============================================================================

-- 1. Criação da Tabela de Rotas (routes)
CREATE TABLE IF NOT EXISTS public.routes (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    start_time TEXT,
    end_time TEXT,
    duration_formatted TEXT,
    duration_hours NUMERIC,
    start_km NUMERIC DEFAULT 0,
    end_km NUMERIC DEFAULT 0,
    total_km NUMERIC DEFAULT 0,
    stops INTEGER DEFAULT 0,
    packages INTEGER DEFAULT 0,
    fuel_cost NUMERIC DEFAULT 0,
    is_sunday_rate BOOLEAN DEFAULT false,
    rate_per_package NUMERIC DEFAULT 2.50,
    base_rate NUMERIC DEFAULT 2.50,
    sunday_rate NUMERIC DEFAULT 4.00,
    gross_earnings NUMERIC DEFAULT 0,
    net_profit NUMERIC DEFAULT 0,
    fuel_cost_per_km NUMERIC DEFAULT 0,
    efficiency_per_km NUMERIC DEFAULT 0,
    density_per_stop NUMERIC DEFAULT 0,
    hourly_gross NUMERIC DEFAULT 0,
    hourly_net NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para buscas rápidas por data e ordenação histórica
CREATE INDEX IF NOT EXISTS idx_routes_date ON public.routes(date DESC);
CREATE INDEX IF NOT EXISTS idx_routes_created_at ON public.routes(created_at DESC);

-- 2. Criação da Tabela de Configurações (settings)
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'app_settings',
    base_package_rate NUMERIC DEFAULT 2.50,
    sunday_package_rate NUMERIC DEFAULT 4.00,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir configuração padrão inicial caso não exista
INSERT INTO public.settings (id, base_package_rate, sunday_package_rate, updated_at)
VALUES ('app_settings', 2.50, 4.00, now())
ON CONFLICT (id) DO NOTHING;

-- 3. Habilitação de Segurança (Row Level Security - RLS)
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Acesso Total via Publishable Key (sb_publishable_...)
DROP POLICY IF EXISTS "Permitir acesso total rotas" ON public.routes;
CREATE POLICY "Permitir acesso total rotas" 
ON public.routes 
FOR ALL 
TO anon, authenticated
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir acesso total configuracoes" ON public.settings;
CREATE POLICY "Permitir acesso total configuracoes" 
ON public.settings 
FOR ALL 
TO anon, authenticated
USING (true) 
WITH CHECK (true);

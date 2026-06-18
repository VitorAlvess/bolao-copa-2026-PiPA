-- ==========================================
-- SCRIPT DE BANCO DE DADOS: BOLÃO COPA 2026
-- Execute este script no SQL Editor do seu projeto Supabase
-- ==========================================

-- 1. Tabela do Gabarito Oficial (Resultados Reais)
CREATE TABLE IF NOT EXISTS public.gabarito (
    id integer PRIMARY KEY DEFAULT 1,
    results jsonb NOT NULL DEFAULT '{}'::jsonb,
    guesses_locked boolean NOT NULL DEFAULT false,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT single_row CHECK (id = 1) -- Garante que haverá apenas uma linha no gabarito
);

-- 2. Tabela de Palpites dos Usuários
CREATE TABLE IF NOT EXISTS public.user_guesses (
    username text PRIMARY KEY,
    guesses jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar acesso público de leitura e escrita (Sem autenticação complexa para simplificar para os amigos)
-- Nota: Como o bolão é informal entre amigos, desativamos ou permitimos acesso irrestrito para simplificar.
ALTER TABLE public.gabarito DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_guesses DISABLE ROW LEVEL SECURITY;

-- 3. Inserir dados iniciais para o Gabarito (caso não exista)
INSERT INTO public.gabarito (id, results) 
VALUES (1, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 4. Inserir dados iniciais para os novos participantes (Ale, Gustavo, Leticia, Bah, Bia, Dani, Denys, Drica, Emilly, Heloisa, Karen, Rafa, Stella, Valeria, Vitoria, Zé, Carli, Janaina, Marjory)
INSERT INTO public.user_guesses (username, guesses) VALUES
('Ale', '{}'::jsonb),
('Gustavo', '{}'::jsonb),
('Leticia', '{}'::jsonb),
('Bah', '{}'::jsonb),
('Bia', '{}'::jsonb),
('Dani', '{}'::jsonb),
('Denys', '{}'::jsonb),
('Drica', '{}'::jsonb),
('Emilly', '{}'::jsonb),
('Heloisa', '{}'::jsonb),
('Karen', '{}'::jsonb),
('Rafa', '{}'::jsonb),
('Stella', '{}'::jsonb),
('Valeria', '{}'::jsonb),
('Vitoria', '{}'::jsonb),
('Carli', '{}'::jsonb),
('Janaina', '{}'::jsonb),
('Marjory', '{}'::jsonb),
('Zé', '{"A_1_1":{"away":1,"home":3},"A_1_2":{"away":0,"home":1},"A_2_1":{"away":0,"home":2},"A_2_2":{"away":1,"home":0},"A_3_1":{"away":0,"home":3},"A_3_2":{"away":2,"home":0},"B_1_1":{"away":0,"home":2},"B_1_2":{"away":3,"home":0},"B_2_1":{"away":0,"home":2},"B_2_2":{"away":2,"home":0},"B_3_1":{"away":2,"home":2},"B_3_2":{"away":2,"home":2},"C_1_1":{"away":1,"home":2},"C_1_2":{"away":2,"home":0},"C_2_1":{"away":0,"home":4},"C_2_2":{"away":1,"home":1},"C_3_1":{"away":0,"home":2},"C_3_2":{"away":0,"home":3},"D_1_1":{"away":1,"home":2},"D_1_2":{"away":1,"home":0},"D_2_1":{"away":0,"home":3},"D_2_2":{"away":1,"home":0},"D_3_1":{"away":1,"home":1},"D_3_2":{"away":0,"home":2},"E_1_1":{"away":0,"home":5},"E_1_2":{"away":2,"home":1},"E_2_1":{"away":1,"home":2},"E_2_2":{"away":2,"home":0},"E_3_1":{"away":1,"home":3},"E_3_2":{"away":2,"home":0},"F_1_1":{"away":0,"home":1},"F_1_2":{"away":1,"home":1},"F_2_1":{"away":0,"home":2},"F_2_2":{"away":1,"home":1},"F_3_1":{"away":0,"home":2},"F_3_2":{"away":0,"home":2},"G_1_1":{"away":1,"home":2},"G_1_2":{"away":0,"home":2},"G_2_1":{"away":0,"home":2},"G_2_2":{"away":0,"home":2},"G_3_1":{"away":0,"home":3},"G_3_2":{"away":1,"home":2},"H_1_1":{"away":0,"home":3},"H_1_2":{"away":2,"home":1},"H_2_1":{"away":0,"home":3},"H_2_2":{"away":2,"home":0},"H_3_1":{"away":1,"home":2},"H_3_2":{"away":1,"home":0},"I_1_1":{"away":0,"home":3},"I_1_2":{"away":2,"home":0},"I_2_1":{"away":0,"home":4},"I_2_2":{"away":2,"home":0},"I_3_1":{"away":1,"home":2},"I_3_2":{"away":1,"home":2},"J_1_1":{"away":0,"home":3},"J_1_2":{"away":0,"home":2},"J_2_1":{"away":0,"home":3},"J_2_2":{"away":1,"home":1},"J_3_1":{"away":0,"home":4},"J_3_2":{"away":2,"home":0},"K_1_1":{"away":0,"home":3},"K_1_2":{"away":0,"home":3},"K_2_1":{"away":3,"home":1},"K_2_2":{"away":1,"home":1},"K_3_1":{"away":1,"home":3},"K_3_2":{"away":4,"home":0},"L_1_1":{"away":1,"home":2},"L_1_2":{"away":1,"home":0},"L_2_1":{"away":1,"home":2},"L_2_2":{"away":1,"home":3},"L_3_1":{"away":1,"home":3},"L_3_2":{"away":1,"home":3}}'::jsonb)
ON CONFLICT (username) DO UPDATE SET guesses = EXCLUDED.guesses;


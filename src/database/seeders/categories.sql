-- ==========================================================
-- SEED DATA: CATEGORIAS PADRÃO
-- (user_id é NULL para aparecer para todos os usuários)
-- ==========================================================

INSERT INTO categories (name, icon, type, color, user_id) VALUES
-- DESPESAS (Cores quentes/neutras)
('Alimentação', 'restaurant', 'expense', '#ef4444', NULL),    -- Vermelho
('Transporte', 'directions-bus', 'expense', '#3b82f6', NULL),  -- Azul
('Casa', 'home', 'expense', '#f59e0b', NULL),                  -- Laranja
('Compras', 'shopping-cart', 'expense', '#ec4899', NULL),      -- Rosa
('Saúde', 'local-hospital', 'expense', '#ef4444', NULL),       -- Vermelho
('Lazer', 'movie', 'expense', '#8b5cf6', NULL),                -- Roxo
('Educação', 'school', 'expense', '#6366f1', NULL),            -- Índigo
('Outros', 'more-horiz', 'expense', '#64748b', NULL),          -- Cinza

-- RECEITAS (Cores frias/verdes)
('Salário', 'attach-money', 'income', '#22c55e', NULL),        -- Verde
('Freelance', 'computer', 'income', '#06b6d4', NULL),          -- Ciano
('Investimento', 'trending-up', 'income', '#8b5cf6', NULL),    -- Roxo
('Presente', 'card-giftcard', 'income', '#f43f5e', NULL),      -- Rosa avermelhado
('Outros', 'more-horiz', 'income', '#64748b', NULL);           -- Cinza
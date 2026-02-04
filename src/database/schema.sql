-- ==========================================================
-- GESTIO - SETUP SCRIPT (RESET & CREATE)
-- ==========================================================

DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS debts CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==========================================================
-- 1. USERS
-- ==========================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL, 
    password TEXT, 
    avatar TEXT, 
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 2. WALLETS
-- ==========================================================
CREATE TABLE wallets (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    balance NUMERIC(12,2) DEFAULT 0.00,
    color VARCHAR(7) DEFAULT '#1773cf', 
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 3. CATEGORIES
-- ==========================================================
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE, 
    name VARCHAR(50) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    color VARCHAR(7) DEFAULT '#94a3b8',
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 4. TRANSACTIONS
-- ==========================================================
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    wallet_id INT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    description TEXT,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para Performance do Extrato
CREATE INDEX idx_transactions_wallet_date ON transactions(wallet_id, transaction_date DESC);
CREATE INDEX idx_transactions_category ON transactions(category_id);

-- ==========================================================
-- 5. DEBTS (Dívidas e Empréstimos)
-- ==========================================================
CREATE TABLE debts (
    id SERIAL PRIMARY KEY,
    wallet_id INT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('payable', 'receivable')),
    title VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMPTZ, 
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_debts_wallet_status ON debts(wallet_id, is_paid);
CREATE INDEX idx_debts_due_date ON debts(due_date);

-- ==========================================================
-- 6. GOALS (Objetivos)
-- ==========================================================
CREATE TABLE goals (
    id SERIAL PRIMARY KEY,
    wallet_id INT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    target_amount NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
    current_amount NUMERIC(12,2) DEFAULT 0.00 CHECK (current_amount >= 0),
    deadline DATE,
    color VARCHAR(7) DEFAULT '#1773cf',
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 7. SEED DATA (Categorias Padrão)
-- ==========================================================
INSERT INTO categories (name, icon, type, color, user_id) VALUES
-- Despesas
('Alimentação', 'restaurant', 'expense', '#ef4444', NULL),
('Transporte', 'directions-bus', 'expense', '#3b82f6', NULL),
('Casa', 'home', 'expense', '#f59e0b', NULL),
('Compras', 'shopping-cart', 'expense', '#ec4899', NULL),
('Saúde', 'local-hospital', 'expense', '#ef4444', NULL),
('Lazer', 'movie', 'expense', '#8b5cf6', NULL),
('Educação', 'school', 'expense', '#6366f1', NULL),
('Outros', 'more-horiz', 'expense', '#64748b', NULL),
-- Receitas
('Salário', 'attach-money', 'income', '#22c55e', NULL),
('Freelance', 'computer', 'income', '#06b6d4', NULL),
('Investimento', 'trending-up', 'income', '#8b5cf6', NULL),
('Presente', 'card-giftcard', 'income', '#f43f5e', NULL),
('Outros', 'more-horiz', 'income', '#64748b', NULL);
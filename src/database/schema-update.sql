-- ==========================================================
-- GESTIO - SETUP SCRIPT (RESET & CREATE) - VERSÃO OFFLINE-FIRST
-- ==========================================================

DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS debts CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==========================================================
-- 1. USERS
-- ==========================================================
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL, 
    password TEXT, 
    avatar TEXT, 
    settings TEXT, -- Alterado para TEXT para casar com o WatermelonDB
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==========================================================
-- 2. WALLETS
-- ==========================================================
CREATE TABLE wallets (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    balance NUMERIC(12,2) DEFAULT 0.00,
    color VARCHAR(7) DEFAULT '#1773cf', 
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==========================================================
-- 3. CATEGORIES
-- ==========================================================
CREATE TABLE categories (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE, 
    name VARCHAR(50) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'debts', 'investment', 'goals')),
    color VARCHAR(7) DEFAULT '#94a3b8',
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==========================================================
-- 4. DEBTS (Dívidas e Empréstimos)
-- ==========================================================
CREATE TABLE debts (
    id VARCHAR(255) PRIMARY KEY,
    wallet_id VARCHAR(255) NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('payable', 'receivable')),
    title VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    total_paid NUMERIC(12,2) DEFAULT 0,
    due_date DATE NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMPTZ, 
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_debts_wallet_status ON debts(wallet_id, is_paid);
CREATE INDEX idx_debts_due_date ON debts(due_date);

-- ==========================================================
-- 5. GOALS (Objetivos)
-- ==========================================================
CREATE TABLE goals (
    id VARCHAR(255) PRIMARY KEY,
    wallet_id VARCHAR(255) NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    target_amount NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
    current_amount NUMERIC(12,2) DEFAULT 0.00 CHECK (current_amount >= 0),
    deadline DATE,
    color VARCHAR(7) DEFAULT '#1773cf',
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==========================================================
-- 6. TRANSACTIONS
-- ==========================================================
CREATE TABLE transactions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id VARCHAR(255) NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    category_id VARCHAR(255) REFERENCES categories(id) ON DELETE SET NULL,
    debt_id VARCHAR(255) REFERENCES debts(id) ON DELETE SET NULL, 
    goal_id VARCHAR(255) REFERENCES goals(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    description TEXT,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    category_name VARCHAR(50), -- NOVO: Adicionado para casar com WMDB
    category_icon VARCHAR(50), -- NOVO: Adicionado para casar com WMDB
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_transactions_wallet_date ON transactions(wallet_id, transaction_date DESC);
CREATE INDEX idx_transactions_category ON transactions(category_id);

-- ==========================================================
-- 7. SEED DATA (Categorias Padrão Exatamente Iguais ao App)
-- ==========================================================
-- Usamos um gerador de UUID nativo do Postgres para os IDs das categorias globais
INSERT INTO categories (id, name, icon, type, color, user_id) VALUES
-- Despesas
(gen_random_uuid()::varchar, 'Alimentação', 'restaurant', 'expense', '#ef4444', NULL),
(gen_random_uuid()::varchar, 'Transporte', 'directions-bus', 'expense', '#3b82f6', NULL),
(gen_random_uuid()::varchar, 'Casa', 'home', 'expense', '#f59e0b', NULL),
(gen_random_uuid()::varchar, 'Compras', 'shopping-cart', 'expense', '#ec4899', NULL),
(gen_random_uuid()::varchar, 'Saúde', 'local-hospital', 'expense', '#ef4444', NULL),
(gen_random_uuid()::varchar, 'Lazer', 'movie', 'expense', '#8b5cf6', NULL),
(gen_random_uuid()::varchar, 'Educação', 'school', 'expense', '#6366f1', NULL),
(gen_random_uuid()::varchar, 'Outros', 'more-horiz', 'expense', '#64748b', NULL),
-- Receitas
(gen_random_uuid()::varchar, 'Salário', 'attach-money', 'income', '#22c55e', NULL),
(gen_random_uuid()::varchar, 'Freelance', 'computer', 'income', '#06b6d4', NULL),
(gen_random_uuid()::varchar, 'Investimento', 'trending-up', 'income', '#8b5cf6', NULL),
(gen_random_uuid()::varchar, 'Presente', 'card-giftcard', 'income', '#f43f5e', NULL),
-- Dívidas
(gen_random_uuid()::varchar, 'Dívida', 'receipt-long', 'debts', '#fa6238', NULL),
(gen_random_uuid()::varchar, 'Empréstimo', 'handshake', 'debts', '#1773cf', NULL),
-- Investimento/Objetivos
(gen_random_uuid()::varchar, 'Objetivo', 'savings', 'goals', '#0bda5b', NULL);
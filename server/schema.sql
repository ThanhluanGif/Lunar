-- PostgreSQL Production Schema DDL for Lunar Code Review
-- Phase 1 & Phase 2 Migration Script

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table with Role-Based Access Control (RBAC)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nickname VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    tier VARCHAR(20) DEFAULT 'FREE' CHECK (tier IN ('FREE', 'PRO', 'ENTERPRISE')),
    karma_points INT DEFAULT 100,
    daily_scans_used INT DEFAULT 0,
    last_scan_reset_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    repo_url TEXT,
    language VARCHAR(50) DEFAULT 'TypeScript',
    security_score INT DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- 3. Scans Table
CREATE TABLE IF NOT EXISTS scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    score INT NOT NULL,
    issues_count INT DEFAULT 0,
    ai_model_used VARCHAR(50) DEFAULT 'lunar-ai-v3',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);

-- 4. Vulnerabilities Table
CREATE TABLE IF NOT EXISTS vulnerabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
    cve_id VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('critical', 'warning', 'info')),
    line_number INT,
    code_snippet TEXT,
    suggested_patch TEXT,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'patched', 'ignored')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Quota Audit Logs Table
CREATE TABLE IF NOT EXISTS quota_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    scans_added INT DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

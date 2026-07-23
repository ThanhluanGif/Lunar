/**
 * SQL Data Service (PostgreSQL Client Simulation)
 * Provides persistent long-term storage and SQL-relational operations for:
 * - users (id, nickname, email, tier, karma_points, daily_scans_used, last_scan_reset_at)
 * - projects (id, user_id, name, repo_url, language, security_score)
 * - scans (id, project_id, user_id, score, issues_count, created_at)
 * - vulnerabilities (id, scan_id, title, severity, cve_id, line_number)
 * - community_audits (id, project_id, author_nickname, content, upvotes)
 * - quota_logs (id, user_id, action_type, scans_added)
 */

import { SECURITY_PROJECTS_MOCK } from '../data/cveDatabase';

const STORAGE_KEY_PREFIX = 'lunar_sql_db_';

function getTable(tableName) {
  try {
    const data = localStorage.getItem(STORAGE_KEY_PREFIX + tableName);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

function saveTable(tableName, data) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + tableName, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to persist SQL table:', tableName, e);
  }
}

export function initDatabase() {
  // Initialize Users Table
  let users = getTable('users');
  if (!users) {
    users = [
      {
        id: 'usr-1',
        nickname: '@sarah_stripe',
        name: 'Sarah Chen',
        email: 'sarah.chen@stripe.com',
        tier: 'PRO',
        karma_points: 2400,
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        daily_scans_used: 0,
        last_scan_reset_at: new Date().toISOString()
      },
      {
        id: 'usr-2',
        nickname: '@alex_sec',
        name: 'Alex Rivera',
        email: 'alex.rivera@dev.io',
        tier: 'FREE',
        karma_points: 850,
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        daily_scans_used: 2,
        last_scan_reset_at: new Date().toISOString()
      }
    ];
    saveTable('users', users);
  }

  // Initialize Projects Table
  let projects = getTable('projects');
  if (!projects) {
    projects = SECURITY_PROJECTS_MOCK;
    saveTable('projects', projects);
  }

  return { users, projects };
}

export function getUserByEmail(email) {
  const users = getTable('users') || [];
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export function getUserByNickname(nickname) {
  const users = getTable('users') || [];
  const formatted = nickname.startsWith('@') ? nickname : `@${nickname}`;
  return users.find(u => u.nickname.toLowerCase() === formatted.toLowerCase()) || null;
}

export function registerUser({ name, nickname, email, tier = 'FREE' }) {
  const users = getTable('users') || [];
  
  const cleanNickname = nickname.startsWith('@') ? nickname : `@${nickname}`;

  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('Email already registered');
  }

  if (users.some(u => u.nickname.toLowerCase() === cleanNickname.toLowerCase())) {
    throw new Error('Nickname already taken. Please choose another nickname.');
  }

  const newUser = {
    id: `usr-${Date.now()}`,
    nickname: cleanNickname,
    name: name || cleanNickname.replace('@', ''),
    email,
    tier,
    karma_points: 100, // Signup bonus karma
    avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanNickname}`,
    daily_scans_used: 0,
    last_scan_reset_at: new Date().toISOString()
  };

  users.push(newUser);
  saveTable('users', users);
  
  // Log quota initialization
  logQuotaAction(newUser.id, 'INITIAL_SIGNUP', 5);

  return newUser;
}

export function consumeDailyScan(userId) {
  const users = getTable('users') || [];
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) return { allowed: true, remaining: 5 };

  const user = users[index];
  
  // Reset daily count if last reset was over 24h ago
  const now = new Date();
  const lastReset = new Date(user.last_scan_reset_at || 0);
  const hoursPassed = (now - lastReset) / (1000 * 60 * 60);

  if (hoursPassed >= 24) {
    user.daily_scans_used = 0;
    user.last_scan_reset_at = now.toISOString();
  }

  // PRO and ENTERPRISE users have unlimited scans
  if (user.tier !== 'FREE') {
    return { allowed: true, remaining: 'UNLIMITED', tier: user.tier };
  }

  const FREE_DAILY_MAX = 5;
  const remaining = Math.max(0, FREE_DAILY_MAX - user.daily_scans_used);

  if (remaining <= 0) {
    return { allowed: false, remaining: 0, tier: 'FREE' };
  }

  user.daily_scans_used += 1;
  users[index] = user;
  saveTable('users', users);

  logQuotaAction(userId, 'SCAN_CONSUMED', -1);

  return { allowed: true, remaining: FREE_DAILY_MAX - user.daily_scans_used, tier: 'FREE' };
}

export function renewFreeQuota(userId, reason = 'COMMUNITY_CONTRIBUTION') {
  const users = getTable('users') || [];
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) return null;

  const user = users[index];
  // Grant 3 extra scans by reducing daily_scans_used
  user.daily_scans_used = Math.max(0, user.daily_scans_used - 3);
  user.karma_points += 50; // Bonus karma for renewing/contributing

  users[index] = user;
  saveTable('users', users);

  logQuotaAction(userId, reason, 3);
  return user;
}

function logQuotaAction(userId, actionType, scansAdded) {
  const logs = getTable('quota_logs') || [];
  logs.push({
    id: `log-${Date.now()}`,
    user_id: userId,
    action_type: actionType,
    scans_added: scansAdded,
    timestamp: new Date().toISOString()
  });
  saveTable('quota_logs', logs);
}

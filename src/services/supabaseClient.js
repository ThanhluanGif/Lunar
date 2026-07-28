import { createClient } from '@supabase/supabase-js';

// Supabase Environment Credentials (Supports both Vite and Next.js env formats)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eciqooohljlubsrwjpeb.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjaXFvb29obGpsdWJzcndqcGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMzU2MTQsImV4cCI6MjEwMDgxMTYxNH0.CzJF7-qTJ7y2SAHEtZriGqbjmyEswOdwXEgPA2u5v8g';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Initialize Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Realtime Listener Helper
export function subscribeToRealtimeAudits(onAuditChange) {
  if (!isSupabaseConfigured) return null;
  try {
    const channel = supabase
      .channel('realtime-audits-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'code_audits' }, (payload) => {
        if (onAuditChange) onAuditChange(payload);
      })
      .subscribe();
    return channel;
  } catch (err) {
    console.warn('Realtime subscription notice:', err);
    return null;
  }
}

// Helper for Database operations with Fallback Local Storage Persistence
export const supabaseDb = {
  // Fetch Saved Code Audits
  async getCodeAudits() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('code_audits')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase fetch error, fallback to local:', err);
      }
    }
    const local = localStorage.getItem('lunar_code_audits');
    return local ? JSON.parse(local) : [];
  },

  // Save New Audit Report
  async saveCodeAudit(auditData) {
    const auditRecord = {
      id: `audit-${Date.now()}`,
      created_at: new Date().toISOString(),
      ...auditData
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('code_audits')
          .insert([auditRecord])
          .select();
        if (!error && data && data[0]) return data[0];
      } catch (err) {
        console.warn('Supabase save error, using local storage:', err);
      }
    }

    // Local Fallback
    const existing = await this.getCodeAudits();
    const updated = [auditRecord, ...existing];
    localStorage.setItem('lunar_code_audits', JSON.stringify(updated));
    
    // Dispatch custom event for real-time UI reaction locally
    window.dispatchEvent(new CustomEvent('lunar_audit_saved', { detail: auditRecord }));
    return auditRecord;
  },

  // Fetch Community Fix Badges / Leaderboard
  async getLeaderboard() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('leaderboard')
          .select('*')
          .order('karma', { ascending: false });
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase leaderboard fetch error:', err);
      }
    }
    return [
      { id: '1', username: 'thanhluangit', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', karma: 4850, bug_fixed: 142, patch_rate: '99.4%', badges: ['OWASP Master', 'AI Fix Legend'] },
      { id: '2', username: 'alex_whitehat', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', karma: 3420, bug_fixed: 98, patch_rate: '96.2%', badges: ['Kernel Auditor', 'CWE Hunter'] },
      { id: '3', username: 'cyber_ninja', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80', karma: 2890, bug_fixed: 84, patch_rate: '94.8%', badges: ['SQLi Slayer', 'Patch Bot'] },
      { id: '4', username: 'dev_sec_ops', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80', karma: 2150, bug_fixed: 61, patch_rate: '91.5%', badges: ['Code Shield'] }
    ];
  }
};

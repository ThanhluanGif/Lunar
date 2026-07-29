import { createClient } from '@supabase/supabase-js';

// Supabase Environment Credentials (Supports both Vite and Next.js env formats)
// IMPORTANT: Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const unavailableSupabase = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe() {} } }
    }),
    signOut: async () => ({ error: null }),
    signInWithOAuth: async () => ({
      data: null,
      error: new Error('Supabase OAuth is not configured for this environment.')
    })
  }
};

// Supabase is optional in the Docker stack. Keep the frontend usable with its
// local-storage fallback when public Supabase credentials are not supplied.
export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    })
  : unavailableSupabase;

// Realtime Listener Helper for Code Audits
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
    console.warn('Realtime audits subscription notice:', err);
    return null;
  }
}

// Realtime Listener Helper for VietQR Transactions
export function subscribeToRealtimeTransactions(onTxChange) {
  if (!isSupabaseConfigured) return null;
  try {
    const channel = supabase
      .channel('realtime-transactions-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
        if (onTxChange) onTxChange(payload);
      })
      .subscribe();
    return channel;
  } catch (err) {
    console.warn('Realtime tx subscription notice:', err);
    return null;
  }
}

// Realtime Listener Helper for Gmail Email Logs
export function subscribeToRealtimeEmails(onEmailChange) {
  if (!isSupabaseConfigured) return null;
  try {
    const channel = supabase
      .channel('realtime-emails-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email_logs' }, (payload) => {
        if (onEmailChange) onEmailChange(payload);
      })
      .subscribe();
    return channel;
  } catch (err) {
    console.warn('Realtime emails subscription notice:', err);
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

    const existing = await this.getCodeAudits();
    const updated = [auditRecord, ...existing];
    localStorage.setItem('lunar_code_audits', JSON.stringify(updated));
    
    window.dispatchEvent(new CustomEvent('lunar_audit_saved', { detail: auditRecord }));
    return auditRecord;
  },

  // Fetch Realtime Transactions
  async getTransactions() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase transactions fetch error:', err);
      }
    }
    const local = localStorage.getItem('lunar_transactions');
    return local ? JSON.parse(local) : [];
  },

  // Save New VietQR Transaction
  async saveTransaction(txData) {
    const txRecord = {
      id: txData.id || `INV-LUNAR-${Date.now().toString().slice(-6)}`,
      created_at: new Date().toISOString(),
      ...txData
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .insert([txRecord])
          .select();
        if (!error && data && data[0]) return data[0];
      } catch (err) {
        console.warn('Supabase transaction save error:', err);
      }
    }

    const existing = await this.getTransactions();
    const updated = [txRecord, ...existing];
    localStorage.setItem('lunar_transactions', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('lunar_tx_saved', { detail: txRecord }));
    return txRecord;
  },

  // Fetch Realtime Gmail Logs
  async getEmailLogs() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('email_logs')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase email logs fetch error:', err);
      }
    }
    const local = localStorage.getItem('lunar_email_logs');
    return local ? JSON.parse(local) : [];
  },

  // Save New Gmail Log Entry
  async saveEmailLog(emailRecord) {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('email_logs')
          .insert([emailRecord])
          .select();
        if (!error && data && data[0]) return data[0];
      } catch (err) {
        console.warn('Supabase email log save error:', err);
      }
    }

    const existing = await this.getEmailLogs();
    const updated = [emailRecord, ...existing];
    localStorage.setItem('lunar_email_logs', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('lunar_email_saved', { detail: emailRecord }));
    return emailRecord;
  },

  // Fetch Community Leaderboard
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

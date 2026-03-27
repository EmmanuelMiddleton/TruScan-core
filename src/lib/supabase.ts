import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase client-side credentials missing. Browser-based queries will be disabled.');
}

// Only initialize if we have valid credentials to avoid "Failed to fetch" errors
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any;

// Health check function
export const checkSupabaseConnection = async () => {
  // If we have credentials, try client-side first
  if (supabase && supabaseUrl && supabaseAnonKey) {
    try {
      const { error } = await supabase.from('_health_check').select('*').limit(1);
      
      if (error) {
        // Any PostgREST error (starts with PGRST) or specific Postgres errors (42P01, 42703)
        // mean we successfully reached the Supabase API.
        const isApiReachable = error.code?.startsWith('PGRST') || 
                               ['42P01', '42703', 'PGRST204'].includes(error.code || '');
        
        if (isApiReachable) {
          console.log('Supabase API reachable (Tables may need initialization or schema refresh)');
          return true;
        }
        
        console.error('Supabase connection error:', error.message);
        return false;
      }
      
      console.log('Supabase connected and verified');
      return true;
    } catch (err) {
      console.error('Supabase client-side connection failed:', err);
      // Fall through to server-side check
    }
  }

  // Try to check via server
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const res = await fetch('/api/health/supabase', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return false;
    const data = await res.json();
    if (data.status === 'connected') {
      console.log('Supabase verified via server-side check');
      return true;
    }
    if (data.status === 'not_configured') {
      console.log('Supabase not configured on server-side');
      return false;
    }
    return false;
  } catch (e) {
    console.warn('Supabase server-side check failed or timed out:', e);
    return false;
  }
};

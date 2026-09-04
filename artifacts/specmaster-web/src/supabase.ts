import { createClient, type User as SupabaseUser } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://jklcuuzbrglillvkmazi.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_Zt4GHORR2vlOY5nGeO8jVA_WepJ7I8L';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
  },
});

export function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

export type ProfileMeta = { name: string; role: string; company: string };

export function profileFromUser(user: SupabaseUser): { id: string; name: string; email: string; role: string; company: string; createdAt: string; initials: string } {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name = typeof meta.name === 'string' && meta.name.trim() ? meta.name : (user.email?.split('@')[0] ?? 'Usuário');
  const role = typeof meta.role === 'string' ? meta.role : '';
  const company = typeof meta.company === 'string' ? meta.company : '';
  return {
    id: user.id,
    name,
    email: user.email ?? '',
    role,
    company,
    createdAt: user.created_at ?? new Date().toISOString(),
    initials: initialsOf(name),
  };
}

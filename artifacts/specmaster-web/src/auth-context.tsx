import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { profileFromUser, supabase } from '@/supabase';

export type SignupInput = { name: string; email: string; password: string; role: string; company: string };

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string;
  createdAt: string;
  initials: string;
};

export type AuthField = 'name' | 'email' | 'password' | 'role' | 'company' | 'form';
export type AuthErrors = Partial<Record<AuthField, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const DEMO_EMAIL = 'marina@valenorte.com';
export const DEMO_PASSWORD = '123456';

export function validateSignup(input: SignupInput): AuthErrors {
  const errors: AuthErrors = {};
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const role = input.role.trim();
  const company = input.company.trim();

  if (!name) errors.name = 'Informe seu nome completo.';
  if (!email) errors.email = 'Informe seu e-mail.';
  else if (!EMAIL_RE.test(email)) errors.email = 'Digite um e-mail válido (ex.: nome@empresa.com).';
  if (!input.password) errors.password = 'Crie uma senha.';
  else if (input.password.length < 6) errors.password = 'A senha precisa ter pelo menos 6 caracteres.';
  if (!role) errors.role = 'Informe seu cargo.';
  if (!company) errors.company = 'Informe sua empresa.';
  return errors;
}

export function validateLogin(email: string, password: string): AuthErrors {
  const errors: AuthErrors = {};
  const normalized = email.trim().toLowerCase();
  if (!normalized) errors.email = 'Informe seu e-mail.';
  else if (!EMAIL_RE.test(normalized)) errors.email = 'Digite um e-mail válido.';
  if (!password) errors.password = 'Digite sua senha.';
  return errors;
}

export type SignupResult = { ok: boolean; errors: AuthErrors; user?: AuthUser; needsEmailConfirmation?: boolean };
export type LoginResult = { ok: boolean; errors: AuthErrors; user?: AuthUser };

type AuthValue = {
  user: AuthUser | null;
  loading: boolean;
  signup: (input: SignupInput) => Promise<SignupResult>;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  validateSignup: (input: SignupInput) => AuthErrors;
  validateLogin: (email: string, password: string) => AuthErrors;
};

const AuthContext = createContext<AuthValue | null>(null);

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error ?? '');
}

function mapAuthError(error: unknown): AuthErrors {
  const message = errorMessage(error);

  if (/already registered|already been registered|user already exists/i.test(message)) {
    return { email: 'Este e-mail já está cadastrado.' };
  }
  if (/invalid login credentials/i.test(message)) {
    return { form: 'E-mail ou senha incorretos. Verifique e tente novamente.' };
  }
  if (/no user found|user not found|does not exist/i.test(message)) {
    return { form: 'Este e-mail ainda não está cadastrado. Crie sua conta.' };
  }
  if (/email not confirmed|confirm.*email/i.test(message)) {
    return { form: 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.' };
  }
  if (/password/i.test(message) && /6/.test(message)) {
    return { password: 'A senha precisa ter pelo menos 6 caracteres.' };
  }
  if (/rate limit|too many requests/i.test(message)) {
    return { form: 'Muitas tentativas em sequência. Aguarde um instante e tente novamente.' };
  }
  return { form: 'Não foi possível concluir agora. Verifique sua conexão e tente novamente.' };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session ? profileFromUser(data.session.user) : null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        setUser(session ? profileFromUser(session.user) : null);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthValue>(() => {
    const signup = async (input: SignupInput): Promise<SignupResult> => {
      const localErrors = validateSignup(input);
      if (Object.keys(localErrors).length > 0) return { ok: false, errors: localErrors };

      const email = input.email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email,
        password: input.password,
        options: {
          data: {
            name: input.name.trim(),
            role: input.role.trim(),
            company: input.company.trim(),
          },
        },
      });

      if (error) return { ok: false, errors: mapAuthError(error) };

      if (data.session?.user) {
        return { ok: true, errors: {}, user: profileFromUser(data.session.user) };
      }

      if (data.user) {
        return { ok: true, errors: {}, needsEmailConfirmation: true };
      }

      return { ok: false, errors: { form: 'Não foi possível criar a conta agora. Tente novamente.' } };
    };

    const login = async (email: string, password: string): Promise<LoginResult> => {
      const localErrors = validateLogin(email, password);
      if (Object.keys(localErrors).length > 0) return { ok: false, errors: localErrors };

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) return { ok: false, errors: mapAuthError(error) };
      if (!data.session?.user) return { ok: false, errors: { form: 'Não foi possível entrar agora. Tente novamente.' } };

      return { ok: true, errors: {}, user: profileFromUser(data.session.user) };
    };

    const logout = async () => {
      await supabase.auth.signOut();
      setUser(null);
    };

    return { user, loading, signup, login, logout, validateSignup, validateLogin };
  }, [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}

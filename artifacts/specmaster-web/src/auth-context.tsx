import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

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

export type StoredUser = Omit<AuthUser, 'initials'> & { password: string };

export type AuthField = 'name' | 'email' | 'password' | 'role' | 'company' | 'form';
export type AuthErrors = Partial<Record<AuthField, string>>;

const USERS_KEY = 'specmaster:users:v1';
const SESSION_KEY = 'specmaster:session:v1';

export const DEMO_EMAIL = 'marina@valenorte.com';
export const DEMO_PASSWORD = '123456';

const DEMO_USER: StoredUser = {
  id: 'u-marina',
  name: 'Marina Reis',
  email: DEMO_EMAIL,
  password: DEMO_PASSWORD,
  role: 'Direção de projetos',
  company: 'Vale Norte',
  createdAt: '2024-01-10T09:00:00Z',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

function toPublicUser(stored: StoredUser): AuthUser {
  const { password: _password, ...rest } = stored;
  return { ...rest, initials: initialsOf(stored.name) };
}

export function validateSignup(input: SignupInput, users: StoredUser[]): AuthErrors {
  const errors: AuthErrors = {};
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const role = input.role.trim();
  const company = input.company.trim();

  if (!name) errors.name = 'Informe seu nome completo.';
  if (!email) errors.email = 'Informe seu e-mail.';
  else if (!EMAIL_RE.test(email)) errors.email = 'Digite um e-mail válido (ex.: nome@empresa.com).';
  else if (users.some((existing) => existing.email === email)) errors.email = 'Este e-mail já está cadastrado.';
  if (!password) errors.password = 'Crie uma senha.';
  else if (password.length < 6) errors.password = 'A senha precisa ter pelo menos 6 caracteres.';
  if (!role) errors.role = 'Informe seu cargo.';
  if (!company) errors.company = 'Informe sua empresa.';
  return errors;
}

export function validateLogin(email: string, password: string, users: StoredUser[]): AuthErrors {
  const errors: AuthErrors = {};
  const normalized = email.trim().toLowerCase();

  if (!normalized) errors.email = 'Informe seu e-mail.';
  else if (!EMAIL_RE.test(normalized)) errors.email = 'Digite um e-mail válido.';

  const found = users.find((existing) => existing.email === normalized);

  if (normalized && EMAIL_RE.test(normalized) && !found) errors.form = 'Este e-mail ainda não está cadastrado. Crie sua conta.';
  else if (found && !password) errors.password = 'Digite sua senha.';
  else if (found && password !== found.password) errors.password = 'Senha incorreta. Tente novamente.';
  return errors;
}

function readUsers(): StoredUser[] {
  const raw = localStorage.getItem(USERS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as StoredUser[];
    } catch {
      /* ignora e reseeda */
    }
  }
  localStorage.setItem(USERS_KEY, JSON.stringify([DEMO_USER]));
  return [DEMO_USER];
}

function readSession(users: StoredUser[]): AuthUser | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const { email } = JSON.parse(raw) as { email?: string };
    if (!email) return null;
    const found = users.find((user) => user.email === email);
    return found ? toPublicUser(found) : null;
  } catch {
    return null;
  }
}

type AuthValue = {
  user: AuthUser | null;
  signup: (input: SignupInput) => { ok: boolean; errors: AuthErrors; user?: AuthUser };
  login: (email: string, password: string) => { ok: boolean; errors: AuthErrors; user?: AuthUser };
  logout: () => void;
  validateSignup: (input: SignupInput) => AuthErrors;
  validateLogin: (email: string, password: string) => AuthErrors;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<StoredUser[]>(readUsers);
  const [user, setUser] = useState<AuthUser | null>(() => readSession(readUsers()));

  useEffect(() => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }, [users]);

  const value = useMemo<AuthValue>(() => {
    const setActive = (next: AuthUser | null) => {
      setUser(next);
      if (next) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email: next.email, loginAt: new Date().toISOString() }));
      } else {
        sessionStorage.removeItem(SESSION_KEY);
      }
    };

    const signup = (input: SignupInput) => {
      const errors = validateSignup(input, users);
      if (Object.keys(errors).length > 0) return { ok: false as const, errors };

      const name = input.name.trim();
      const email = input.email.trim().toLowerCase();
      const stored: StoredUser = {
        id: `u-${Date.now().toString(36)}`,
        name,
        email,
        password: input.password,
        role: input.role.trim(),
        company: input.company.trim(),
        createdAt: new Date().toISOString(),
      };
      const created = toPublicUser(stored);
      setUsers((current) => [...current, stored]);
      setActive(created);
      return { ok: true as const, errors: {}, user: created };
    };

    const login = (rawEmail: string, password: string) => {
      const errors = validateLogin(rawEmail, password, users);
      if (Object.keys(errors).length > 0) return { ok: false as const, errors };
      const active = toPublicUser(users.find((existing) => existing.email === rawEmail.trim().toLowerCase())!);
      setActive(active);
      return { ok: true as const, errors: {}, user: active };
    };

    const logout = () => setActive(null);

    return { user, signup, login, logout, validateSignup: (input) => validateSignup(input, users), validateLogin: (email, password) => validateLogin(email, password, users) };
  }, [users, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}

import { useState, type ReactNode } from 'react';
import { AlertCircle, AlertTriangle, Building2, Eye, EyeOff, FileSpreadsheet, HardHat, Lock, Mail, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { DEMO_EMAIL, DEMO_PASSWORD, useAuth, type AuthErrors, type SignupInput } from '@/auth-context';

type LoginValues = { email: string; password: string };
type SignupValues = SignupInput;

const EMPTY_LOGIN: LoginValues = { email: '', password: '' };
const EMPTY_SIGNUP: SignupValues = { name: '', email: '', password: '', role: '', company: '' };

function FieldError({ message, id }: { message?: string; id: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-[11.5px] leading-snug text-destructive mt-1">
      <AlertCircle className="size-3.5 shrink-0 mt-px" />
      {message}
    </p>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  error,
  icon,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  icon?: ReactNode;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[12.5px] text-foreground">{label}</Label>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-3.5">{icon}</span>}
        <Input
          id={id}
          value={value}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={cn('h-9 bg-card', icon && 'pl-9', error && 'border-destructive focus-visible:ring-destructive')}
        />
      </div>
      <FieldError message={error} id={errorId} />
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  show,
  toggle,
  autoComplete,
  error,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  toggle: () => void;
  autoComplete: string;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[12.5px] text-foreground">Senha</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><Lock className="size-3.5" /></span>
        <Input
          id={id}
          value={value}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder="Mínimo de 6 caracteres"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={cn('h-9 bg-card pl-9 pr-10', error && 'border-destructive focus-visible:ring-destructive')}
        />
        <button
          type="button"
          onClick={toggle}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground [&_svg]:size-3.5"
        >
          {show ? <EyeOff /> : <Eye />}
        </button>
      </div>
      <FieldError message={error} id={`${id}-error`} />
    </div>
  );
}

function Banner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-2.5 py-1.5 text-[11.5px] text-destructive">
      <AlertCircle className="size-3.5 shrink-0 mt-px" /> {message}
    </div>
  );
}

const FEATURES = [
  { icon: FileSpreadsheet, text: 'Importação de memoriais em PDF com extração instantânea.' },
  { icon: AlertTriangle, text: 'Alerta visual automático entre verba teto e valor cotado.' },
  { icon: Users, text: 'Aprovações simultâneas entre arquitetura, orçamento e obra.' },
];

export default function AuthScreen() {
  const { login, signup, validateLogin, validateSignup } = useAuth();

  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [loginValues, setLoginValues] = useState<LoginValues>(EMPTY_LOGIN);
  const [signupValues, setSignupValues] = useState<SignupValues>(EMPTY_SIGNUP);
  const [loginErrors, setLoginErrors] = useState<AuthErrors>({});
  const [signupErrors, setSignupErrors] = useState<AuthErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const setLogin = (key: keyof LoginValues, value: string) => {
    setLoginValues((current) => ({ ...current, [key]: value }));
    if (attempted) {
      const next = { ...loginValues, [key]: value };
      setLoginErrors(validateLogin(next.email, next.password));
    }
  };

  const setSignup = (key: keyof SignupValues, value: string) => {
    setSignupValues((current) => ({ ...current, [key]: value }));
    if (attempted) {
      const next = { ...signupValues, [key]: value };
      setSignupErrors(validateSignup(next));
    }
  };

  const switchTab = (next: string) => {
    setTab(next as 'login' | 'signup');
    setAttempted(false);
    setLoginErrors({});
    setSignupErrors({});
    setShowPassword(false);
  };

  const submitLogin = () => {
    setAttempted(true);
    const errors = validateLogin(loginValues.email, loginValues.password);
    setLoginErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setBusy(true);
    const result = login(loginValues.email, loginValues.password);
    setBusy(false);
    if (!result.ok && result.errors) setLoginErrors(result.errors);
  };

  const submitSignup = () => {
    setAttempted(true);
    const errors = validateSignup(signupValues);
    setSignupErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setBusy(true);
    const result = signup(signupValues);
    setBusy(false);
    if (!result.ok && result.errors) setSignupErrors(result.errors);
  };

  const quickDemo = () => {
    setAttempted(true);
    setLoginErrors({});
    setLoginValues({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    const result = login(DEMO_EMAIL, DEMO_PASSWORD);
    if (!result.ok && result.errors) setLoginErrors(result.errors);
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-card text-foreground flex">
      <aside
        className="relative hidden md:flex md:w-[44%] lg:w-[46%] xl:w-[42%] max-w-[540px] shrink-0 flex-col justify-between overflow-hidden px-9 py-9 text-white"
        style={{ background: 'linear-gradient(160deg, #050B33 0%, #0B1E63 46%, #123B8F 100%)' }}
      >
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.16) 1px, transparent 0)', backgroundSize: '24px 24px', opacity: 0.18 }} />
        <div className="absolute -top-24 -right-24 size-80 rounded-full bg-[#2F7BFF]/25 blur-3xl" />
        <div className="absolute -bottom-28 -left-20 size-72 rounded-full bg-[#7A5CFF]/20 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-white/15 text-white ring-1 ring-white/20"><HardHat className="size-[18px]" /></span>
          <span className="text-lg font-semibold tracking-tight">spec<strong>master</strong><sup className="text-[9px] align-super ml-0.5 opacity-60">®</sup></span>
        </div>

        <div className="relative py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">Especificações técnicas · Obras</p>
          <h1 className="mt-3 text-[23px] leading-[1.25] font-semibold tracking-tight">
            Centralize suas especificações.<br />Elimine o estouro orçamentário.
          </h1>
        </div>

        <div className="relative space-y-3.5">
          {FEATURES.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-2.5 text-[13px] leading-snug text-white/85">
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-white/10 ring-1 ring-white/15"><Icon className="size-3.5 text-[#8FBBFF]" /></span>
              {text}
            </div>
          ))}
        </div>

        <p className="relative text-[11px] text-white/45">SpecMaster — Do projeto ao canteiro sem desvios financeiros.</p>
      </aside>

      <main className="relative flex-1 min-h-0 overflow-y-auto">
        <div className="m-auto flex min-h-full w-full max-w-[400px] flex-col justify-center px-5 py-6">
          <div className="flex items-center gap-2 md:hidden">
            <span className="grid size-9 place-items-center rounded-lg bg-[#0B1E63] text-white"><HardHat className="size-[18px]" /></span>
            <span className="text-lg font-semibold tracking-tight text-[#050B33]">specmaster</span>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
            <div className="px-5 pt-4 sm:px-5">
              <Tabs value={tab} onValueChange={switchTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-muted/70 p-0.5">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Criar conta</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-4 space-y-3 outline-none">
                  <div>
                    <h2 className="text-[15px] font-semibold tracking-tight">Bem-vindo(a) de volta</h2>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">Entre para acessar seus projetos e matrizes.</p>
                  </div>
                  <Field id="login-email" label="E-mail" type="email" autoComplete="email" placeholder="voce@empresa.com" icon={<Mail />} value={loginValues.email} onChange={(value) => setLogin('email', value)} error={loginErrors.email} />
                  <PasswordInput id="login-password" value={loginValues.password} onChange={(value) => setLogin('password', value)} show={showPassword} toggle={() => setShowPassword((current) => !current)} autoComplete="current-password" error={loginErrors.password} />
                  <Banner message={loginErrors.form} />
                  <Button type="button" className="h-9 w-full" onClick={submitLogin} disabled={busy}>
                    {busy ? 'Entrando…' : 'Entrar'}
                  </Button>
                </TabsContent>

                <TabsContent value="signup" className="mt-4 space-y-3 outline-none">
                  <div>
                    <h2 className="text-[15px] font-semibold tracking-tight">Crie sua conta</h2>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">Seus projetos ficarão salvos nesta conta.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field id="signup-name" label="Nome completo" autoComplete="name" placeholder="Seu nome" value={signupValues.name} onChange={(value) => setSignup('name', value)} error={signupErrors.name} />
                    <Field id="signup-role" label="Cargo" autoComplete="organization-title" placeholder="Ex: Arquiteta" value={signupValues.role} onChange={(value) => setSignup('role', value)} error={signupErrors.role} />
                    <Field id="signup-email" label="E-mail" type="email" autoComplete="email" placeholder="voce@empresa.com" icon={<Mail />} value={signupValues.email} onChange={(value) => setSignup('email', value)} error={signupErrors.email} />
                    <Field id="signup-company" label="Empresa" autoComplete="organization" placeholder="Ex: Vale Norte" icon={<Building2 />} value={signupValues.company} onChange={(value) => setSignup('company', value)} error={signupErrors.company} />
                  </div>
                  <PasswordInput id="signup-password" value={signupValues.password} onChange={(value) => setSignup('password', value)} show={showPassword} toggle={() => setShowPassword((current) => !current)} autoComplete="new-password" error={signupErrors.password} />
                  <Banner message={signupErrors.form} />
                  <Button type="button" className="h-9 w-full" onClick={submitSignup} disabled={busy}>
                    {busy ? 'Criando conta…' : 'Criar conta'}
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="text-[12px] font-medium">Conta de demonstração</p>
              <p className="truncate text-[11px] text-muted-foreground">{DEMO_EMAIL} · senha {DEMO_PASSWORD}</p>
            </div>
            <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 px-3 text-[12px]" onClick={quickDemo}>Entrar como demo</Button>
          </div>
        </div>
      </main>
    </div>
  );
}

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  getGetProjectQueryKey,
  getHealthCheckQueryKey,
  getListProjectsQueryKey,
  useCreateSpecification,
  useDeleteSpecification,
  useGetProject,
  useHealthCheck,
  useListProjects,
  useUpdateSpecification,
  type Project,
  type Specification,
  type SpecificationInput,
} from '@workspace/api-client-react';
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  CloudUpload,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FolderKanban,
  Grid2X2,
  HardHat,
  LayoutDashboard,
  Link as LinkIcon,
  List,
  LoaderCircle,
  MoreHorizontal,
  PackageSearch,
  Plus,
  Printer,
  Search,
  Settings,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { Link, Route, Switch, Router as WouterRouter, useLocation, useParams } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

type LocalProject = Project;
type LocalSpec = Specification;

const FALLBACK_PROJECTS: LocalProject[] = [
  {
    id: 'ed-santa-monica',
    name: 'Ed. Santa Mônica',
    client: 'Construtora Vale Norte',
    location: 'São Paulo, SP',
    completion: 68,
    updatedAt: '2024-06-18T16:42:00Z',
  },
  {
    id: 'casa-serra',
    name: 'Casa Serra Azul',
    client: 'Ateliê Horizonte',
    location: 'Campos do Jordão, SP',
    completion: 42,
    updatedAt: '2024-06-14T10:10:00Z',
  },
  {
    id: 'torre-ipanema',
    name: 'Torre Ipanema',
    client: 'Mares Incorporadora',
    location: 'Rio de Janeiro, RJ',
    completion: 19,
    updatedAt: '2024-06-10T09:23:00Z',
  },
];

const FALLBACK_SPECS: LocalSpec[] = [
  { id: 'spec-1', environment: 'Estar', item: 'Piso vinílico amadeirado', dimension: '1220 × 180 mm', finish: 'Carvalho natural / E=5 mm', brand: 'Tarkett — Injoy', budget: 12800, quotedPrice: 11640, updatedAt: '2024-06-18T16:42:00Z' },
  { id: 'spec-2', environment: 'Estar', item: 'Painel ripado em lâmina', dimension: '3600 × 2700 mm', finish: 'Lâmina freijó / fosco', brand: 'Decorfilm', budget: 18600, quotedPrice: 20340, updatedAt: '2024-06-17T14:05:00Z' },
  { id: 'spec-3', environment: 'Cozinha', item: 'Bancada ilha', dimension: '2400 × 1100 × 20 mm', finish: 'Quartzo branco / levigado', brand: 'Marmoraria São Bento', budget: 22400, quotedPrice: 21650, updatedAt: '2024-06-17T11:26:00Z' },
  { id: 'spec-4', environment: 'Cozinha', item: 'Marcenaria inferior', dimension: '4200 × 900 mm', finish: 'MDF azul petróleo / PU', brand: 'Módulo 7', budget: 31200, quotedPrice: 33890, updatedAt: '2024-06-16T18:14:00Z' },
  { id: 'spec-5', environment: 'Suíte master', item: 'Revestimento cabeceira', dimension: '3200 × 1200 mm', finish: 'Linho cru / trama fina', brand: 'Celina Têxteis', budget: 9700, quotedPrice: 8420, updatedAt: '2024-06-15T09:52:00Z' },
  { id: 'spec-6', environment: 'Suíte master', item: 'Arandela de leitura', dimension: 'Ø 120 × 180 mm', finish: 'Latão escovado', brand: 'Lumini — Lume', budget: 4600, quotedPrice: 4980, updatedAt: '2024-06-15T09:47:00Z' },
  { id: 'spec-7', environment: 'Banho casal', item: 'Metais de bancada', dimension: 'Monocomando 240 mm', finish: 'Grafite escovado', brand: 'Docol — Lift', budget: 7800, quotedPrice: 7240, updatedAt: '2024-06-13T17:28:00Z' },
  { id: 'spec-8', environment: 'Varanda', item: 'Esquadria de correr', dimension: '4800 × 2400 mm', finish: 'Alumínio champanhe', brand: 'Ação Esquadrias', budget: 27500, quotedPrice: 30120, updatedAt: '2024-06-12T13:02:00Z' },
];

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const DATE = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });

function money(value: number) {
  return BRL.format(value).replace(/\s/g, ' ');
}

function dateLabel(value: string) {
  return DATE.format(new Date(value)).replace('.', '');
}

function IconButton({ label, children, onClick, className = '', testId }: { label: string; children: ReactNode; onClick?: () => void; className?: string; testId: string }) {
  return (
    <button type="button" aria-label={label} title={label} data-testid={testId} onClick={onClick} className={`icon-button ${className}`}>
      {children}
    </button>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [notice, setNotice] = useState('');
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), staleTime: 60000 } });
  const isProject = location.startsWith('/projects/');

  const pushNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3200);
  };

  return (
    <div className="shell-noise min-h-[100dvh] bg-background text-foreground">
      <aside className="sidebar">
        <Link href="/" className="brand-lockup" data-testid="link-brand-home">
          <span className="brand-mark"><HardHat size={19} strokeWidth={2.4} /></span>
          <span><strong>spec</strong>master<em>®</em></span>
        </Link>
        <div className="workspace-label">WORKSPACE <ChevronDown size={13} /></div>
        <div className="workspace-switcher">
          <span className="workspace-avatar">VN</span>
          <span><strong>Vale Norte</strong><small>Equipe de especificação</small></span>
          <MoreHorizontal size={16} />
        </div>
        <nav className="side-nav" aria-label="Navegação principal">
          <p className="nav-caption">Controle</p>
          <Link href="/" className={`nav-item ${location === '/' ? 'active' : ''}`} data-testid="link-nav-portfolio">
            <LayoutDashboard size={17} /><span>Portfólio</span><kbd>1</kbd>
          </Link>
          <Link href="/projects/ed-santa-monica" className={`nav-item ${isProject ? 'active' : ''}`} data-testid="link-nav-matrix">
            <ClipboardList size={17} /><span>Matriz de specs</span>
          </Link>
          <Link href="/suppliers" className={`nav-item ${location === '/suppliers' ? 'active' : ''}`} data-testid="link-nav-suppliers">
            <Users size={17} /><span>Fornecedores</span>
          </Link>
          <p className="nav-caption nav-caption-spaced">Workspace</p>
          <Link href="/settings" className={`nav-item ${location === '/settings' ? 'active' : ''}`} data-testid="link-nav-settings">
            <Settings size={17} /><span>Configurações</span>
          </Link>
          <button type="button" onClick={() => pushNotice('Central de ajuda disponível em breve.')} className="nav-item nav-button" data-testid="button-help">
            <CircleHelp size={17} /><span>Central de ajuda</span>
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="system-status">
            <span className={`status-dot ${health.isError ? 'offline' : ''}`} />
            <span>{health.isError ? 'Modo offline' : 'Operação normal'}</span>
            <span className="font-mono-ui status-time">09:41</span>
          </div>
          <div className="profile-row">
            <span className="profile-avatar">MR</span>
            <span><strong>Marina Reis</strong><small>Direção de projetos</small></span>
            <MoreHorizontal size={16} />
          </div>
        </div>
      </aside>
      <main className="main-canvas">{children}</main>
      {notice && (
        <div className="toast-note page-enter" role="status" data-testid="status-toast">
          <Check size={15} /> {notice}
        </div>
      )}
    </div>
  );
}

function Topbar({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return (
    <header className="topbar">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="page-title">{title}</h1>
      </div>
      <div className="topbar-actions">
        <IconButton label="Notificações" testId="button-notifications"><Bell size={17} /></IconButton>
        <div className="topbar-divider" />
        {action}
      </div>
    </header>
  );
}

function Portfolio() {
  const projectsQuery = useListProjects({ query: { queryKey: getListProjectsQueryKey(), staleTime: 30000 } });
  const projects = projectsQuery.data?.length ? projectsQuery.data : FALLBACK_PROJECTS;
  const highlighted = projects.find((project) => project.id === 'ed-santa-monica') ?? projects[0];
  const projectCount = projects.length;

  return (
    <div className="page-wrap page-enter">
      <Topbar
        eyebrow="PORTFÓLIO / 2024"
        title="Bom dia, Marina."
        action={<button type="button" className="button button-primary" onClick={() => window.alert('A criação de projetos será habilitada pelo administrador.')} data-testid="button-new-project"><Plus size={16} /> Novo projeto</button>}
      />
      <section className="portfolio-intro stagger-1">
        <div>
          <p className="section-kicker"><span className="kicker-line" /> VISÃO DE OBRA</p>
          <h2>Projetos que pedem<br /><span>atenção aos detalhes.</span></h2>
        </div>
        <p className="intro-copy">Acompanhe o pulso das especificações, do primeiro orçamento à última aprovação.</p>
      </section>
      <section className="metric-strip stagger-2" aria-label="Resumo do portfólio">
        <div className="metric-cell"><span className="metric-label">Projetos ativos</span><strong data-testid="text-active-projects">{projectCount.toString().padStart(2, '0')}</strong><small>+ 1 nesta semana</small></div>
        <div className="metric-cell"><span className="metric-label">Itens em revisão</span><strong>24</strong><small className="warning-text">6 precisam de retorno</small></div>
        <div className="metric-cell"><span className="metric-label">Aderência à verba</span><strong>82,4<span>%</span></strong><small className="success-text">+4,8% no mês</small></div>
        <div className="metric-cell metric-note"><Sparkles size={17} /><span>O controle começa<br />na próxima decisão.</span></div>
      </section>
      <section className="portfolio-section stagger-3">
        <div className="section-heading">
          <div><p className="section-kicker">EM ANDAMENTO</p><h3>Projetos em foco</h3></div>
          <span className="muted-label">Atualizado hoje, 09:38</span>
        </div>
        <div className="project-grid">
          {projects.map((project, index) => (
            <ProjectCard project={project} featured={project.id === highlighted.id} index={index} key={project.id} />
          ))}
          {!projectsQuery.data && projectsQuery.isLoading && <ProjectSkeleton />}
        </div>
        {projectsQuery.isError && <div className="query-note" data-testid="status-projects-error">Exibindo a última fotografia salva. <button type="button" onClick={() => projectsQuery.refetch()} data-testid="button-retry-projects">Tentar novamente</button></div>}
      </section>
      <section className="activity-section stagger-4">
        <div className="section-heading"><div><p className="section-kicker">RASTRO RECENTE</p><h3>O que mudou</h3></div><button type="button" className="text-button" data-testid="button-view-activity">Ver atividade completa <ArrowUpRight size={15} /></button></div>
        <div className="activity-list">
          <ActivityItem mark="AR" label="André Ribeiro" action="atualizou a verba de" target="Painel ripado em lâmina" project="Ed. Santa Mônica" time="há 18 min" tone="amber" />
          <ActivityItem mark="FL" label="Fernanda Lima" action="comentou em" target="Revestimento cabeceira" project="Casa Serra Azul" time="há 1 h" tone="coral" />
          <ActivityItem mark="MR" label="Marina Reis" action="aprovou" target="Metais de bancada" project="Ed. Santa Mônica" time="ontem" tone="ink" />
        </div>
      </section>
    </div>
  );
}

function ProjectCard({ project, featured, index }: { project: LocalProject; featured: boolean; index: number }) {
  return (
    <Link href={`/projects/${project.id}`} className={`project-card ${featured ? 'featured' : ''} page-enter stagger-${Math.min(index + 1, 4)}`} data-testid={`card-project-${project.id}`}>
      <div className="card-topline"><span className={featured ? 'live-badge' : 'project-number'}>{featured ? <><span className="pulse-dot" /> EM FOCO</> : `0${index + 1}`}</span><ArrowUpRight size={17} /></div>
      <div className="project-card-body">
        <div className="project-type">PROJETO RESIDENCIAL</div>
        <h4>{project.name}</h4>
        <p>{project.client}</p>
        <div className="project-location"><span className="location-pin" /> {project.location}</div>
      </div>
      <div className="project-card-bottom">
        <div className="completion-copy"><span>ESPECIFICAÇÃO</span><strong>{project.completion}%</strong></div>
        <div className="completion-bar"><span style={{ width: `${project.completion}%` }} /></div>
        <div className="project-updated">Atualizado {dateLabel(project.updatedAt)}</div>
      </div>
    </Link>
  );
}

function ProjectSkeleton() {
  return <div className="project-card skeleton-card"><div className="skeleton-line w-20" /><div className="skeleton-block" /><div className="skeleton-line w-60" /></div>;
}

function ActivityItem({ mark, label, action, target, project, time, tone }: { mark: string; label: string; action: string; target: string; project: string; time: string; tone: string }) {
  return (
    <div className="activity-item" data-testid={`activity-${mark}`}>
      <span className={`activity-avatar ${tone}`}>{mark}</span>
      <p><strong>{label}</strong> {action} <b>{target}</b><small>{project}</small></p>
      <time>{time}</time>
    </div>
  );
}

function MatrixPage() {
  const { projectId } = useParams<{ projectId?: string }>();
  const id = projectId || 'ed-santa-monica';
  const projectQuery = useGetProject(id, { query: { queryKey: getGetProjectQueryKey(id), staleTime: 15000 } });
  const createSpecification = useCreateSpecification();
  const updateSpecification = useUpdateSpecification();
  const deleteSpecification = useDeleteSpecification();
  const queryClient = useQueryClient();
  const [localSpecs, setLocalSpecs] = useState<LocalSpec[]>([]);
  const [initializedId, setInitializedId] = useState<string | null>(null);
  const [view, setView] = useState<'table' | 'board'>('table');
  const [search, setSearch] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<'idle' | 'ready' | 'done'>('idle');
  const [notice, setNotice] = useState('');
  const [shareState, setShareState] = useState(false);

  useEffect(() => {
    if (projectQuery.data && initializedId !== id) {
      setLocalSpecs(projectQuery.data.specifications);
      setInitializedId(id);
    }
  }, [projectQuery.data, initializedId, id]);

  const project = projectQuery.data ?? FALLBACK_PROJECTS.find((item) => item.id === id) ?? FALLBACK_PROJECTS[0];
  const specs = localSpecs.length || initializedId === id ? localSpecs : FALLBACK_SPECS;
  const filtered = useMemo(() => specs.filter((row) => [row.environment, row.item, row.dimension, row.finish, row.brand].join(' ').toLowerCase().includes(search.toLowerCase())), [specs, search]);
  const environments = useMemo(() => Array.from(new Set(filtered.map((row) => row.environment))), [filtered]);
  const totalBudget = specs.reduce((sum, row) => sum + Number(row.budget || 0), 0);
  const totalQuoted = specs.reduce((sum, row) => sum + Number(row.quotedPrice || 0), 0);
  const overBudgetCount = specs.filter((row) => Number(row.quotedPrice) > Number(row.budget)).length;

  const pushNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3200);
  };

  const updateLocal = (row: LocalSpec) => setLocalSpecs((current) => current.map((item) => item.id === row.id ? row : item));
  const saveRow = (row: LocalSpec) => {
    const payload: SpecificationInput = { environment: row.environment, item: row.item, dimension: row.dimension, finish: row.finish, brand: row.brand, budget: Number(row.budget) || 0, quotedPrice: Number(row.quotedPrice) || 0 };
    if (row.id.startsWith('draft-')) {
      createSpecification.mutate({ projectId: id, data: payload }, {
        onSuccess: (created) => {
          setLocalSpecs((current) => current.map((item) => item.id === row.id ? created : item));
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
          pushNotice('Item adicionado à matriz.');
        },
        onError: () => pushNotice('Não foi possível adicionar agora. A linha continua editável.'),
      });
    } else {
      updateSpecification.mutate({ projectId: id, specificationId: row.id, data: payload }, {
        onSuccess: (updated) => {
          updateLocal(updated);
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
          pushNotice('Alteração salva.');
        },
        onError: () => pushNotice('Alteração mantida localmente; tente salvar novamente.'),
      });
    }
  };

  const addRow = () => {
    const draft: LocalSpec = { id: `draft-${Date.now()}`, environment: 'Novo ambiente', item: 'Novo item', dimension: '—', finish: '—', brand: 'A definir', budget: 0, quotedPrice: 0, updatedAt: new Date().toISOString() };
    setLocalSpecs((current) => [draft, ...current]);
    setInitializedId(id);
    pushNotice('Linha nova criada. Edite os campos e salve.');
  };

  const removeRow = (row: LocalSpec) => {
    if (row.id.startsWith('draft-')) {
      setLocalSpecs((current) => current.filter((item) => item.id !== row.id));
      return;
    }
    if (!window.confirm(`Remover "${row.item}" da matriz?`)) return;
    deleteSpecification.mutate({ projectId: id, specificationId: row.id }, {
      onSuccess: () => {
        setLocalSpecs((current) => current.filter((item) => item.id !== row.id));
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
        pushNotice('Item removido.');
      },
      onError: () => pushNotice('Não foi possível remover este item.'),
    });
  };

  const simulateImport = () => {
    setImportStep('ready');
  };

  const completeImport = () => {
    const importedRows: LocalSpec[] = [
      { id: `draft-import-${Date.now()}`, environment: 'Lavabo', item: 'Cuba de apoio', dimension: 'Ø 400 × 140 mm', finish: 'Cerâmica branca', brand: 'Deca', budget: 2800, quotedPrice: 2650, updatedAt: new Date().toISOString() },
      { id: `draft-import-${Date.now() + 1}`, environment: 'Lavabo', item: 'Espelho orgânico', dimension: '900 × 700 mm', finish: 'Borda lapidada', brand: 'Vidraçaria Norte', budget: 1900, quotedPrice: 2140, updatedAt: new Date().toISOString() },
    ];
    setLocalSpecs((current) => [...importedRows, ...current]);
    setImportStep('done');
    pushNotice('2 itens importados para revisão.');
  };

  const share = async () => {
    try { await navigator.clipboard?.writeText(window.location.href); } catch { /* clipboard can be unavailable in preview */ }
    setShareState(true);
    pushNotice('Link de compartilhamento copiado.');
    window.setTimeout(() => setShareState(false), 2400);
  };

  if (projectQuery.isLoading && !projectQuery.data && initializedId !== id) return <MatrixSkeleton />;

  return (
    <div className="page-wrap matrix-page page-enter">
      <div className="matrix-breadcrumb"><Link href="/" data-testid="link-back-portfolio"><ArrowLeft size={14} /> Portfólio</Link><span>/</span><span>{project.name}</span></div>
      <header className="matrix-header">
        <div>
          <div className="project-type">MATRIZ DE ESPECIFICAÇÕES <span className="header-status"><span className="pulse-dot" /> AO VIVO</span></div>
          <h1 className="matrix-title">{project.name}</h1>
          <p className="matrix-subtitle">{project.client} <span>·</span> {project.location} <span>·</span> última edição há 18 min</p>
        </div>
        <div className="matrix-header-actions">
          <button type="button" className="button button-quiet" onClick={share} data-testid="button-share-project"><Share2 size={15} /> {shareState ? 'Link copiado' : 'Compartilhar'}</button>
          <button type="button" className="button button-quiet" onClick={() => window.print()} data-testid="button-export-print"><Printer size={15} /> Exportar / imprimir</button>
        </div>
      </header>
      <section className="matrix-summary">
        <div><span>LINHAS MAPEADAS</span><strong data-testid="text-spec-count">{specs.length.toString().padStart(2, '0')}</strong></div>
        <div><span>VERBA TOTAL</span><strong>{money(totalBudget)}</strong></div>
        <div><span>ATUALMENTE COTADO</span><strong className={totalQuoted > totalBudget ? 'over-text' : 'under-text'}>{money(totalQuoted)}</strong></div>
        <div><span>FORA DA VERBA</span><strong className={overBudgetCount ? 'over-text' : 'under-text'}>{overBudgetCount.toString().padStart(2, '0')}</strong><small>{overBudgetCount ? 'pedem revisão' : 'tudo sob controle'}</small></div>
        <div className="matrix-progress-wrap"><div className="summary-progress"><span style={{ width: `${Math.min((totalQuoted / Math.max(totalBudget, 1)) * 100, 100)}%` }} /></div><small>{Math.round((totalQuoted / Math.max(totalBudget, 1)) * 100)}% da verba comprometida</small></div>
      </section>
      <section className="matrix-toolbar">
        <div className="view-switcher" role="tablist" aria-label="Modo de visualização">
          <button type="button" className={view === 'table' ? 'selected' : ''} onClick={() => setView('table')} data-testid="button-view-table"><List size={15} /> Tabela</button>
          <button type="button" className={view === 'board' ? 'selected' : ''} onClick={() => setView('board')} data-testid="button-view-board"><Grid2X2 size={15} /> Quadro</button>
        </div>
        <div className="toolbar-right">
          <label className="search-box"><Search size={15} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar item, marca..." aria-label="Buscar especificações" data-testid="input-search-specs" />{search && <IconButton label="Limpar busca" testId="button-clear-search" onClick={() => setSearch('')}><X size={13} /></IconButton>}</label>
          <button type="button" className="button button-quiet filter-button" onClick={() => pushNotice('Filtros avançados estarão disponíveis após a primeira aprovação.')} data-testid="button-filter-specs"><SlidersHorizontal size={15} /> Filtros <span className="filter-count">2</span></button>
          <button type="button" className="button button-quiet" onClick={() => setImportOpen(true)} data-testid="button-open-import"><Upload size={15} /> Importar</button>
          <button type="button" className="button button-primary" onClick={addRow} data-testid="button-add-spec"><Plus size={15} /> Adicionar linha</button>
        </div>
      </section>
      {projectQuery.isError && <div className="query-note matrix-error" data-testid="status-project-error">A API não respondeu. Você está vendo a última fotografia disponível. <button type="button" onClick={() => projectQuery.refetch()} data-testid="button-retry-project">Tentar novamente</button></div>}
      {view === 'table' ? (
        <SpecificationTable rows={filtered} onChange={updateLocal} onSave={saveRow} onDelete={removeRow} />
      ) : (
        <SpecificationBoard rows={filtered} environments={environments} onChange={updateLocal} onSave={saveRow} onDelete={removeRow} />
      )}
      {!filtered.length && <div className="empty-search"><PackageSearch size={26} /><strong>Nenhum item encontrado</strong><span>Tente outra busca ou adicione uma nova linha à matriz.</span></div>}
      <footer className="matrix-footer"><span><span className="legend-dot green" /> Dentro da verba <span className="legend-dot red" /> Acima da verba</span><span className="font-mono-ui">Última sincronização 09:38:12</span></footer>
      {notice && <div className="toast-note page-enter" role="status" data-testid="status-matrix-toast"><Check size={15} /> {notice}</div>}
      {importOpen && <ImportModal step={importStep} onClose={() => { setImportOpen(false); setImportStep('idle'); }} onSimulate={simulateImport} onComplete={completeImport} />}
    </div>
  );
}

function EditableCell({ value, onChange, onCommit, numeric, testId }: { value: string | number; onChange: (value: string) => void; onCommit: () => void; numeric?: boolean; testId: string }) {
  return <input className={`editable-cell ${numeric ? 'numeric-cell' : ''}`} type={numeric ? 'number' : 'text'} value={value} onChange={(event) => onChange(event.target.value)} onBlur={onCommit} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} data-testid={testId} />;
}

function SpecificationTable({ rows, onChange, onSave, onDelete }: { rows: LocalSpec[]; onChange: (row: LocalSpec) => void; onSave: (row: LocalSpec) => void; onDelete: (row: LocalSpec) => void }) {
  const edit = (row: LocalSpec, key: keyof LocalSpec, value: string) => onChange({ ...row, [key]: key === 'budget' || key === 'quotedPrice' ? Number(value) : value });
  return (
    <div className="table-frame">
      <div className="spec-table" role="table" aria-label="Matriz de especificações">
        <div className="spec-row spec-head" role="row">
          <div>Ambiente</div><div>Item / Descrição</div><div>Dimensão</div><div>Acabamento</div><div>Marca / Fornecedor</div><div>Verba Teto (R$)</div><div>Preço Atual Cotado (R$)</div><div />
        </div>
        {rows.map((row) => {
          const under = Number(row.quotedPrice) <= Number(row.budget);
          return (
            <div className={`spec-row ${under ? 'row-under' : 'row-over'}`} role="row" key={row.id} data-testid={`row-spec-${row.id}`}>
              <div><EditableCell value={row.environment} onChange={(value) => edit(row, 'environment', value)} onCommit={() => onSave(row)} testId={`input-environment-${row.id}`} /></div>
              <div className="item-cell"><span className={`row-state ${under ? 'state-under' : 'state-over'}`} /><EditableCell value={row.item} onChange={(value) => edit(row, 'item', value)} onCommit={() => onSave(row)} testId={`input-item-${row.id}`} /></div>
              <div><EditableCell value={row.dimension} onChange={(value) => edit(row, 'dimension', value)} onCommit={() => onSave(row)} testId={`input-dimension-${row.id}`} /></div>
              <div><EditableCell value={row.finish} onChange={(value) => edit(row, 'finish', value)} onCommit={() => onSave(row)} testId={`input-finish-${row.id}`} /></div>
              <div><EditableCell value={row.brand} onChange={(value) => edit(row, 'brand', value)} onCommit={() => onSave(row)} testId={`input-brand-${row.id}`} /></div>
              <div><EditableCell value={row.budget} onChange={(value) => edit(row, 'budget', value)} onCommit={() => onSave(row)} numeric testId={`input-budget-${row.id}`} /></div>
              <div><EditableCell value={row.quotedPrice} onChange={(value) => edit(row, 'quotedPrice', value)} onCommit={() => onSave(row)} numeric testId={`input-quoted-${row.id}`} /></div>
              <div className="row-actions">{row.id.startsWith('draft-') && <button type="button" className="save-row" onClick={() => onSave(row)} data-testid={`button-save-row-${row.id}`}><Check size={14} /></button>}<IconButton label={`Remover ${row.item}`} className="delete-row" testId={`button-delete-row-${row.id}`} onClick={() => onDelete(row)}><Trash2 size={14} /></IconButton></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SpecificationBoard({ rows, environments, onChange, onSave, onDelete }: { rows: LocalSpec[]; environments: string[]; onChange: (row: LocalSpec) => void; onSave: (row: LocalSpec) => void; onDelete: (row: LocalSpec) => void }) {
  return (
    <div className="board-grid">
      {environments.map((environment) => (
        <div className="board-column" key={environment}>
          <div className="board-column-head"><span className="column-index">{String(environments.indexOf(environment) + 1).padStart(2, '0')}</span><strong>{environment}</strong><span className="column-count">{rows.filter((row) => row.environment === environment).length}</span></div>
          <div className="board-cards">
            {rows.filter((row) => row.environment === environment).map((row) => <BoardCard row={row} onChange={onChange} onSave={onSave} onDelete={onDelete} key={row.id} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function BoardCard({ row, onChange, onSave, onDelete }: { row: LocalSpec; onChange: (row: LocalSpec) => void; onSave: (row: LocalSpec) => void; onDelete: (row: LocalSpec) => void }) {
  const under = Number(row.quotedPrice) <= Number(row.budget);
  const edit = (key: keyof LocalSpec, value: string) => onChange({ ...row, [key]: key === 'budget' || key === 'quotedPrice' ? Number(value) : value });
  return (
    <article className={`board-card ${under ? 'row-under' : 'row-over'}`} data-testid={`card-board-${row.id}`}>
      <div className="board-card-top"><span className={`status-pill ${under ? 'under' : 'over'}`}>{under ? 'Dentro da verba' : 'Acima da verba'}</span><IconButton label={`Remover ${row.item}`} testId={`button-delete-board-${row.id}`} onClick={() => onDelete(row)}><Trash2 size={13} /></IconButton></div>
      <EditableCell value={row.item} onChange={(value) => edit('item', value)} onCommit={() => onSave(row)} testId={`board-input-item-${row.id}`} />
      <div className="board-detail"><span>DIMENSÃO</span><EditableCell value={row.dimension} onChange={(value) => edit('dimension', value)} onCommit={() => onSave(row)} testId={`board-input-dimension-${row.id}`} /></div>
      <div className="board-detail"><span>ACABAMENTO</span><EditableCell value={row.finish} onChange={(value) => edit('finish', value)} onCommit={() => onSave(row)} testId={`board-input-finish-${row.id}`} /></div>
      <div className="board-detail"><span>FORNECEDOR</span><EditableCell value={row.brand} onChange={(value) => edit('brand', value)} onCommit={() => onSave(row)} testId={`board-input-brand-${row.id}`} /></div>
      <div className="board-prices"><div><span>VERBA</span><EditableCell value={row.budget} onChange={(value) => edit('budget', value)} onCommit={() => onSave(row)} numeric testId={`board-input-budget-${row.id}`} /></div><div><span>COTADO</span><EditableCell value={row.quotedPrice} onChange={(value) => edit('quotedPrice', value)} onCommit={() => onSave(row)} numeric testId={`board-input-quoted-${row.id}`} /></div></div>
    </article>
  );
}

function ImportModal({ step, onClose, onSimulate, onComplete }: { step: 'idle' | 'ready' | 'done'; onClose: () => void; onSimulate: () => void; onComplete: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="import-modal page-enter" role="dialog" aria-modal="true" aria-labelledby="import-title">
        <div className="modal-top"><div><p className="section-kicker">ENTRADA DE DADOS</p><h2 id="import-title">Trazer planilha para a matriz</h2></div><IconButton label="Fechar modal" testId="button-close-import" onClick={onClose}><X size={18} /></IconButton></div>
        {step === 'idle' && <><label className="drop-zone" htmlFor="import-file"><CloudUpload size={30} /><strong>Solte seu .xlsx aqui</strong><span>ou selecione um arquivo do computador</span><input id="import-file" type="file" accept=".xlsx,.csv" onChange={onSimulate} data-testid="input-import-file" /></label><div className="modal-footnote"><FileSpreadsheet size={15} /> A primeira linha deve conter os nomes das colunas.</div></>}
        {step === 'ready' && <div className="import-ready"><div className="import-file"><FileSpreadsheet size={20} /><span><strong>matriz-santa-monica.xlsx</strong><small>12 KB · leitura concluída</small></span><Check size={17} /></div><div className="import-preview"><span>PRÉVIA DA LEITURA</span><strong>2 novas linhas encontradas</strong><p>Os itens serão adicionados como rascunho para revisão.</p></div><button type="button" className="button button-primary full-button" onClick={onComplete} data-testid="button-confirm-import"><Download size={15} /> Adicionar à matriz</button></div>}
        {step === 'done' && <div className="import-done"><span className="done-mark"><Check size={28} /></span><h3>Importação concluída</h3><p>As linhas foram adicionadas no topo da matriz e estão prontas para revisão.</p><button type="button" className="button button-primary full-button" onClick={onClose} data-testid="button-finish-import">Voltar à matriz</button></div>}
      </div>
    </div>
  );
}

function MatrixSkeleton() {
  return <div className="page-wrap"><div className="matrix-skeleton"><div className="skeleton-line w-20" /><div className="skeleton-line w-40" /><div className="skeleton-table" /></div></div>;
}

function EmptyPage({ type }: { type: 'suppliers' | 'settings' }) {
  const isSuppliers = type === 'suppliers';
  return (
    <div className="page-wrap page-enter">
      <Topbar eyebrow={isSuppliers ? 'WORKSPACE / RELACIONAMENTOS' : 'WORKSPACE / PREFERÊNCIAS'} title={isSuppliers ? 'Fornecedores' : 'Configurações'} action={isSuppliers ? <button type="button" className="button button-primary" onClick={() => window.alert('O cadastro de fornecedores será habilitado em breve.')} data-testid="button-new-supplier"><Plus size={16} /> Novo fornecedor</button> : undefined} />
      <div className={`useful-empty ${isSuppliers ? 'suppliers-empty' : 'settings-empty'}`}>
        <div className="empty-orbit"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" />{isSuppliers ? <Users size={34} /> : <Settings size={34} />}</div>
        <p className="section-kicker">{isSuppliers ? 'DIRETÓRIO DE COMPRAS' : 'SEU WORKSPACE'}</p>
        <h2>{isSuppliers ? 'Um lugar para cada<br /><span>parceiro de confiança.</span>' : 'Ajustes que deixam<br /><span>o trabalho no ritmo certo.</span>'}</h2>
        <p>{isSuppliers ? 'O diretório ainda está vazio. Cadastre os fornecedores que acompanham suas obras para encontrar marcas, contatos e condições sem sair do contexto da especificação.' : 'As preferências do workspace serão liberadas quando sua equipe começar a compartilhar matrizes. Por enquanto, seu espaço já está funcionando com as configurações essenciais.'}</p>
        <div className="empty-actions">{isSuppliers ? <button type="button" className="button button-primary" onClick={() => window.alert('Convite de fornecedor preparado.')} data-testid="button-invite-supplier"><Users size={15} /> Convidar fornecedor</button> : <Link href="/" className="button button-primary" data-testid="link-settings-portfolio"><LayoutDashboard size={15} /> Voltar ao portfólio</Link>}<button type="button" className="text-button" onClick={() => window.alert('Guia rápido aberto.')} data-testid="button-empty-guide">Como funciona <ArrowUpRight size={15} /></button></div>
      </div>
      <div className="empty-context"><span><BookOpen size={16} /> Dica de operação</span><p>{isSuppliers ? 'Comece pelas marmorarias e marcenarias que aparecem em mais de um projeto.' : 'Você pode editar cada célula diretamente na matriz. As cores mudam no mesmo instante.'}</p></div>
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  return (
    <ErrorBoundary resetKey={location}>
      <Shell>
        <Switch>
          <Route path="/" component={Portfolio} />
          <Route path="/projects/:projectId" component={MatrixPage} />
          <Route path="/suppliers"><EmptyPage type="suppliers" /></Route>
          <Route path="/settings"><EmptyPage type="settings" /></Route>
          <Route component={NotFound} />
        </Switch>
      </Shell>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
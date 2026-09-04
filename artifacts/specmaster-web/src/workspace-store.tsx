import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Project, Specification } from '@workspace/api-client-react';

export type Zone = 'Apartamentos' | 'Áreas Comuns' | 'Fachada';
export type ApprovalStatus = 'aprovado' | 'pendente' | 'revisao' | 'troca';

export type MatrixSpec = Specification & {
  element: string;
  revision: string;
  assignedTo: string;
  status: ApprovalStatus;
  zone: Zone;
};

export type ActivityEntry = {
  mark: string;
  label: string;
  action: string;
  target: string;
  project: string;
  time: string;
  tone: string;
};

export const CURRENT_USER = 'Marina Reis';

export const isPending = (spec: MatrixSpec) => spec.status !== 'aprovado';

type WorkspaceValue = {
  specsByProject: Record<string, MatrixSpec[]>;
  activity: ActivityEntry[];
  approvalRequest: { projectId: string; specId: string } | null;
  localProjects: Project[];
  autoImportProjectId: string | null;
  hiddenProjects: string[];
  projectNameOverrides: Record<string, string>;
  manualSuppliers: string[];
  sampleMode: boolean;
  setSpec: (projectId: string, spec: MatrixSpec) => void;
  addSpecs: (projectId: string, specs: MatrixSpec[]) => void;
  removeSpec: (projectId: string, specId: string) => void;
  seedProject: (projectId: string, specs: MatrixSpec[]) => void;
  approveSpec: (projectId: string, specId: string) => void;
  requestChange: (projectId: string, specId: string, responsible: string) => void;
  pushActivity: (entry: ActivityEntry) => void;
  requestApproval: (projectId: string, specId: string) => void;
  dismissApproval: () => void;
  createProject: (input: { name: string; client: string; location: string }) => string;
  setAutoImportProjectId: (projectId: string | null) => void;
  renameProject: (projectId: string, name: string) => void;
  deleteProject: (projectId: string) => void;
  addSupplier: (name: string) => void;
  adoptExample: () => void;
  finalizeDraft: (projectId: string, draftRow: MatrixSpec) => void;
};

const slugify = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'projeto';

const workspaceKey = (userKey: string) => `specmaster:workspace:${userKey}`;

type PersistedData = {
  specsByProject: Record<string, MatrixSpec[]>;
  activity: ActivityEntry[];
  localProjects: Project[];
  hiddenProjects: string[];
  projectNameOverrides: Record<string, string>;
  manualSuppliers: string[];
};

function loadWorkspace(userKey?: string): Partial<PersistedData> | null {
  if (!userKey) return null;
  const raw = localStorage.getItem(workspaceKey(userKey));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as Partial<PersistedData>;
  } catch {
    /* dados corrompidos: ignora */
  }
  return null;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({ children, initialSpecs, initialActivity, userKey, userName = CURRENT_USER, sampleMode = false, exampleId, exampleMeta, exampleSpecs }: { children: ReactNode; initialSpecs: Record<string, MatrixSpec[]>; initialActivity: ActivityEntry[]; userKey?: string; userName?: string; sampleMode?: boolean; exampleId?: string; exampleMeta?: Project; exampleSpecs?: MatrixSpec[] }) {
  const [saved] = useState(() => loadWorkspace(userKey));

  const [specsByProject, setSpecsByProject] = useState<Record<string, MatrixSpec[]>>(saved?.specsByProject ?? initialSpecs);
  const [activity, setActivity] = useState<ActivityEntry[]>(saved?.activity ?? initialActivity);
  const [approvalRequest, setApprovalRequest] = useState<{ projectId: string; specId: string } | null>(null);
  const [localProjects, setLocalProjects] = useState<Project[]>(saved?.localProjects ?? []);
  const [autoImportProjectId, setAutoImportProjectId] = useState<string | null>(null);
  const [hiddenProjects, setHiddenProjects] = useState<string[]>(saved?.hiddenProjects ?? []);
  const [projectNameOverrides, setProjectNameOverrides] = useState<Record<string, string>>(saved?.projectNameOverrides ?? {});
  const [manualSuppliers, setManualSuppliers] = useState<string[]>(saved?.manualSuppliers ?? []);

  useEffect(() => {
    if (!userKey) return;
    const data: PersistedData = { specsByProject, activity, localProjects, hiddenProjects, projectNameOverrides, manualSuppliers };
    localStorage.setItem(workspaceKey(userKey), JSON.stringify(data));
  }, [userKey, specsByProject, activity, localProjects, hiddenProjects, projectNameOverrides, manualSuppliers]);

  const value = useMemo<WorkspaceValue>(() => ({
    specsByProject,
    activity,
    approvalRequest,
    localProjects,
    autoImportProjectId,
    hiddenProjects,
    projectNameOverrides,
    manualSuppliers,
    sampleMode,
    setSpec: (projectId, spec) => setSpecsByProject((current) => ({ ...current, [projectId]: (current[projectId] ?? []).map((item) => (item.id === spec.id ? spec : item)) })),
    addSpecs: (projectId, specs) => setSpecsByProject((current) => ({ ...current, [projectId]: [...specs, ...(current[projectId] ?? [])] })),
    removeSpec: (projectId, specId) => setSpecsByProject((current) => ({ ...current, [projectId]: (current[projectId] ?? []).filter((item) => item.id !== specId) })),
    seedProject: (projectId, specs) => setSpecsByProject((current) => (current[projectId]?.length ? current : { ...current, [projectId]: specs })),
    approveSpec: (projectId, specId) => setSpecsByProject((current) => ({ ...current, [projectId]: (current[projectId] ?? []).map((item) => (item.id === specId ? { ...item, status: 'aprovado', assignedTo: userName } : item)) })),
    requestChange: (projectId, specId, responsible) => setSpecsByProject((current) => ({ ...current, [projectId]: (current[projectId] ?? []).map((item) => (item.id === specId ? { ...item, status: 'troca', assignedTo: responsible } : item)) })),
    pushActivity: (entry) => setActivity((current) => [entry, ...current]),
    requestApproval: (projectId, specId) => setApprovalRequest({ projectId, specId }),
    dismissApproval: () => setApprovalRequest(null),
    createProject: (input) => {
      const id = `${slugify(input.name)}-${Date.now().toString(36)}`;
      const project: Project = { id, name: input.name, client: input.client || '—', location: input.location || '—', completion: 0, updatedAt: new Date().toISOString() };
      setLocalProjects((current) => [...current, project]);
      setSpecsByProject((current) => ({ ...current, [id]: [] }));
      return id;
    },
    setAutoImportProjectId,
    renameProject: (projectId, name) => setProjectNameOverrides((current) => ({ ...current, [projectId]: name })),
    deleteProject: (projectId) => setHiddenProjects((current) => (current.includes(projectId) ? current : [...current, projectId])),
    addSupplier: (name) => setManualSuppliers((current) => (current.some((item) => item.toLowerCase() === name.toLowerCase()) ? current : [...current, name])),
    adoptExample: () => {
      if (!exampleId || !exampleMeta) return;
      setLocalProjects((current) => (current.some((project) => project.id === exampleId) ? current : [...current, { ...exampleMeta, name: `${exampleMeta.name} (exemplo)` }]));
      setSpecsByProject((current) => (current[exampleId]?.length ? current : { ...current, [exampleId]: exampleSpecs ? [...exampleSpecs] : [] }));
    },
    finalizeDraft: (projectId, draftRow) => {
      const stableId = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      setSpecsByProject((current) => ({ ...current, [projectId]: (current[projectId] ?? []).map((item) => (item.id === draftRow.id ? { ...draftRow, id: stableId } : item)) }));
    },
  }), [specsByProject, activity, approvalRequest, localProjects, autoImportProjectId, hiddenProjects, projectNameOverrides, manualSuppliers, userName, sampleMode, exampleId, exampleMeta, exampleSpecs]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace deve ser usado dentro de WorkspaceProvider');
  return ctx;
}

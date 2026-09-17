import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Project, Specification } from '@workspace/api-client-react';
import {
  deleteProjectRow,
  deleteSpecificationRow,
  fetchMemberships,
  fetchProjects,
  fetchSpecifications,
  insertProject,
  insertSpecification,
  isDbId,
  newId,
  updateProjectName,
  updateSpecificationRow,
  type Membership,
  type Role,
} from '@/data';

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
  ready: boolean;
  memberships: Membership[];
  roleOf: (projectId: string) => Role | null;
  registerMembership: (projectId: string, role: Role) => void;
  refreshMemberships: () => Promise<void>;
  reload: () => Promise<void>;
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
  adoptExample: () => string;
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({ children, initialSpecs, initialActivity, userKey, userName = CURRENT_USER, sampleMode = false, exampleMeta, exampleSpecs }: { children: ReactNode; initialSpecs: Record<string, MatrixSpec[]>; initialActivity: ActivityEntry[]; userKey?: string; userName?: string; sampleMode?: boolean; exampleMeta?: Project; exampleSpecs?: MatrixSpec[] }) {
  const [specsByProject, setSpecsByProject] = useState<Record<string, MatrixSpec[]>>(initialSpecs);
  const [activity, setActivity] = useState<ActivityEntry[]>(initialActivity);
  const [approvalRequest, setApprovalRequest] = useState<{ projectId: string; specId: string } | null>(null);
  const [localProjects, setLocalProjects] = useState<Project[]>([]);
  const [autoImportProjectId, setAutoImportProjectId] = useState<string | null>(null);
  const [hiddenProjects, setHiddenProjects] = useState<string[]>([]);
  const [projectNameOverrides, setProjectNameOverrides] = useState<Record<string, string>>({});
  const [manualSuppliers, setManualSuppliers] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [memberships, setMemberships] = useState<Membership[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [projects, specs, members] = await Promise.all([fetchProjects(), fetchSpecifications(), fetchMemberships()]);
        if (!active) return;
        setLocalProjects(projects);
        setMemberships(members.filter((member) => member.userId === userKey));
        if (!sampleMode) setSpecsByProject(specs);
      } catch {
        /* sem sessão ou offline: mantém o estado local */
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [userKey, sampleMode]);

  const registerMembership = (projectId: string, role: Role) => {
    setMemberships((current) => (current.some((item) => item.projectId === projectId) ? current : [...current, { projectId, userId: userKey ?? '', role }]));
  };

  const refreshMemberships = async () => {
    try {
      const members = await fetchMemberships();
      setMemberships(members.filter((member) => member.userId === userKey));
    } catch {
      /* ignora */
    }
  };

  const reload = async () => {
    try {
      const [projects, specs, members] = await Promise.all([fetchProjects(), fetchSpecifications(), fetchMemberships()]);
      setLocalProjects(projects);
      setMemberships(members.filter((member) => member.userId === userKey));
      if (!sampleMode) setSpecsByProject(specs);
    } catch {
      /* ignora */
    }
  };

  const persistSpec = (projectId: string, spec: MatrixSpec) => {
    if (!userKey) return;
    if (isDbId(spec.id)) {
      updateSpecificationRow(spec.id, spec).catch(() => {});
    } else {
      insertSpecification(projectId, spec)
        .then((newIdValue) => {
          setSpecsByProject((current) => ({ ...current, [projectId]: (current[projectId] ?? []).map((item) => (item.id === spec.id ? { ...spec, id: newIdValue } : item)) }));
        })
        .catch(() => {});
    }
  };

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
    ready,
    memberships,
    roleOf: (projectId) => memberships.find((item) => item.projectId === projectId)?.role ?? null,
    registerMembership,
    refreshMemberships,
    reload,
    setSpec: (projectId, spec) => {
      setSpecsByProject((current) => ({ ...current, [projectId]: (current[projectId] ?? []).map((item) => (item.id === spec.id ? spec : item)) }));
      persistSpec(projectId, spec);
    },
    addSpecs: (projectId, specs) => {
      setSpecsByProject((current) => ({ ...current, [projectId]: [...specs, ...(current[projectId] ?? [])] }));
      specs.forEach((spec) => persistSpec(projectId, spec));
    },
    removeSpec: (projectId, specId) => {
      setSpecsByProject((current) => ({ ...current, [projectId]: (current[projectId] ?? []).filter((item) => item.id !== specId) }));
      if (isDbId(specId)) deleteSpecificationRow(specId).catch(() => {});
    },
    seedProject: (projectId, specs) => setSpecsByProject((current) => (current[projectId]?.length ? current : { ...current, [projectId]: specs })),
    approveSpec: (projectId, specId) => {
      const changed = (specsByProject[projectId] ?? []).find((item) => item.id === specId);
      const next = changed ? { ...changed, status: 'aprovado' as ApprovalStatus, assignedTo: userName } : null;
      setSpecsByProject((current) => ({ ...current, [projectId]: (current[projectId] ?? []).map((item) => (item.id === specId ? { ...item, status: 'aprovado', assignedTo: userName } : item)) }));
      if (next && isDbId(specId)) updateSpecificationRow(specId, next).catch(() => {});
    },
    requestChange: (projectId, specId, responsible) => {
      const changed = (specsByProject[projectId] ?? []).find((item) => item.id === specId);
      const next = changed ? { ...changed, status: 'troca' as ApprovalStatus, assignedTo: responsible } : null;
      setSpecsByProject((current) => ({ ...current, [projectId]: (current[projectId] ?? []).map((item) => (item.id === specId ? { ...item, status: 'troca', assignedTo: responsible } : item)) }));
      if (next && isDbId(specId)) updateSpecificationRow(specId, next).catch(() => {});
    },
    pushActivity: (entry) => setActivity((current) => [entry, ...current]),
    requestApproval: (projectId, specId) => setApprovalRequest({ projectId, specId }),
    dismissApproval: () => setApprovalRequest(null),
    createProject: (input) => {
      const id = newId();
      const project: Project = { id, name: input.name, client: input.client || '—', location: input.location || '—', completion: 0, updatedAt: new Date().toISOString() };
      setLocalProjects((current) => [...current, project]);
      setSpecsByProject((current) => ({ ...current, [id]: [] }));
      registerMembership(id, 'admin');
      if (userKey) insertProject({ id, ownerId: userKey, name: project.name, client: project.client, location: project.location }).catch(() => {});
      return id;
    },
    setAutoImportProjectId,
    renameProject: (projectId, name) => {
      setProjectNameOverrides((current) => ({ ...current, [projectId]: name }));
      setLocalProjects((current) => current.map((project) => (project.id === projectId ? { ...project, name } : project)));
      if (isDbId(projectId)) updateProjectName(projectId, name).catch(() => {});
    },
    deleteProject: (projectId) => {
      setHiddenProjects((current) => (current.includes(projectId) ? current : [...current, projectId]));
      setLocalProjects((current) => current.filter((project) => project.id !== projectId));
      setMemberships((current) => current.filter((item) => item.projectId !== projectId));
      if (isDbId(projectId)) deleteProjectRow(projectId).catch(() => {});
    },
    addSupplier: (name) => setManualSuppliers((current) => (current.some((item) => item.toLowerCase() === name.toLowerCase()) ? current : [...current, name])),
    adoptExample: () => {
      if (!exampleMeta) return '';
      const id = newId();
      const project: Project = { ...exampleMeta, id, name: `${exampleMeta.name} (exemplo)`, completion: 0, updatedAt: new Date().toISOString() };
      setLocalProjects((current) => (current.some((item) => item.id === id) ? current : [...current, project]));
      setSpecsByProject((current) => ({ ...current, [id]: exampleSpecs ? exampleSpecs.map((spec) => ({ ...spec })) : [] }));
      registerMembership(id, 'admin');
      if (userKey) {
        insertProject({ id, ownerId: userKey, name: project.name, client: project.client, location: project.location })
          .then(() => {
            (exampleSpecs ?? []).forEach((spec) => persistSpec(id, spec));
          })
          .catch(() => {});
      }
      return id;
    },
  }), [specsByProject, activity, approvalRequest, localProjects, autoImportProjectId, hiddenProjects, projectNameOverrides, manualSuppliers, userName, sampleMode, ready, memberships, exampleMeta, exampleSpecs, userKey]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace deve ser usado dentro de WorkspaceProvider');
  return ctx;
}

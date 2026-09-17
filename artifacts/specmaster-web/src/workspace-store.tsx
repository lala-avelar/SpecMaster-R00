import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Project, Specification } from '@workspace/api-client-react';
import {
  deleteProjectRow,
  deleteSpecificationRow,
  fetchMemberships,
  fetchProjectZones,
  fetchProjects,
  fetchRecentActivity,
  fetchSpecifications,
  insertActivity,
  insertProject,
  insertSpecification,
  isDbId,
  newId,
  updateProjectName,
  updateProjectZones,
  updateSpecificationRow,
  type ActivityDbRow,
  type Membership,
  type Role,
} from '@/data';

export type Zone = string;
export const DEFAULT_ZONES = ['Apartamentos', 'Áreas Comuns', 'Fachada'];
export type ApprovalStatus = 'aprovado' | 'pendente' | 'revisao' | 'troca';

export type MatrixSpec = Specification & {
  element: string;
  revision: string;
  assignedTo: string;
  status: ApprovalStatus;
  zone: Zone;
  changeType?: string;
  changeReason?: string;
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

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  return `há ${Math.floor(hours / 24)} d`;
}

function activityFromRow(row: ActivityDbRow, projectName: string): ActivityEntry {
  const initials = row.author_name ? row.author_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() : '?';
  return { mark: initials, label: row.author_name || 'Alguém', action: row.action, target: row.target, project: projectName, time: relativeTime(row.created_at), tone: 'ink' };
}

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
  zonesByProject: Record<string, string[]>;
  zonesOf: (projectId: string) => string[];
  setProjectZones: (projectId: string, zones: string[]) => void;
  registerMembership: (projectId: string, role: Role) => void;
  refreshMemberships: () => Promise<void>;
  reload: () => Promise<void>;
  setSpec: (projectId: string, spec: MatrixSpec) => void;
  addSpecs: (projectId: string, specs: MatrixSpec[]) => void;
  removeSpec: (projectId: string, specId: string) => void;
  seedProject: (projectId: string, specs: MatrixSpec[]) => void;
  approveSpec: (projectId: string, specId: string) => void;
  requestChange: (projectId: string, specId: string, reason: string, changeType: string, assignee: string) => void;
  rejectChange: (projectId: string, specId: string) => void;
  pushActivity: (projectId: string, entry: ActivityEntry) => void;
  activityOf: (projectId: string) => ActivityEntry[];
  requestApproval: (projectId: string, specId: string) => void;
  dismissApproval: () => void;
  createProject: (input: { name: string; client: string; location: string; zones?: string[] }) => string;
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
  const [activityByProject, setActivityByProject] = useState<Record<string, ActivityEntry[]>>({});
  const [approvalRequest, setApprovalRequest] = useState<{ projectId: string; specId: string } | null>(null);
  const [localProjects, setLocalProjects] = useState<Project[]>([]);
  const [autoImportProjectId, setAutoImportProjectId] = useState<string | null>(null);
  const [hiddenProjects, setHiddenProjects] = useState<string[]>([]);
  const [projectNameOverrides, setProjectNameOverrides] = useState<Record<string, string>>({});
  const [manualSuppliers, setManualSuppliers] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [zonesByProject, setZonesByProject] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [projects, specs, members, zones] = await Promise.all([fetchProjects(), fetchSpecifications(), fetchMemberships(), fetchProjectZones()]);
        if (!active) return;
        setLocalProjects(projects);
        setMemberships(members.filter((member) => member.userId === userKey));
        setZonesByProject(zones);
        if (!sampleMode) setSpecsByProject(specs);
        if (!sampleMode) {
          try {
            const recent = await fetchRecentActivity();
            if (!active) return;
            const nameById = new Map(projects.map((project) => [project.id, project.name]));
            const grouped: Record<string, ActivityEntry[]> = {};
            const flat: ActivityEntry[] = [];
            for (const row of recent) {
              const entry = activityFromRow(row, nameById.get(row.project_id) ?? 'Projeto');
              (grouped[row.project_id] ??= []).push(entry);
              flat.push(entry);
            }
            setActivityByProject(grouped);
            setActivity(flat);
          } catch {
            /* tabela de atividade indisponível */
          }
        }
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
      const [projects, specs, members, zones] = await Promise.all([fetchProjects(), fetchSpecifications(), fetchMemberships(), fetchProjectZones()]);
      setLocalProjects(projects);
      setMemberships(members.filter((member) => member.userId === userKey));
      setZonesByProject(zones);
      if (!sampleMode) setSpecsByProject(specs);
      if (!sampleMode) {
        try {
          const recent = await fetchRecentActivity();
          const nameById = new Map(projects.map((project) => [project.id, project.name]));
          const grouped: Record<string, ActivityEntry[]> = {};
          const flat: ActivityEntry[] = [];
          for (const row of recent) {
            const entry = activityFromRow(row, nameById.get(row.project_id) ?? 'Projeto');
            (grouped[row.project_id] ??= []).push(entry);
            flat.push(entry);
          }
          setActivityByProject(grouped);
          setActivity(flat);
        } catch {
          /* ignora */
        }
      }
    } catch {
      /* ignora */
    }
  };

  const setProjectZones = (projectId: string, zones: string[]) => {
    setZonesByProject((current) => ({ ...current, [projectId]: zones }));
    if (isDbId(projectId)) updateProjectZones(projectId, zones).catch(() => {});
  };

  const zonesOf = (projectId: string) => (zonesByProject[projectId]?.length ? zonesByProject[projectId] : DEFAULT_ZONES);

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
    zonesByProject,
    zonesOf,
    setProjectZones,
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
      const next = changed ? { ...changed, status: 'aprovado' as ApprovalStatus, assignedTo: userName, changeType: '', changeReason: '' } : null;
      setSpecsByProject((current) => ({ ...current, [projectId]: (current[projectId] ?? []).map((item) => (item.id === specId ? { ...item, status: 'aprovado', assignedTo: userName, changeType: '', changeReason: '' } : item)) }));
      if (next && isDbId(specId)) updateSpecificationRow(specId, next).catch(() => {});
    },
    requestChange: (projectId, specId, reason, changeType, assignee) => {
      const changed = (specsByProject[projectId] ?? []).find((item) => item.id === specId);
      const next = changed ? { ...changed, status: 'troca' as ApprovalStatus, assignedTo: assignee, changeType, changeReason: reason } : null;
      setSpecsByProject((current) => ({ ...current, [projectId]: (current[projectId] ?? []).map((item) => (item.id === specId ? { ...item, status: 'troca', assignedTo: assignee, changeType, changeReason: reason } : item)) }));
      if (next && isDbId(specId)) updateSpecificationRow(specId, next).catch(() => {});
    },
    rejectChange: (projectId, specId) => {
      const changed = (specsByProject[projectId] ?? []).find((item) => item.id === specId);
      const next = changed ? { ...changed, status: 'pendente' as ApprovalStatus, changeType: '', changeReason: '' } : null;
      setSpecsByProject((current) => ({ ...current, [projectId]: (current[projectId] ?? []).map((item) => (item.id === specId ? { ...item, status: 'pendente', changeType: '', changeReason: '' } : item)) }));
      if (next && isDbId(specId)) updateSpecificationRow(specId, next).catch(() => {});
    },
    pushActivity: (projectId, entry) => {
      setActivity((current) => [entry, ...current]);
      setActivityByProject((current) => ({ ...current, [projectId]: [entry, ...(current[projectId] ?? [])] }));
      if (userKey) insertActivity({ projectId, userId: userKey, authorName: entry.label, action: entry.action, target: entry.target }).catch(() => {});
    },
    activityOf: (projectId) => activityByProject[projectId] ?? [],
    requestApproval: (projectId, specId) => setApprovalRequest({ projectId, specId }),
    dismissApproval: () => setApprovalRequest(null),
    createProject: (input) => {
      const id = newId();
      const zones = input.zones && input.zones.length ? input.zones : DEFAULT_ZONES;
      const project: Project = { id, name: input.name, client: input.client || '—', location: input.location || '—', completion: 0, updatedAt: new Date().toISOString() };
      setLocalProjects((current) => [...current, project]);
      setSpecsByProject((current) => ({ ...current, [id]: [] }));
      setZonesByProject((current) => ({ ...current, [id]: zones }));
      registerMembership(id, 'admin');
      if (userKey) insertProject({ id, ownerId: userKey, name: project.name, client: project.client, location: project.location, zones }).catch(() => {});
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
      setZonesByProject((current) => ({ ...current, [id]: DEFAULT_ZONES }));
      registerMembership(id, 'admin');
      if (userKey) {
        insertProject({ id, ownerId: userKey, name: project.name, client: project.client, location: project.location, zones: DEFAULT_ZONES })
          .then(() => {
            (exampleSpecs ?? []).forEach((spec) => persistSpec(id, spec));
          })
          .catch(() => {});
      }
      return id;
    },
  }), [specsByProject, activity, activityByProject, approvalRequest, localProjects, autoImportProjectId, hiddenProjects, projectNameOverrides, manualSuppliers, userName, sampleMode, ready, memberships, zonesByProject, exampleMeta, exampleSpecs, userKey]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace deve ser usado dentro de WorkspaceProvider');
  return ctx;
}

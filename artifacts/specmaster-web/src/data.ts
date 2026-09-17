import type { Project } from '@workspace/api-client-react';
import { supabase } from '@/supabase';
import type { ApprovalStatus, MatrixSpec, Zone } from '@/workspace-store';

type DbProject = {
  id: string;
  name: string;
  client: string;
  location: string;
  updated_at: string;
};

type DbSpec = {
  id: string;
  project_id: string;
  environment: string;
  element: string;
  item: string;
  dimension: string;
  finish: string;
  brand: string;
  budget: number;
  quoted_price: number;
  area_total: number;
  revision: string;
  assigned_to: string;
  status: string;
  zone: string;
  change_type: string;
  change_reason: string;
  updated_at: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isDbId = (id: string) => UUID_RE.test(id);

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function toProject(row: DbProject): Project {
  return { id: row.id, name: row.name, client: row.client, location: row.location, completion: 0, updatedAt: row.updated_at };
}

export function toSpec(row: DbSpec): MatrixSpec {
  return {
    id: row.id,
    environment: row.environment,
    item: row.item,
    dimension: row.dimension,
    finish: row.finish,
    brand: row.brand,
    budget: Number(row.budget) || 0,
    quotedPrice: Number(row.quoted_price) || 0,
    areaTotal: Number(row.area_total) || 0,
    updatedAt: row.updated_at,
    element: row.element,
    revision: row.revision,
    assignedTo: row.assigned_to,
    status: row.status as ApprovalStatus,
    zone: row.zone as Zone,
    changeType: row.change_type ?? '',
    changeReason: row.change_reason ?? '',
  };
}

function specFields(spec: MatrixSpec) {
  return {
    environment: spec.environment,
    element: spec.element,
    item: spec.item,
    dimension: spec.dimension,
    finish: spec.finish,
    brand: spec.brand,
    budget: Number(spec.budget) || 0,
    quoted_price: Number(spec.quotedPrice) || 0,
    area_total: Number(spec.areaTotal) || 0,
    revision: spec.revision,
    assigned_to: spec.assignedTo,
    status: spec.status,
    zone: spec.zone,
    change_type: spec.changeType ?? '',
    change_reason: spec.changeReason ?? '',
    updated_at: new Date().toISOString(),
  };
}

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data as DbProject[]).map(toProject);
}

export async function fetchSpecifications(): Promise<Record<string, MatrixSpec[]>> {
  const { data, error } = await supabase.from('specifications').select('*');
  if (error) throw error;
  const grouped: Record<string, MatrixSpec[]> = {};
  for (const row of data as DbSpec[]) {
    (grouped[row.project_id] ??= []).push(toSpec(row));
  }
  return grouped;
}

export async function insertProject(input: { id: string; ownerId: string; name: string; client: string; location: string; zones?: string[] }): Promise<void> {
  const { error } = await supabase.from('projects').insert({
    id: input.id,
    owner_id: input.ownerId,
    name: input.name,
    client: input.client,
    location: input.location,
    zones: input.zones ?? null,
  });
  if (error) throw error;
}

export async function fetchProjectZones(): Promise<Record<string, string[]>> {
  const { data, error } = await supabase.from('projects').select('*');
  if (error) throw error;
  const out: Record<string, string[]> = {};
  for (const row of data as { id: string; zones?: string[] | null }[]) {
    if (Array.isArray(row.zones) && row.zones.length) out[row.id] = row.zones;
  }
  return out;
}

export async function updateProjectZones(id: string, zones: string[]): Promise<void> {
  const { error } = await supabase.from('projects').update({ zones }).eq('id', id);
  if (error) throw error;
}

export async function updateProjectName(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('projects').update({ name, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteProjectRow(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

export async function insertSpecification(projectId: string, spec: MatrixSpec): Promise<string> {
  const payload = { project_id: projectId, ...specFields(spec) };
  let { data, error } = await supabase.from('specifications').insert(payload).select('id').single();
  if (error && /change_type|change_reason/.test(error.message)) {
    const { change_type: _ct, change_reason: _cr, ...rest } = payload;
    ({ data, error } = await supabase.from('specifications').insert(rest).select('id').single());
  }
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function updateSpecificationRow(specId: string, spec: MatrixSpec): Promise<void> {
  const payload = specFields(spec);
  let { error } = await supabase.from('specifications').update(payload).eq('id', specId);
  if (error && /change_type|change_reason/.test(error.message)) {
    const { change_type: _ct, change_reason: _cr, ...rest } = payload;
    ({ error } = await supabase.from('specifications').update(rest).eq('id', specId));
  }
  if (error) throw error;
}

export async function deleteSpecificationRow(specId: string): Promise<void> {
  const { error } = await supabase.from('specifications').delete().eq('id', specId);
  if (error) throw error;
}

export type Role = 'admin' | 'approver' | 'editor' | 'viewer';
export type Membership = { projectId: string; userId: string; role: Role };
export type MemberInfo = { userId: string; role: Role; name: string; email: string; company: string };

export async function fetchMemberships(): Promise<Membership[]> {
  const { data, error } = await supabase.from('project_members').select('project_id, user_id, role');
  if (error) throw error;
  return (data as { project_id: string; user_id: string; role: Role }[]).map((row) => ({ projectId: row.project_id, userId: row.user_id, role: row.role }));
}

export async function fetchProjectMembers(projectId: string): Promise<MemberInfo[]> {
  const { data, error } = await supabase.from('project_members').select('user_id, role').eq('project_id', projectId);
  if (error) throw error;
  const rows = data as { user_id: string; role: Role }[];
  if (!rows.length) return [];
  const ids = rows.map((row) => row.user_id);
  const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, name, email, company').in('id', ids);
  if (profileError) throw profileError;
  const byId = new Map((profiles as { id: string; name: string; email: string | null; company: string }[]).map((profile) => [profile.id, profile]));
  return rows.map((row) => {
    const profile = byId.get(row.user_id);
    return { userId: row.user_id, role: row.role, name: profile?.name ?? '', email: profile?.email ?? '', company: profile?.company ?? '' };
  });
}

export async function updateMemberRole(projectId: string, userId: string, role: Role): Promise<void> {
  const { error } = await supabase.from('project_members').update({ role }).eq('project_id', projectId).eq('user_id', userId);
  if (error) throw error;
}

export async function removeMember(projectId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('project_members').delete().eq('project_id', projectId).eq('user_id', userId);
  if (error) throw error;
}

export async function createInvitation(input: { projectId: string; email: string; role: Role; expiresAt: string | null; createdBy: string }): Promise<string> {
  const { data, error } = await supabase
    .from('invitations')
    .insert({ project_id: input.projectId, email: input.email || null, role: input.role, expires_at: input.expiresAt, created_by: input.createdBy })
    .select('token')
    .single();
  if (error) throw error;
  return (data as { token: string }).token;
}

export async function acceptInvitation(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_invitation', { p_token: token });
  if (error) throw error;
  return data as string;
}

export type Invitation = {
  id: string;
  email: string | null;
  role: Role;
  token: string;
  expiresAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
};

export async function fetchInvitations(projectId: string): Promise<Invitation[]> {
  const { data, error } = await supabase
    .from('invitations')
    .select('id, email, role, token, expires_at, accepted_at, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as { id: string; email: string | null; role: Role; token: string; expires_at: string | null; accepted_at: string | null; created_at: string }[]).map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    token: row.token,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    createdAt: row.created_at,
  }));
}

export async function revokeInvitation(id: string): Promise<void> {
  const { error } = await supabase.from('invitations').delete().eq('id', id);
  if (error) throw error;
}

export type ActivityDbRow = { id: string; project_id: string; author_name: string; action: string; target: string; created_at: string };

export async function fetchRecentActivity(limit = 60): Promise<ActivityDbRow[]> {
  const { data, error } = await supabase
    .from('project_activity')
    .select('id, project_id, author_name, action, target, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as ActivityDbRow[];
}

export async function insertActivity(input: { projectId: string; userId: string; authorName: string; action: string; target: string }): Promise<void> {
  const { error } = await supabase.from('project_activity').insert({
    project_id: input.projectId,
    user_id: input.userId,
    author_name: input.authorName,
    action: input.action,
    target: input.target,
  });
  if (error) throw error;
}




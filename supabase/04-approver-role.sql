alter table public.project_members drop constraint if exists project_members_role_check;
alter table public.project_members add constraint project_members_role_check check (role in ('admin', 'approver', 'editor', 'viewer'));

alter table public.invitations drop constraint if exists invitations_role_check;
alter table public.invitations add constraint invitations_role_check check (role in ('admin', 'approver', 'editor', 'viewer'));

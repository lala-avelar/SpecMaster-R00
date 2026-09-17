create table if not exists public.project_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null default '',
  action text not null default '',
  target text not null default '',
  created_at timestamptz not null default now()
);

alter table public.project_activity enable row level security;

drop policy if exists activity_select on public.project_activity;
create policy activity_select on public.project_activity for select
  using (public.is_project_member(project_id));

drop policy if exists activity_insert on public.project_activity;
create policy activity_insert on public.project_activity for insert
  with check (public.is_project_member(project_id));

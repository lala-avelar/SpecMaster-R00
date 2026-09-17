create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  role text not null default '',
  company text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  client text not null default '—',
  location text not null default '—',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email text,
  role text not null check (role in ('admin', 'editor', 'viewer')),
  token text not null unique default gen_random_uuid()::text,
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.specifications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  environment text not null default '',
  element text not null default '',
  item text not null default '',
  dimension text not null default '',
  finish text not null default '',
  brand text not null default '',
  budget numeric not null default 0,
  quoted_price numeric not null default 0,
  area_total numeric not null default 0,
  revision text not null default 'R01',
  assigned_to text not null default '',
  status text not null default 'pendente',
  zone text not null default 'Apartamentos',
  updated_at timestamptz not null default now()
);

create or replace function public.is_project_member(p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.project_members m
    where m.project_id = p_project and m.user_id = auth.uid()
  );
$$;

create or replace function public.project_role(p_project uuid)
returns text language sql stable security definer set search_path = public as $$
  select m.role from public.project_members m
  where m.project_id = p_project and m.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_edit_project(p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.project_role(p_project) in ('admin', 'editor'), false);
$$;

create or replace function public.is_project_admin(p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.project_role(p_project) = 'admin';
$$;

create or replace function public.shares_project_with(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.project_members me
    join public.project_members other on other.project_id = me.project_id
    where me.user_id = auth.uid() and other.user_id = p_user
  );
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, role, company)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', ''),
    coalesce(new.raw_user_meta_data->>'company', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_new_project()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'admin')
  on conflict (project_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_project_created on public.projects;
create trigger on_project_created
  after insert on public.projects
  for each row execute function public.handle_new_project();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.invitations enable row level security;
alter table public.specifications enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.shares_project_with(id));
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert
  with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select
  using (public.is_project_member(id) or owner_id = auth.uid());
drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects for insert
  with check (owner_id = auth.uid());
drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects for update
  using (public.is_project_admin(id)) with check (public.is_project_admin(id));
drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects for delete
  using (public.is_project_admin(id));

drop policy if exists members_select on public.project_members;
create policy members_select on public.project_members for select
  using (public.is_project_member(project_id) or user_id = auth.uid());
drop policy if exists members_insert on public.project_members;
create policy members_insert on public.project_members for insert
  with check (
    public.is_project_admin(project_id)
    or (user_id = auth.uid() and exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    ))
  );
drop policy if exists members_update on public.project_members;
create policy members_update on public.project_members for update
  using (public.is_project_admin(project_id)) with check (public.is_project_admin(project_id));
drop policy if exists members_delete on public.project_members;
create policy members_delete on public.project_members for delete
  using (public.is_project_admin(project_id));

drop policy if exists invitations_select on public.invitations;
create policy invitations_select on public.invitations for select
  using (public.is_project_admin(project_id) or lower(email) = lower(auth.jwt() ->> 'email'));
drop policy if exists invitations_insert on public.invitations;
create policy invitations_insert on public.invitations for insert
  with check (public.is_project_admin(project_id));
drop policy if exists invitations_update on public.invitations;
create policy invitations_update on public.invitations for update
  using (public.is_project_admin(project_id)) with check (public.is_project_admin(project_id));
drop policy if exists invitations_delete on public.invitations;
create policy invitations_delete on public.invitations for delete
  using (public.is_project_admin(project_id));

drop policy if exists specs_select on public.specifications;
create policy specs_select on public.specifications for select
  using (public.is_project_member(project_id));
drop policy if exists specs_insert on public.specifications;
create policy specs_insert on public.specifications for insert
  with check (public.can_edit_project(project_id));
drop policy if exists specs_update on public.specifications;
create policy specs_update on public.specifications for update
  using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
drop policy if exists specs_delete on public.specifications;
create policy specs_delete on public.specifications for delete
  using (public.can_edit_project(project_id));

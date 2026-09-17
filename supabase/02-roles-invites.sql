alter table public.profiles add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, role, company, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', ''),
    coalesce(new.raw_user_meta_data->>'company', ''),
    new.email
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create or replace function public.accept_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  inv public.invitations;
  invited_email text;
begin
  select * into inv
  from public.invitations
  where token = p_token
    and accepted_at is null
    and (expires_at is null or expires_at > now())
  limit 1;

  if inv.id is null then
    raise exception 'Convite inválido ou expirado';
  end if;

  invited_email := lower(coalesce(inv.email, ''));
  if invited_email <> '' and invited_email <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'Este convite é para outro e-mail';
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (inv.project_id, auth.uid(), inv.role)
  on conflict (project_id, user_id) do nothing;

  update public.invitations set accepted_at = now() where id = inv.id;

  return inv.project_id;
end;
$$;

grant execute on function public.accept_invitation(text) to authenticated;

alter table public.specifications add column if not exists change_type text not null default '';
alter table public.specifications add column if not exists change_reason text not null default '';

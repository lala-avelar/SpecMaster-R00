alter table public.projects add column if not exists zones text[];

update public.projects
set zones = array['Apartamentos', 'Áreas Comuns', 'Fachada']
where zones is null or array_length(zones, 1) is null;

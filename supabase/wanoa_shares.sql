-- Enlaces cortos para los archivos de wanoa_tmp.
-- Ejecutar en el SQL editor. La clave publishable no puede crear la tabla.
-- Después hay que publicar la función:
--   npx supabase login
--   npx supabase link --project-ref ymyrdyuwrtborbpcrswx
--   npx supabase functions deploy s --no-verify-jwt

create table if not exists public.wanoa_shares (
  code text primary key,
  object_path text not null,
  preview_path text,
  preview_width integer,
  preview_height integer,
  content_type text not null,
  filename text not null,
  byte_size bigint not null,
  expires_at timestamptz not null default (now() + interval '10 days')
);

create or replace function public.wanoa_shares_force_expiry()
returns trigger
language plpgsql
as $$
begin
  new.expires_at := now() + interval '10 days';
  return new;
end;
$$;

drop trigger if exists wanoa_shares_force_expiry on public.wanoa_shares;
create trigger wanoa_shares_force_expiry
before insert on public.wanoa_shares
for each row
execute function public.wanoa_shares_force_expiry();

alter table public.wanoa_shares enable row level security;

revoke all on public.wanoa_shares from anon, authenticated;
grant insert on public.wanoa_shares to anon, authenticated;

drop policy if exists "wanoa_shares anon insert" on public.wanoa_shares;
create policy "wanoa_shares anon insert"
on public.wanoa_shares
for insert
to anon, authenticated
with check (
  code ~ '^[0-9A-Za-z]{8}$'
  and starts_with(object_path, 'shares/' || code || '.')
  and (preview_path is null or preview_path = 'shares/' || code || '-preview.jpg')
  and content_type in (
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/pdf'
  )
  and byte_size > 0
  and byte_size <= 52428800
  and char_length(filename) between 1 and 180
);

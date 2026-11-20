-- Políticas y límites del bucket privado wanoa_tmp.
-- Ejecutar en el SQL editor de Supabase (la clave publishable no puede aplicar esto).
--
-- Además, en Storage → Settings, dejar el límite global de archivo en 50 MB.
-- En el plan Free ese es el máximo y aplica a todos los buckets.

update storage.buckets
set
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/pdf'
  ]
where id = 'wanoa_tmp';

drop policy if exists "wanoa_tmp anon insert" on storage.objects;
drop policy if exists "wanoa_tmp sign without list" on storage.objects;

create policy "wanoa_tmp anon insert"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'wanoa_tmp');

-- SELECT alcanza para firmar el enlace. allow_any_operation evita listar
-- los archivos de otras personas con la clave publishable.
-- object.sign es obligatorio: sin esa operación, createSignedUrl responde
-- "Object not found" aunque la subida y la lectura autenticada funcionen.
create policy "wanoa_tmp sign without list"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'wanoa_tmp'
  and storage.allow_any_operation(array[
    'object.sign',
    'object.get_authenticated_info',
    'object.get_authenticated'
  ])
);

-- Si createSignedUrl responde 403 o 400 por la política de arriba, reemplazarla por:
--
-- drop policy if exists "wanoa_tmp sign without list" on storage.objects;
-- create policy "wanoa_tmp sign without list"
-- on storage.objects for select
-- to anon, authenticated
-- using (bucket_id = 'wanoa_tmp');
--
-- Ese fallback permite listar nombres de objeto con la clave publishable.
-- No hay política de UPDATE ni DELETE para anon: la app no pisa ni borra archivos.
-- Borrar objetos de más de 10 días requiere la clave secreta (cron o Edge Function).

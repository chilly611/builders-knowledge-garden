-- 20260817_brand_assets_bucket_glb_mime.sql
--
-- Admit GLB binaries into the shared `brand-assets` storage bucket.
--
-- WHY: scripts/media/03_upload_studio.py uploads Draco-compressed GLB meshes with
-- contentType model/gltf-binary. Verified read-only on vlezoyalutexenbnzzui
-- (knowledge-gardens-prod) on 2026-08-17, the bucket admits only:
--
--   image/png, image/jpeg, image/webp, image/svg+xml, video/mp4, video/webm
--
-- so every GLB upload is rejected by storage before it ever reaches the catalog.
-- (video/mp4 is already admitted, which is why the Higgsfield motion keepers need
-- no bucket change — only the GLBs do.)
--
-- This migration APPENDS model/gltf-binary and changes nothing else. Existing
-- types are preserved verbatim, so no current writer for any tenant can break.
--
-- SCOPE WARNING: `brand-assets` is shared across every garden scope in this
-- instance (studio, bkg, tkg, umbrella, mktkg, hkg, cross-cutting as of
-- 2026-08-17). Widening its MIME allow-list widens it for all of them. That is
-- the intent here — a bucket-level allow-list cannot be scoped per prefix — but
-- it is a multi-tenant change, not a bkg-local one.

begin;

-- Guard: only touch the bucket we actually inspected, and only if it still has
-- the allow-list shape this migration was written against.
do $$
declare current_types text[];
begin
  select allowed_mime_types into current_types
  from storage.buckets where id = 'brand-assets';

  if current_types is null then
    raise exception 'brand-assets has no MIME allow-list (null = allow all) — schema drifted, review before applying';
  end if;

  if not (current_types @> array['video/mp4']::text[]) then
    raise exception 'brand-assets allow-list is not the shape expected (video/mp4 absent) — review before applying';
  end if;
end $$;

update storage.buckets
set allowed_mime_types = (
  select array_agg(distinct t order by t)
  from unnest(allowed_mime_types || array['model/gltf-binary']::text[]) as t
)
where id = 'brand-assets'
  and not (allowed_mime_types @> array['model/gltf-binary']::text[]);

-- Post-condition: refuse to commit unless the new type is actually present, so a
-- silently-skipped update cannot look like success.
do $$
begin
  if not exists (
    select 1 from storage.buckets
    where id = 'brand-assets'
      and allowed_mime_types @> array['model/gltf-binary']::text[]
  ) then
    raise exception 'model/gltf-binary still absent after update — aborting';
  end if;
end $$;

commit;

-- DOWN (manual): remove the added type. Safe only once no GLB objects remain in
-- the bucket, or those rows become unservable.
--
-- update storage.buckets
-- set allowed_mime_types = array_remove(allowed_mime_types, 'model/gltf-binary')
-- where id = 'brand-assets';

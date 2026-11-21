-- Let owners upload images for their own people and places.
--
-- The policies from 003 only allowed a non-GM to write a path that was already
-- stored on an entity they own (`image = name`). A first upload never matches,
-- and replacing an existing file was refused as well, so players could not set
-- images for their own characters at all. Banners (`banners/`) had no policy,
-- so nobody, not even a GM, could upload one.
--
-- Uploads now go into a folder named after the entity: `people/<person id>/…`,
-- `banners/<person id>/…` and `places/<place id>/…`. The owner of that entity
-- may insert, update and delete there. The old rule stays for the flat legacy
-- paths (`people/ao.jpg`) while an owned entity still references them. GMs may
-- write anything, as before.
--
-- Inside the EXISTS subqueries the object path must be written `objects.name`:
-- people and places have a `name` column of their own, and an unqualified
-- `name` resolves to it. That is why the 003 policies never matched for owners
-- (`image = name` compared the image path with the person's name).
--
-- The id is compared as text, so legacy file names in the second segment never
-- raise a uuid cast error.

DROP POLICY IF EXISTS "Users can upload people files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update people files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete people files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload places files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update places files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete places files" ON storage.objects;

-- people/ and banners/ belong to people ------------------------------------

CREATE POLICY "Users can upload people files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'the-eighth'
  AND split_part(name, '/', 1) IN ('people', 'banners')
  AND (
    EXISTS (
      SELECT 1 FROM people
      WHERE owner_id = auth.uid()
      AND (id::text = split_part(objects.name, '/', 2) OR image = objects.name OR banner = objects.name)
    )
    OR is_gm()
  )
);

CREATE POLICY "Users can update people files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'the-eighth'
  AND split_part(name, '/', 1) IN ('people', 'banners')
  AND (
    EXISTS (
      SELECT 1 FROM people
      WHERE owner_id = auth.uid()
      AND (id::text = split_part(objects.name, '/', 2) OR image = objects.name OR banner = objects.name)
    )
    OR is_gm()
  )
);

CREATE POLICY "Users can delete people files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'the-eighth'
  AND split_part(name, '/', 1) IN ('people', 'banners')
  AND (
    EXISTS (
      SELECT 1 FROM people
      WHERE owner_id = auth.uid()
      AND (id::text = split_part(objects.name, '/', 2) OR image = objects.name OR banner = objects.name)
    )
    OR is_gm()
  )
);

-- places/ belongs to places ------------------------------------------------

CREATE POLICY "Users can upload places files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'the-eighth'
  AND split_part(name, '/', 1) = 'places'
  AND (
    EXISTS (
      SELECT 1 FROM places
      WHERE owner_id = auth.uid()
      AND (id::text = split_part(objects.name, '/', 2) OR image = objects.name)
    )
    OR is_gm()
  )
);

CREATE POLICY "Users can update places files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'the-eighth'
  AND split_part(name, '/', 1) = 'places'
  AND (
    EXISTS (
      SELECT 1 FROM places
      WHERE owner_id = auth.uid()
      AND (id::text = split_part(objects.name, '/', 2) OR image = objects.name)
    )
    OR is_gm()
  )
);

CREATE POLICY "Users can delete places files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'the-eighth'
  AND split_part(name, '/', 1) = 'places'
  AND (
    EXISTS (
      SELECT 1 FROM places
      WHERE owner_id = auth.uid()
      AND (id::text = split_part(objects.name, '/', 2) OR image = objects.name)
    )
    OR is_gm()
  )
);

-- ============================================================================
-- Storage Buckets and Policies
-- ============================================================================

-- Create the main storage bucket for TheEighth
INSERT INTO storage.buckets (id, name, public)
VALUES ('the-eighth', 'the-eighth', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE RLS POLICIES
-- ============================================================================

-- Public read access for all files
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'the-eighth');

-- ============================================================================
-- UPLOAD POLICIES
-- ============================================================================

-- Authenticated users can upload files to people/ folder
-- (they must be owner of a person with matching image/banner path)
CREATE POLICY "Users can upload people files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'the-eighth'
  AND auth.role() = 'authenticated'
  AND name LIKE 'people/%'
  AND (
    -- Check if this path matches an owned person's image or banner
    EXISTS (
      SELECT 1 FROM people
      WHERE owner_id = auth.uid()
      AND (image = name OR banner = name)
    )
    -- Or user is GM
    OR is_gm()
  )
);

-- Authenticated users can upload files to places/ folder
CREATE POLICY "Users can upload places files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'the-eighth'
  AND auth.role() = 'authenticated'
  AND name LIKE 'places/%'
  AND (
    EXISTS (
      SELECT 1 FROM places
      WHERE owner_id = auth.uid()
      AND image = name
    )
    OR is_gm()
  )
);

-- Authenticated users can upload files to achievements/ folder
CREATE POLICY "Users can upload achievements files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'the-eighth'
  AND auth.role() = 'authenticated'
  AND name LIKE 'achievements/%'
  AND (
    EXISTS (
      SELECT 1 FROM achievements
      WHERE owner_id = auth.uid()
      AND icon = name
    )
    OR is_gm()
  )
);

-- GMs can upload audio files
CREATE POLICY "GMs can upload audio files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'the-eighth'
  AND name LIKE 'audio/%'
  AND is_gm()
);

-- ============================================================================
-- UPDATE POLICIES
-- ============================================================================

-- Users can update their own people files
CREATE POLICY "Users can update people files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'the-eighth'
  AND name LIKE 'people/%'
  AND (
    EXISTS (
      SELECT 1 FROM people
      WHERE owner_id = auth.uid()
      AND (image = name OR banner = name)
    )
    OR is_gm()
  )
);

-- Users can update their own places files
CREATE POLICY "Users can update places files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'the-eighth'
  AND name LIKE 'places/%'
  AND (
    EXISTS (
      SELECT 1 FROM places
      WHERE owner_id = auth.uid()
      AND image = name
    )
    OR is_gm()
  )
);

-- Users can update their own achievements files
CREATE POLICY "Users can update achievements files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'the-eighth'
  AND name LIKE 'achievements/%'
  AND (
    EXISTS (
      SELECT 1 FROM achievements
      WHERE owner_id = auth.uid()
      AND icon = name
    )
    OR is_gm()
  )
);

-- GMs can update audio files
CREATE POLICY "GMs can update audio files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'the-eighth'
  AND name LIKE 'audio/%'
  AND is_gm()
);

-- ============================================================================
-- DELETE POLICIES
-- ============================================================================

-- Users can delete their own people files
CREATE POLICY "Users can delete people files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'the-eighth'
  AND name LIKE 'people/%'
  AND (
    EXISTS (
      SELECT 1 FROM people
      WHERE owner_id = auth.uid()
      AND (image = name OR banner = name)
    )
    OR is_gm()
  )
);

-- Users can delete their own places files
CREATE POLICY "Users can delete places files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'the-eighth'
  AND name LIKE 'places/%'
  AND (
    EXISTS (
      SELECT 1 FROM places
      WHERE owner_id = auth.uid()
      AND image = name
    )
    OR is_gm()
  )
);

-- Users can delete their own achievements files
CREATE POLICY "Users can delete achievements files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'the-eighth'
  AND name LIKE 'achievements/%'
  AND (
    EXISTS (
      SELECT 1 FROM achievements
      WHERE owner_id = auth.uid()
      AND icon = name
    )
    OR is_gm()
  )
);

-- GMs can delete audio files
CREATE POLICY "GMs can delete audio files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'the-eighth'
  AND name LIKE 'audio/%'
  AND is_gm()
);

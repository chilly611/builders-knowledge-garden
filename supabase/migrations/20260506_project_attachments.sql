-- Project Attachments table (Phase 1: infrastructure only)
-- Supports jobsite photos/videos attached to projects.
-- Phase 2 will wire step-level attachments (workflow_id, step_id).

CREATE TABLE IF NOT EXISTS project_attachments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES command_center_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  mime_type text NOT NULL,
  byte_size bigint NOT NULL,
  original_filename text,
  caption text,
  workflow_id text,
  step_id text,
  exif_taken_at timestamptz,
  exif_lat double precision,
  exif_lng double precision,
  created_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_project_attachments_project_id ON project_attachments(project_id);
CREATE INDEX idx_project_attachments_user_id ON project_attachments(user_id);
CREATE INDEX idx_project_attachments_workflow_step ON project_attachments(workflow_id, step_id)
  WHERE workflow_id IS NOT NULL AND step_id IS NOT NULL;

-- RLS: enable
ALTER TABLE project_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies: owner can select/insert/update/delete rows where user_id = auth.uid()
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'project_attachments' AND policyname = 'owner_select_attachments'
  ) THEN
    CREATE POLICY owner_select_attachments ON project_attachments
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'project_attachments' AND policyname = 'owner_insert_attachments'
  ) THEN
    CREATE POLICY owner_insert_attachments ON project_attachments
      FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'project_attachments' AND policyname = 'owner_update_attachments'
  ) THEN
    CREATE POLICY owner_update_attachments ON project_attachments
      FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'project_attachments' AND policyname = 'owner_delete_attachments'
  ) THEN
    CREATE POLICY owner_delete_attachments ON project_attachments
      FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Storage bucket: project-evidence (non-public, 50MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-evidence',
  'project-evidence',
  false,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can insert/select/update/delete objects in project-evidence
-- Objects are scoped to project-evidence/<user_id>/... (enforced by folder naming)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'user_project_evidence_insert'
  ) THEN
    CREATE POLICY user_project_evidence_insert ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'project-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'user_project_evidence_select'
  ) THEN
    CREATE POLICY user_project_evidence_select ON storage.objects
      FOR SELECT
      TO authenticated
      USING (bucket_id = 'project-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'user_project_evidence_update'
  ) THEN
    CREATE POLICY user_project_evidence_update ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'project-evidence' AND (storage.foldername(name))[1] = auth.uid()::text)
      WITH CHECK (bucket_id = 'project-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'user_project_evidence_delete'
  ) THEN
    CREATE POLICY user_project_evidence_delete ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'project-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

-- Add sqft column to command_center_projects so square footage can be
-- persisted from any workflow and surfaced on the project summary page.
ALTER TABLE command_center_projects ADD COLUMN IF NOT EXISTS sqft text;

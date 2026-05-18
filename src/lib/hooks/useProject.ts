'use client';

/**
 * useProject — consumer hook for the Project Context Spine.
 *
 * Returns the active project, loading/error state, and setters. Throws
 * if called outside <ProjectProvider> (see /killerapp/layout.tsx).
 *
 * For per-workflow JSONB state, keep using useProjectWorkflowState /
 * useProjectStateBlob — they autosave their own column. This hook only
 * owns project IDENTITY.
 */

export { useProjectContext as useProject } from '@/contexts/ProjectContext';
export type { ProjectRecord } from '@/contexts/ProjectContext';

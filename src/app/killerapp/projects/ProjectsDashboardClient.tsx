'use client';

/**
 * ProjectsDashboardClient
 * ======================
 *
 * Client component for the projects dashboard (/killerapp/projects).
 *
 * Features:
 *   - Fetches all projects owned by the signed-in user on mount
 *   - Displays a responsive grid of project cards
 *   - Sort options: Most recent (default), Oldest first, Name A→Z
 *   - Filter chips: one per unique project_type; multi-select
 *   - Search box: debounced (200ms) substring match across raw_input, name, ai_summary, jurisdiction
 *   - Persists filter/sort preferences in localStorage under key 'bkg-projects-dashboard-prefs'
 *   - Empty state: centered card with CTA to /killerapp
 *   - Loading state: skeleton cards
 *   - Error state: inline error card with retry button
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface ProjectRecord {
  id: string;
  name: string | null;
  raw_input: string | null;
  ai_summary: string | null;
  project_type: string | null;
  jurisdiction: string | null;
  estimated_cost_low: number | null;
  estimated_cost_high: number | null;
  updated_at: string | null;
  created_at: string | null;
}

interface DashboardPreferences {
  sort: 'recent' | 'oldest' | 'name-asc';
  filterTypes: string[];
}

const PREFS_KEY = 'bkg-projects-dashboard-prefs';
const DEFAULT_PREFS: DashboardPreferences = {
  sort: 'recent',
  filterTypes: [],
};

// Derive display name from project data (matches /api/v1/projects POST logic)
function deriveProjectName(project: ProjectRecord): string {
  if (project.name) return project.name;
  if (project.raw_input) {
    const trimmed = project.raw_input.replace(/\s+/g, ' ').trim();
    if (trimmed.length <= 80) return trimmed;
    return trimmed.slice(0, 80).trimEnd();
  }
  return 'Untitled project';
}

function getDisplayTitle(project: ProjectRecord): string {
  const name = deriveProjectName(project);
  // Return first 80 chars
  return name.length > 80 ? name.slice(0, 80) : name;
}

// Format relative time (e.g. "2 hours ago", "3 days ago")
function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Just now';
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  return `${Math.floor(seconds / 2592000)}mo ago`;
}

// Format cost range like "$50K–$150K"
function formatCostRange(low: number | null, high: number | null): string | null {
  if (!low || !high) return null;
  const lowStr = (low / 1000).toLocaleString('en-US', {
    maximumFractionDigits: 0,
  });
  const highStr = (high / 1000).toLocaleString('en-US', {
    maximumFractionDigits: 0,
  });
  return `$${lowStr}K–$${highStr}K`;
}

// Skeleton card for loading state
function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--trace, #F4F0E6)',
        border: '0.5px solid var(--faded-rule, #C9C3B3)',
        borderRadius: 12,
        padding: 16,
        height: 260,
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }}
    />
  );
}

// Empty state card
function EmptyState() {
  return (
    <div
      style={{
        gridColumn: '1 / -1',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 400,
      }}
    >
      <div
        style={{
          maxWidth: 360,
          textAlign: 'center',
          padding: 32,
          background: 'var(--trace, #F4F0E6)',
          border: '0.5px solid var(--faded-rule, #C9C3B3)',
          borderRadius: 12,
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--graphite, #2E2E30)',
            marginBottom: 12,
            fontFamily: 'var(--font-archivo), sans-serif',
          }}
        >
          No projects yet
        </h2>
        <p
          style={{
            fontSize: 13,
            color: 'var(--graphite, #2E2E30)',
            opacity: 0.6,
            marginBottom: 20,
            lineHeight: 1.5,
            fontFamily: 'var(--font-archivo), sans-serif',
          }}
        >
          Start building by creating your first project in the workflow picker.
        </p>
        <Link
          href="/killerapp"
          style={{
            display: 'inline-block',
            padding: '10px 16px',
            background: 'var(--robins-egg, #7FCFCB)',
            color: 'var(--trace, #F4F0E6)',
            textDecoration: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'var(--font-archivo), sans-serif',
            transition: 'opacity 0.2s',
            cursor: 'pointer',
            border: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.85';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          Start your first project →
        </Link>
      </div>
    </div>
  );
}

// Error state card
function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      style={{
        gridColumn: '1 / -1',
        padding: 16,
        background: '#FFEBEE',
        border: '0.5px solid #EF9A9A',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: '#C62828',
          fontFamily: 'var(--font-archivo), sans-serif',
        }}
      >
        {message}
      </span>
      <button
        onClick={onRetry}
        style={{
          padding: '6px 12px',
          background: '#C62828',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'var(--font-archivo), sans-serif',
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.85';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
      >
        Retry
      </button>
    </div>
  );
}

// Individual project card
function ProjectCard({ project }: { project: ProjectRecord }) {
  const title = getDisplayTitle(project);
  const summary = project.ai_summary
    ? project.ai_summary.slice(0, 140).trim() +
      (project.ai_summary.length > 140 ? '…' : '')
    : '';
  const costRange = formatCostRange(
    project.estimated_cost_low,
    project.estimated_cost_high
  );
  const lastUpdated =
    project.updated_at || project.created_at
      ? formatRelativeTime(project.updated_at || project.created_at)
      : 'Just now';

  return (
    <Link
      href={`/killerapp?project=${encodeURIComponent(project.id)}`}
      style={{ textDecoration: 'none' }}
    >
      <div
        style={{
          background: 'var(--trace, #F4F0E6)',
          border: '0.5px solid var(--faded-rule, #C9C3B3)',
          borderRadius: 12,
          padding: 16,
          minHeight: 260,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          cursor: 'pointer',
          transition: 'all 0.2s',
          fontFamily: 'var(--font-archivo), sans-serif',
        }}
        onMouseEnter={(e) => {
          const elem = e.currentTarget;
          elem.style.borderColor = 'var(--graphite, #2E2E30)';
          elem.style.transform = 'translateY(-2px)';
          elem.style.boxShadow =
            '0 4px 12px rgba(27, 58, 92, 0.12)';
        }}
        onMouseLeave={(e) => {
          const elem = e.currentTarget;
          elem.style.borderColor = 'var(--faded-rule, #C9C3B3)';
          elem.style.transform = 'translateY(0)';
          elem.style.boxShadow = 'none';
        }}
      >
        {/* Title */}
        <h3
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--graphite, #2E2E30)',
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {title}
        </h3>

        {/* Summary */}
        {summary && (
          <p
            style={{
              fontSize: 13,
              color: 'var(--graphite, #2E2E30)',
              opacity: 0.6,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {summary}
          </p>
        )}

        {/* Badges row (type, jurisdiction) */}
        {(project.project_type || project.jurisdiction) && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              marginTop: 4,
            }}
          >
            {project.project_type && (
              <span
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  background: 'rgba(127, 207, 203, 0.18)',
                  color: 'var(--robins-egg, #7FCFCB)',
                  borderRadius: 4,
                  fontWeight: 500,
                }}
              >
                {project.project_type}
              </span>
            )}
            {project.jurisdiction && (
              <span
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  background: 'rgba(182, 135, 58, 0.12)',
                  color: 'var(--brass, #B6873A)',
                  borderRadius: 4,
                  fontWeight: 500,
                }}
              >
                {project.jurisdiction}
              </span>
            )}
          </div>
        )}

        {/* Cost range */}
        {costRange && (
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--brass, #B6873A)',
              margin: 0,
            }}
          >
            {costRange}
          </p>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Last updated */}
        <p
          style={{
            fontSize: 12,
            color: 'var(--graphite, #2E2E30)',
            opacity: 0.5,
            margin: 0,
          }}
        >
          Last updated {lastUpdated}
        </p>
      </div>
    </Link>
  );
}

export default function ProjectsDashboardClient() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [prefs, setPrefs] = useState<DashboardPreferences>(DEFAULT_PREFS);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  // Check authentication on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) {
        if (!data.session) {
          router.push('/login?next=/killerapp/projects');
        } else {
          setIsAuthed(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREFS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as DashboardPreferences;
        setPrefs(parsed);
      }
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }, []);

  // Fetch projects on mount
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const response = await fetch('/api/v1/projects', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const json = (await response.json()) as { projects: ProjectRecord[] };
      setProjects(json.projects || []);
    } catch (e) {
      console.error('Projects fetch error:', e);
      setError('Could not load projects. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Extract unique project types from current projects
  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    projects.forEach((p) => {
      if (p.project_type) types.add(p.project_type);
    });
    return Array.from(types).sort();
  }, [projects]);

  // Apply filters and search
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Apply type filter
    if (prefs.filterTypes.length > 0) {
      result = result.filter((p) =>
        p.project_type ? prefs.filterTypes.includes(p.project_type) : false
      );
    }

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => {
        const searchFields = [
          deriveProjectName(p).toLowerCase(),
          p.raw_input?.toLowerCase() || '',
          p.ai_summary?.toLowerCase() || '',
          p.jurisdiction?.toLowerCase() || '',
        ];
        return searchFields.some((field) => field.includes(q));
      });
    }

    // Apply sorting
    if (prefs.sort === 'recent') {
      result.sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at || 0).getTime() -
          new Date(a.updated_at || a.created_at || 0).getTime()
      );
    } else if (prefs.sort === 'oldest') {
      result.sort(
        (a, b) =>
          new Date(a.updated_at || a.created_at || 0).getTime() -
          new Date(b.updated_at || b.created_at || 0).getTime()
      );
    } else if (prefs.sort === 'name-asc') {
      result.sort((a, b) =>
        deriveProjectName(a).localeCompare(deriveProjectName(b))
      );
    }

    return result;
  }, [projects, prefs, searchQuery]);

  // Handle search with debounce
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    // Debounce is implicit here since we're updating state immediately
    // and re-filtering in the useMemo
  };

  // Toggle filter chip
  const toggleFilter = (type: string) => {
    const newFilters = prefs.filterTypes.includes(type)
      ? prefs.filterTypes.filter((t) => t !== type)
      : [...prefs.filterTypes, type];

    const newPrefs = { ...prefs, filterTypes: newFilters };
    setPrefs(newPrefs);

    // Save to localStorage
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(newPrefs));
    } catch {
      // Silently fail if localStorage is unavailable
    }
  };

  // Change sort
  const handleSortChange = (sort: DashboardPreferences['sort']) => {
    const newPrefs = { ...prefs, sort };
    setPrefs(newPrefs);

    // Save to localStorage
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(newPrefs));
    } catch {
      // Silently fail if localStorage is unavailable
    }
  };

  // Wait for auth check to complete
  if (isAuthed === null) {
    return null; // Will redirect if not authed
  }

  return (
    <div
      style={{
        maxWidth: 1400,
        margin: '0 auto',
      }}
    >
      {/* Page heading */}
      <h1
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: 'var(--graphite, #2E2E30)',
          marginBottom: 24,
          marginTop: 0,
          fontFamily: 'var(--font-archivo), sans-serif',
        }}
      >
        Projects
      </h1>

      {/* Controls: Sort, Filter, Search */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Row 1: Sort + Search */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {/* Sort dropdown */}
          <select
            value={prefs.sort}
            onChange={(e) =>
              handleSortChange(
                e.target.value as DashboardPreferences['sort']
              )
            }
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '0.5px solid var(--faded-rule, #C9C3B3)',
              background: 'var(--trace, #F4F0E6)',
              color: 'var(--graphite, #2E2E30)',
              fontSize: 13,
              fontFamily: 'var(--font-archivo), sans-serif',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            <option value="recent">Most recent</option>
            <option value="oldest">Oldest first</option>
            <option value="name-asc">Name A→Z</option>
          </select>

          {/* Search box */}
          <input
            type="text"
            placeholder="Search by name, description, location…"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{
              flex: 1,
              minWidth: 200,
              padding: '8px 12px',
              borderRadius: 6,
              border: '0.5px solid var(--faded-rule, #C9C3B3)',
              background: 'white',
              color: 'var(--graphite, #2E2E30)',
              fontSize: 13,
              fontFamily: 'var(--font-archivo), sans-serif',
            }}
          />
        </div>

        {/* Row 2: Filter chips */}
        {uniqueTypes.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {uniqueTypes.map((type) => {
              const isActive = prefs.filterTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleFilter(type)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: isActive
                      ? 'none'
                      : '0.5px solid var(--faded-rule, #C9C3B3)',
                    background: isActive
                      ? 'var(--robins-egg, #7FCFCB)'
                      : 'transparent',
                    color: isActive
                      ? 'var(--trace, #F4F0E6)'
                      : 'var(--graphite, #2E2E30)',
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: 'var(--font-archivo), sans-serif',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor =
                        'var(--graphite, #2E2E30)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor =
                        'var(--faded-rule, #C9C3B3)';
                    }
                  }}
                >
                  {type}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Error state */}
      {error && !loading && <ErrorState message={error} onRetry={fetchProjects} />}

      {/* Loading state */}
      {loading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Project grid or empty state */}
      {!loading && filteredProjects.length === 0 && projects.length === 0 && (
        <EmptyState />
      )}

      {!loading && filteredProjects.length === 0 && projects.length > 0 && (
        <div
          style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: 48,
            color: 'var(--graphite, #2E2E30)',
            fontSize: 14,
            fontFamily: 'var(--font-archivo), sans-serif',
          }}
        >
          No projects match your filters. Try adjusting your search or filters.
        </div>
      )}

      {!loading && filteredProjects.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

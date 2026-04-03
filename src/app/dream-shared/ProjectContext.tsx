'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { DreamProject, DreamInterfaceType, createBlankProject, validateProject, generateId } from './types';

/* ─── Storage Adapter Interface ─── */
interface StorageAdapter {
  list(): Promise<DreamProject[]>;
  get(id: string): Promise<DreamProject | null>;
  save(project: DreamProject): Promise<void>;
  remove(id: string): Promise<void>;
}

const STORAGE_KEY = 'bkg_dream_projects';

/* ─── localStorage Adapter ─── */
class LocalStorageAdapter implements StorageAdapter {
  private getAll(): DreamProject[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(validateProject) : [];
    } catch {
      return [];
    }
  }

  private setAll(projects: DreamProject[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }

  async list(): Promise<DreamProject[]> {
    return this.getAll().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async get(id: string): Promise<DreamProject | null> {
    return this.getAll().find(p => p.id === id) || null;
  }

  async save(project: DreamProject): Promise<void> {
    const all = this.getAll();
    const idx = all.findIndex(p => p.id === project.id);
    const updated = { ...project, updatedAt: new Date().toISOString() };
    if (idx >= 0) {
      all[idx] = updated;
    } else {
      all.push(updated);
    }
    this.setAll(all);
  }

  async remove(id: string): Promise<void> {
    this.setAll(this.getAll().filter(p => p.id !== id));
  }
}

/* ─── Future API adapter stub ─── */
// class ApiStorageAdapter implements StorageAdapter {
//   private baseUrl = '/api/v1/projects';
//   async list() { const res = await fetch(this.baseUrl); return res.json(); }
//   async get(id: string) { const res = await fetch(`${this.baseUrl}/${id}`); return res.json(); }
//   async save(project: DreamProject) { await fetch(this.baseUrl, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(project) }); }
//   async remove(id: string) { await fetch(`${this.baseUrl}/${id}`, { method: 'DELETE' }); }
// }

/* ─── Context Type ─── */
interface ProjectContextType {
  /** Currently active project (null if none loaded) */
  currentProject: DreamProject | null;
  /** All saved projects */
  projects: DreamProject[];
  /** Is the project list loading? */
  isLoading: boolean;
  /** Create a new project and set it as current */
  createProject: (sourceInterface: DreamInterfaceType, name?: string) => Promise<DreamProject>;
  /** Save the current project (or a specific project) */
  saveProject: (project?: DreamProject) => Promise<void>;
  /** Load a project by ID and set it as current */
  loadProject: (id: string) => Promise<DreamProject | null>;
  /** Set current project directly (for imports) */
  setCurrentProject: (project: DreamProject | null) => void;
  /** Delete a project by ID */
  deleteProject: (id: string) => Promise<void>;
  /** Export a project as a downloadable JSON blob */
  exportProject: (project: DreamProject) => void;
  /** Import a project from a JSON file */
  importProject: (file: File) => Promise<DreamProject | null>;
  /** Refresh the project list from storage */
  refreshProjects: () => Promise<void>;
  /** Update the current project's interface data for a specific interface */
  updateInterfaceData: (interfaceType: DreamInterfaceType, data: unknown) => void;
  /** Update the current project's dream essence */
  updateDreamEssence: (essence: Partial<DreamProject['dreamEssence']>) => void;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

/* ─── Provider ─── */
export function ProjectProvider({ children }: { children: ReactNode }) {
  const [storage] = useState<StorageAdapter>(() => new LocalStorageAdapter());
  const [projects, setProjects] = useState<DreamProject[]>([]);
  const [currentProject, setCurrentProject] = useState<DreamProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load projects on mount
  useEffect(() => {
    storage.list().then(list => {
      setProjects(list);
      setIsLoading(false);
    });
  }, [storage]);

  const refreshProjects = useCallback(async () => {
    const list = await storage.list();
    setProjects(list);
  }, [storage]);

  const createProject = useCallback(async (sourceInterface: DreamInterfaceType, name?: string) => {
    const project = createBlankProject(sourceInterface, name);
    await storage.save(project);
    setCurrentProject(project);
    await refreshProjects();
    return project;
  }, [storage, refreshProjects]);

  const saveProject = useCallback(async (project?: DreamProject) => {
    const toSave = project || currentProject;
    if (!toSave) return;
    await storage.save(toSave);
    if (!project) setCurrentProject({ ...toSave, updatedAt: new Date().toISOString() });
    await refreshProjects();
  }, [storage, currentProject, refreshProjects]);

  const loadProject = useCallback(async (id: string) => {
    const project = await storage.get(id);
    if (project) setCurrentProject(project);
    return project;
  }, [storage]);

  const deleteProject = useCallback(async (id: string) => {
    await storage.remove(id);
    if (currentProject?.id === id) setCurrentProject(null);
    await refreshProjects();
  }, [storage, currentProject, refreshProjects]);

  const exportProject = useCallback((project: DreamProject) => {
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-dream.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const importProject = useCallback(async (file: File): Promise<DreamProject | null> => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!validateProject(data)) {
        console.error('Invalid project file');
        return null;
      }
      // Give it a new ID to avoid collisions
      const imported: DreamProject = {
        ...data,
        id: generateId(),
        updatedAt: new Date().toISOString(),
      };
      await storage.save(imported);
      setCurrentProject(imported);
      await refreshProjects();
      return imported;
    } catch (e) {
      console.error('Failed to import project:', e);
      return null;
    }
  }, [storage, refreshProjects]);

  const updateInterfaceData = useCallback((interfaceType: DreamInterfaceType, data: unknown) => {
    setCurrentProject(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        updatedAt: new Date().toISOString(),
        interfaceData: { ...prev.interfaceData, [interfaceType]: data },
        visitedInterfaces: prev.visitedInterfaces.includes(interfaceType)
          ? prev.visitedInterfaces
          : [...prev.visitedInterfaces, interfaceType],
      };
      // Async save in background
      storage.save(updated);
      return updated;
    });
  }, [storage]);

  const updateDreamEssence = useCallback((essence: Partial<DreamProject['dreamEssence']>) => {
    setCurrentProject(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        updatedAt: new Date().toISOString(),
        dreamEssence: { ...prev.dreamEssence, ...essence },
      };
      storage.save(updated);
      return updated;
    });
  }, [storage]);

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        projects,
        isLoading,
        createProject,
        saveProject,
        loadProject,
        setCurrentProject,
        deleteProject,
        exportProject,
        importProject,
        refreshProjects,
        updateInterfaceData,
        updateDreamEssence,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

/* ─── Hook ─── */
export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within a ProjectProvider');
  return ctx;
}

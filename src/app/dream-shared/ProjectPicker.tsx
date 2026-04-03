'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProject } from './ProjectContext';
import { DreamProject, DreamInterfaceType, DREAM_INTERFACES } from './types';

interface ProjectPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (project: DreamProject) => void;
  currentInterfaceType?: DreamInterfaceType;
  accentColor?: string;
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  return `${months}mo ago`;
}

function getInterfaceInfo(type: DreamInterfaceType) {
  return DREAM_INTERFACES.find(i => i.type === type) || { type, label: type, emoji: '✦', color: '#888', route: '#', description: '', available: false };
}

export default function ProjectPicker({
  isOpen,
  onClose,
  onSelectProject,
  currentInterfaceType,
  accentColor = '#a78bfa',
}: ProjectPickerProps) {
  const { projects, deleteProject, saveProject } = useProject();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInterface, setSelectedInterface] = useState<DreamInterfaceType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetical'>('newest');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Unique interface types present in projects
  const interfaceTypes = useMemo(() => {
    const types = new Set<DreamInterfaceType>();
    projects.forEach(p => types.add(p.sourceInterface));
    return Array.from(types);
  }, [projects]);

  const filteredProjects = useMemo(() => {
    let filtered = projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesInterface = selectedInterface === 'all' || p.sourceInterface === selectedInterface;
      return matchesSearch && matchesInterface;
    });

    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
    } else {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }
    return filtered;
  }, [projects, searchTerm, selectedInterface, sortBy]);

  const handleSelect = (project: DreamProject) => {
    onSelectProject(project);
    onClose();
  };

  const handleSaveEdit = async (project: DreamProject) => {
    if (editingName.trim()) {
      await saveProject({ ...project, name: editingName.trim() });
    }
    setEditingId(null);
  };

  const handleConfirmDelete = async (id: string) => {
    await deleteProject(id);
    setConfirmDeleteId(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
            fontFamily: 'var(--font-archivo, system-ui)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 700,
              maxHeight: '80vh',
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '24px 24px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h2 style={{ margin: 0, color: '#fff', fontSize: 20, fontWeight: 700 }}>
                Your Dream Projects
              </h2>
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer', fontSize: 20, padding: '4px 8px', borderRadius: 6,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
              >
                ✕
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: '16px 24px 8px' }}>
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = accentColor; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
              />
            </div>

            {/* Filters & Sort */}
            <div style={{ padding: '8px 24px 16px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                {['all' as const, ...interfaceTypes].map(type => {
                  const isAll = type === 'all';
                  const info = !isAll ? getInterfaceInfo(type) : null;
                  const active = selectedInterface === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedInterface(type)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 16,
                        border: `1px solid ${active ? accentColor : 'rgba(255,255,255,0.15)'}`,
                        backgroundColor: active ? accentColor : 'rgba(255,255,255,0.04)',
                        color: active ? '#000' : 'rgba(255,255,255,0.6)',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 0.2s',
                      }}
                    >
                      {isAll ? 'All' : `${info?.emoji} ${info?.label}`}
                    </button>
                  );
                })}
              </div>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.15)',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 12,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="alphabetical">A-Z</option>
              </select>
            </div>

            {/* Project cards */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
              {filteredProjects.length === 0 ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minHeight: 200, color: 'rgba(255,255,255,0.4)', textAlign: 'center',
                  flexDirection: 'column', gap: 12,
                }}>
                  <div style={{ fontSize: 48 }}>🌙</div>
                  <p style={{ margin: 0, fontSize: 14 }}>
                    {projects.length === 0
                      ? 'No projects yet. Start building your dreams!'
                      : 'No projects match your search.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {filteredProjects.map((project, idx) => {
                    const info = getInterfaceInfo(project.sourceInterface);
                    const isEditing = editingId === project.id;
                    const isDeleting = confirmDeleteId === project.id;

                    return (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        onClick={() => !isEditing && !isDeleting && handleSelect(project)}
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 10,
                          padding: 14,
                          cursor: isEditing || isDeleting ? 'default' : 'pointer',
                          transition: 'all 0.2s',
                          borderTop: `3px solid ${info.color}`,
                        }}
                        onMouseEnter={e => {
                          if (!isEditing && !isDeleting) {
                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        {/* Name */}
                        <div style={{ marginBottom: 8 }}>
                          {isEditing ? (
                            <input
                              autoFocus
                              value={editingName}
                              onChange={e => setEditingName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveEdit(project);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              onBlur={() => handleSaveEdit(project)}
                              onClick={e => e.stopPropagation()}
                              style={{
                                width: '100%', padding: '4px 8px',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                border: `1px solid ${accentColor}`,
                                borderRadius: 4, color: '#fff', fontSize: 14,
                                fontWeight: 600, fontFamily: 'inherit', outline: 'none',
                                boxSizing: 'border-box',
                              }}
                            />
                          ) : (
                            <h3
                              onClick={e => { e.stopPropagation(); setEditingId(project.id); setEditingName(project.name); }}
                              style={{
                                margin: 0, color: '#fff', fontSize: 14, fontWeight: 600,
                                cursor: 'text', padding: '2px 4px', borderRadius: 4,
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
                              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                              {project.name}
                            </h3>
                          )}
                        </div>

                        {/* Interface badge */}
                        <span style={{
                          display: 'inline-block', padding: '2px 8px',
                          backgroundColor: `${info.color}18`,
                          borderRadius: 4, fontSize: 11, color: info.color,
                          fontWeight: 500, marginBottom: 8,
                        }}>
                          {info.emoji} {info.label}
                        </span>

                        {/* Description */}
                        <p style={{
                          margin: '6px 0', color: 'rgba(255,255,255,0.4)', fontSize: 12,
                          lineHeight: 1.4, display: '-webkit-box',
                          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {project.description || 'No description'}
                        </p>

                        {/* Timestamp */}
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
                          Updated {getRelativeTime(new Date(project.updatedAt))}
                        </div>

                        {/* Visited interfaces dots */}
                        {project.visitedInterfaces.length > 1 && (
                          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                            {project.visitedInterfaces.slice(0, 6).map((vType, i) => {
                              const vInfo = getInterfaceInfo(vType);
                              return (
                                <div
                                  key={i}
                                  title={vInfo.label}
                                  style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: vInfo.color, opacity: 0.8 }}
                                />
                              );
                            })}
                          </div>
                        )}

                        {/* Delete */}
                        {isDeleting ? (
                          <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => handleConfirmDelete(project.id)}
                              style={{
                                flex: 1, padding: '6px', backgroundColor: '#ef4444',
                                color: '#fff', border: 'none', borderRadius: 4,
                                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                              }}
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              style={{
                                flex: 1, padding: '6px', backgroundColor: 'rgba(255,255,255,0.1)',
                                color: 'rgba(255,255,255,0.6)', border: 'none', borderRadius: 4,
                                fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={e => { e.stopPropagation(); setConfirmDeleteId(project.id); }}
                            style={{
                              width: '100%', padding: '5px',
                              backgroundColor: 'transparent', color: 'rgba(255,255,255,0.3)',
                              border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4,
                              fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.15)';
                              e.currentTarget.style.color = '#ef4444';
                              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = 'rgba(255,255,255,0.3)';
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

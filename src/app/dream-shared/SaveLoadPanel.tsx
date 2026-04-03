'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProject } from './ProjectContext';
import { DreamInterfaceType, DREAM_INTERFACES, DreamProject } from './types';

interface SaveLoadPanelProps {
  interfaceType: DreamInterfaceType;
  accentColor: string;
  /** Called when save is triggered — should return current interface state */
  onSerialize: () => {
    interfaceData: unknown;
    essence: Partial<DreamProject['dreamEssence']>;
  };
  /** Called when a project is loaded — receives the project's interface data for this interface, plus the dream essence */
  onDeserialize: (data: {
    interfaceData: unknown;
    essence: DreamProject['dreamEssence'];
  }) => void;
  /** Called when the picker should open */
  onOpenPicker: () => void;
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
}

export default function SaveLoadPanel({
  interfaceType,
  accentColor,
  onSerialize,
  onDeserialize,
  onOpenPicker,
  position = 'bottom-right',
}: SaveLoadPanelProps) {
  const {
    currentProject,
    createProject,
    saveProject,
    exportProject,
    importProject,
    updateInterfaceData,
    updateDreamEssence,
    setCurrentProject,
  } = useProject();

  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showDropZone, setShowDropZone] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [showContinueMenu, setShowContinueMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync temp name with current project
  useEffect(() => {
    if (currentProject) setTempName(currentProject.name);
  }, [currentProject?.name]);

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowContinueMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const positionStyles: Record<string, React.CSSProperties> = {
    'top-right': { top: 20, right: 20 },
    'bottom-right': { bottom: 20, right: 20 },
    'top-left': { top: 20, left: 20 },
    'bottom-left': { bottom: 20, left: 20 },
  };

  const handleSave = useCallback(async () => {
    try {
      const serialized = onSerialize();

      if (!currentProject) {
        // Auto-create a project if none exists
        const info = DREAM_INTERFACES.find(i => i.type === interfaceType);
        const project = await createProject(interfaceType, `${info?.label || 'Dream'} Project`);
        updateInterfaceData(interfaceType, serialized.interfaceData);
        updateDreamEssence(serialized.essence);
      } else {
        updateInterfaceData(interfaceType, serialized.interfaceData);
        updateDreamEssence(serialized.essence);
        await saveProject();
      }

      setShowSaveConfirm(true);
      setTimeout(() => setShowSaveConfirm(false), 2000);
    } catch (error) {
      console.error('Save failed:', error);
    }
  }, [currentProject, interfaceType, onSerialize, createProject, saveProject, updateInterfaceData, updateDreamEssence]);

  const handleExport = useCallback(() => {
    if (!currentProject) return;
    // Save latest state before export
    const serialized = onSerialize();
    const toExport: DreamProject = {
      ...currentProject,
      interfaceData: { ...currentProject.interfaceData, [interfaceType]: serialized.interfaceData },
      dreamEssence: { ...currentProject.dreamEssence, ...serialized.essence },
    };
    exportProject(toExport);
  }, [currentProject, interfaceType, onSerialize, exportProject]);

  const handleUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    const project = await importProject(file);
    if (project) {
      const iData = project.interfaceData[interfaceType];
      onDeserialize({
        interfaceData: iData || null,
        essence: project.dreamEssence,
      });
    }
  }, [importProject, interfaceType, onDeserialize]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFileSelect(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleNameSave = useCallback(() => {
    if (currentProject && tempName.trim()) {
      setCurrentProject({ ...currentProject, name: tempName.trim() });
      saveProject({ ...currentProject, name: tempName.trim() });
    }
    setIsEditingName(false);
  }, [currentProject, tempName, setCurrentProject, saveProject]);

  // Drag and drop handling
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current++;
      if (e.dataTransfer?.types.includes('Files')) {
        setShowDropZone(true);
      }
    };
    const handleDragLeave = () => {
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) setShowDropZone(false);
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setShowDropZone(false);
      const file = e.dataTransfer?.files?.[0];
      if (file?.name.endsWith('.json')) handleFileSelect(file);
    };
    const handleDragOver = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };

    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);
    document.addEventListener('dragover', handleDragOver);
    return () => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
      document.removeEventListener('dragover', handleDragOver);
    };
  }, [handleFileSelect]);

  const availableInterfaces = DREAM_INTERFACES.filter(i => i.available && i.type !== interfaceType);

  const btnStyle: React.CSSProperties = {
    padding: '8px 14px',
    borderRadius: 20,
    backgroundColor: `${accentColor}22`,
    color: accentColor,
    border: `1px solid ${accentColor}33`,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      {/* Drop zone overlay */}
      <AnimatePresence>
        {showDropZone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.7)',
              border: `3px dashed ${accentColor}`,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              pointerEvents: 'none',
              backdropFilter: 'blur(4px)',
            }}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              style={{ color: accentColor, fontSize: 28, fontWeight: 700, textAlign: 'center' }}
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>📥</div>
              Drop your .json project file here
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main panel */}
      <motion.div
        initial={{ opacity: 0, y: position.includes('bottom') ? 20 : -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.5 }}
        style={{
          position: 'fixed',
          zIndex: 999,
          ...positionStyles[position],
        }}
      >
        {collapsed ? (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCollapsed(false)}
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(12px)',
              border: `1px solid ${accentColor}44`,
              color: accentColor,
              fontSize: 20,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 20px ${accentColor}22`,
            }}
          >
            💾
          </motion.button>
        ) : (
          <motion.div
            layout
            style={{
              backgroundColor: 'rgba(0,0,0,0.88)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              padding: 16,
              minWidth: 300,
              fontFamily: 'var(--font-archivo, system-ui)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: `${accentColor}aa`, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                {DREAM_INTERFACES.find(i => i.type === interfaceType)?.emoji}{' '}
                {DREAM_INTERFACES.find(i => i.type === interfaceType)?.label || interfaceType}
              </div>
              <button
                onClick={() => setCollapsed(true)}
                style={{
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
                  cursor: 'pointer', fontSize: 16, padding: '0 4px',
                }}
              >
                ▾
              </button>
            </div>

            {/* Project name */}
            <div style={{ marginBottom: 14 }}>
              {isEditingName ? (
                <input
                  autoFocus
                  type="text"
                  value={tempName}
                  onChange={e => setTempName(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={e => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setIsEditingName(false); }}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    border: `1px solid ${accentColor}`,
                    borderRadius: 8,
                    color: '#fff',
                    padding: '6px 10px',
                    fontSize: 13,
                    width: '100%',
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
              ) : (
                <button
                  onClick={() => setIsEditingName(true)}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    color: '#ccc',
                    padding: '6px 10px',
                    fontSize: 13,
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                >
                  ✏️ {currentProject?.name || 'Untitled Project'}
                </button>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleSave} style={btnStyle}>
                💾 Save
              </motion.button>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onOpenPicker} style={btnStyle}>
                📂 Load
              </motion.button>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleExport}
                style={{ ...btnStyle, opacity: currentProject ? 1 : 0.4, pointerEvents: currentProject ? 'auto' : 'none' }}>
                📤 Export
              </motion.button>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleUpload} style={btnStyle}>
                📥 Upload
              </motion.button>
            </div>

            {/* Continue in... dropdown */}
            {currentProject && availableInterfaces.length > 0 && (
              <div ref={menuRef} style={{ position: 'relative' }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowContinueMenu(!showContinueMenu)}
                  style={{
                    ...btnStyle,
                    width: '100%',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    color: 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  🔄 Continue in...
                </motion.button>

                <AnimatePresence>
                  {showContinueMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: 0,
                        right: 0,
                        marginBottom: 8,
                        backgroundColor: 'rgba(10,10,10,0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12,
                        overflow: 'hidden',
                        zIndex: 1001,
                        boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
                      }}
                    >
                      {availableInterfaces.map((iface, idx) => (
                        <motion.button
                          key={iface.type}
                          whileHover={{ backgroundColor: `${iface.color}15` }}
                          onClick={() => {
                            // Save current state first
                            handleSave().then(() => {
                              window.location.href = iface.route;
                            });
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: iface.color,
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 500,
                            fontFamily: 'inherit',
                            borderBottom: idx < availableInterfaces.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <span>{iface.emoji}</span>
                          <span>{iface.label}</span>
                          {!iface.available && (
                            <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 'auto' }}>Soon</span>
                          )}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Save confirmation toast */}
      <AnimatePresence>
        {showSaveConfirm && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              bottom: position.includes('bottom') ? 100 : 'auto',
              top: position.includes('top') ? 100 : 'auto',
              right: position.includes('right') ? 20 : 'auto',
              left: position.includes('left') ? 20 : 'auto',
              backgroundColor: '#10b981',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: 24,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: '0 10px 30px rgba(16,185,129,0.3)',
              zIndex: 998,
              fontFamily: 'var(--font-arquivo, system-ui)',
            }}
          >
            ✓ Project saved!
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

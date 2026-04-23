'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  GripVertical,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
} from 'lucide-react';

interface TaskDependency {
  taskId: string;
  taskName: string;
}

interface Task {
  id: string;
  name: string;
  description: string;
  phase: string;
  duration_days: number;
  start_date: string;
  end_date: string;
  status: 'not_started' | 'in_progress' | 'complete' | 'blocked';
  assigned_to: string;
  dependencies: string[];
  cost_estimate: number;
  parent_id: string | null;
  order: number;
  project_id: string;
}

interface Phase {
  id: string;
  name: string;
  order: number;
  tasks: Task[];
}

// TODO(W9.C.BR-A): import { colors } from '@/design-system/tokens' and use canonical tokens
// Legacy hexes: #94a3b8 (slate) → use fadedRule; #378ADD (build phase) → keep for now (legacy phase color);
// #1D9E75 (legacy Knowledge Garden green) → should map to robin (#7FCFCB) for "complete" per canonical;
// #E8443A (legacy Killer App red) → #A1473A (canonical Redline)
const statusColors = {
  not_started: '#94a3b8',  // TODO(W9.C.BR-A): replace with canonical faded-rule or darker gray
  in_progress: '#378ADD',  // TODO(W9.C.BR-A): use canonical phase color if available
  complete: '#7FCFCB',     // #1D9E75 → #7FCFCB (canonical robin for "complete")
  blocked: '#A1473A',      // #E8443A → #A1473A (canonical redline)
};

const statusIcons = {
  not_started: '○',
  in_progress: '⟳',
  complete: '✓',
  blocked: '⚠',
};

const phaseColors = [
  '#E8F5E9',
  '#F3E5F5',
  '#E3F2FD',
  '#FCE4EC',
  '#FFF3E0',
  '#F1F8E9',
];

export default function WBSEditor({ projectId }: { projectId: string }) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [showAddPhase, setShowAddPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');

  useEffect(() => {
    loadTasks();
  }, [projectId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('phase')
        .order('parent_id')
        .order('order');

      if (err) throw err;

      const phasesMap = new Map<string, Task[]>();
      (data || []).forEach((task) => {
        if (!phasesMap.has(task.phase)) {
          phasesMap.set(task.phase, []);
        }
        phasesMap.get(task.phase)?.push(task);
      });

      const phaseArray: Phase[] = Array.from(phasesMap.entries()).map(
        ([phaseName, tasks]) => ({
          id: phaseName,
          name: phaseName,
          order: tasks[0]?.order || 0,
          tasks,
        })
      );

      setPhases(phaseArray);
      setExpandedPhases(new Set(phaseArray.map((p) => p.id)));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateCriticalPath = useCallback((): Set<string> => {
    const criticalTasks = new Set<string>();

    const allTasks = phases.flatMap((p) => p.tasks);
    if (allTasks.length === 0) return criticalTasks;

    const taskMap = new Map(allTasks.map((t) => [t.id, t]));

    const calculateLatestEnd = (taskId: string): Date => {
      const task = taskMap.get(taskId);
      if (!task) return new Date();

      const endDate = new Date(task.end_date);
      const dependents = allTasks.filter((t) =>
        t.dependencies?.includes(taskId)
      );

      if (dependents.length === 0) return endDate;

      const latestDependentEnd = Math.max(
        ...dependents.map((d) => calculateLatestEnd(d.id).getTime())
      );

      return new Date(Math.max(endDate.getTime(), latestDependentEnd));
    };

    const projectEnd = Math.max(
      ...allTasks.map((t) => calculateLatestEnd(t.id).getTime())
    );

    const isOnCriticalPath = (taskId: string, currentEnd: Date): boolean => {
      const task = taskMap.get(taskId);
      if (!task) return false;

      const duration =
        (new Date(task.end_date).getTime() -
          new Date(task.start_date).getTime()) /
        (1000 * 60 * 60 * 24);
      const slack = calculateLatestEnd(taskId).getTime() - currentEnd.getTime();

      return Math.abs(slack) < 1000 * 60 * 60 * 24;
    };

    allTasks.forEach((task) => {
      if (isOnCriticalPath(task.id, new Date(task.end_date))) {
        criticalTasks.add(task.id);
      }
    });

    return criticalTasks;
  }, [phases]);

  const criticalPath = useMemo(() => calculateCriticalPath(), [calculateCriticalPath]);

  const handleAddPhase = async () => {
    if (!newPhaseName.trim()) return;

    try {
      const newTask: Task = {
        id: `phase-${Date.now()}`,
        name: newPhaseName,
        description: '',
        phase: newPhaseName,
        duration_days: 0,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        status: 'not_started',
        assigned_to: '',
        dependencies: [],
        cost_estimate: 0,
        parent_id: null,
        order: phases.length,
        project_id: projectId,
      };

      const { error: err } = await supabase
        .from('project_tasks')
        .insert([newTask]);

      if (err) throw err;

      setNewPhaseName('');
      setShowAddPhase(false);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add phase');
    }
  };

  const handleAddTask = async (phaseId: string, parentId: string | null = null) => {
    try {
      const newTask: Task = {
        id: `task-${Date.now()}`,
        name: 'New Task',
        description: '',
        phase: phaseId,
        duration_days: 1,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        status: 'not_started',
        assigned_to: '',
        dependencies: [],
        cost_estimate: 0,
        parent_id: parentId,
        order: phases
          .find((p) => p.id === phaseId)
          ?.tasks.filter((t) => t.parent_id === parentId).length || 0,
        project_id: projectId,
      };

      const { error: err } = await supabase
        .from('project_tasks')
        .insert([newTask]);

      if (err) throw err;

      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error: err } = await supabase
        .from('project_tasks')
        .delete()
        .eq('id', taskId);

      if (err) throw err;

      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  const handleUpdateTask = async (
    taskId: string,
    field: string,
    value: unknown
  ) => {
    try {
      const { error: err } = await supabase
        .from('project_tasks')
        .update({ [field]: value })
        .eq('id', taskId);

      if (err) throw err;

      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetPhaseId: string) => {
    e.preventDefault();
    if (!draggedTask) return;

    try {
      await handleUpdateTask(draggedTask, 'phase', targetPhaseId);
      setDraggedTask(null);
    } catch (err) {
      console.error('Drop failed:', err);
    }
  };

  const handleExportJSON = () => {
    const exportData = {
      projectId,
      exportDate: new Date().toISOString(),
      phases: phases.map((phase) => ({
        id: phase.id,
        name: phase.name,
        tasks: phase.tasks,
      })),
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wbs-${projectId}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const togglePhaseExpanded = (phaseId: string) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };

  const toggleTaskExpanded = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const renderTaskRow = (task: Task, phaseId: string, depth: number = 0) => {
    const subtasks = phases
      .find((p) => p.id === phaseId)
      ?.tasks.filter((t) => t.parent_id === task.id) || [];
    const isCritical = criticalPath.has(task.id);
    const isExpanded = expandedTasks.has(task.id);

    return (
      <motion.div
        key={task.id}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
      >
        <div
          style={{
            marginLeft: `${depth * 20}px`,
            backgroundColor: isCritical ? '#FFF3E0' : 'transparent',
            borderLeft: isCritical ? `3px solid ${statusColors.blocked}` : 'none',
            padding: '8px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                '30px 200px 120px 100px 80px 100px 80px 40px',
              gap: '12px',
              alignItems: 'center',
              fontSize: '13px',
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '8px',
              marginBottom: '4px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {subtasks.length > 0 && (
                <button
                  onClick={() => toggleTaskExpanded(task.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0',
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
              <GripVertical size={14} style={{ cursor: 'grab', color: '#cbd5e1' }} />
            </div>

            <div
              contentEditable={editingId === task.id && editingField === 'name'}
              suppressContentEditableWarning
              onFocus={() => {
                if (editingId === task.id && editingField === 'name') {
                  setEditingValue(task.name);
                }
              }}
              onBlur={async () => {
                if (editingId === task.id && editingField === 'name' && editingValue) {
                  await handleUpdateTask(task.id, 'name', editingValue);
                  setEditingId(null);
                  setEditingField(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (editingValue) {
                    handleUpdateTask(task.id, 'name', editingValue);
                    setEditingId(null);
                    setEditingField(null);
                  }
                }
              }}
              onInput={(e) => {
                const target = e.currentTarget;
                setEditingValue(target.textContent || '');
              }}
              onClick={() => {
                setEditingId(task.id);
                setEditingField('name');
              }}
              style={{
                fontWeight: '500',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                backgroundColor:
                  editingId === task.id && editingField === 'name'
                    ? '#f3f4f6'
                    : 'transparent',
                outline:
                  editingId === task.id && editingField === 'name'
                    ? `1px solid #378ADD`
                    : 'none',
              }}
            >
              {task.name}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: statusColors[task.status],
                }}
              />
              <span style={{ color: '#64748b', fontSize: '12px' }}>
                {statusIcons[task.status]}
              </span>
            </div>

            <input
              type="date"
              value={task.start_date}
              onChange={(e) => handleUpdateTask(task.id, 'start_date', e.target.value)}
              style={{
                padding: '4px 8px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                fontSize: '12px',
              }}
            />

            <input
              type="number"
              value={task.duration_days}
              onChange={(e) =>
                handleUpdateTask(task.id, 'duration_days', parseInt(e.target.value))
              }
              style={{
                padding: '4px 8px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                width: '60px',
                fontSize: '12px',
              }}
            />

            <input
              type="text"
              value={task.assigned_to}
              onChange={(e) => handleUpdateTask(task.id, 'assigned_to', e.target.value)}
              placeholder="Assignee"
              style={{
                padding: '4px 8px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                fontSize: '12px',
              }}
            />

            <input
              type="number"
              value={task.cost_estimate}
              onChange={(e) =>
                handleUpdateTask(task.id, 'cost_estimate', parseFloat(e.target.value))
              }
              style={{
                padding: '4px 8px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                width: '70px',
                fontSize: '12px',
              }}
            />

            <button
              onClick={() => handleDeleteTask(task.id)}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                padding: '0',
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>

          {editingId === task.id && editingField === 'description' && (
            <textarea
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onBlur={() => {
                if (editingValue !== task.description) {
                  handleUpdateTask(task.id, 'description', editingValue);
                }
                setEditingId(null);
                setEditingField(null);
              }}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #378ADD',
                borderRadius: '4px',
                fontFamily: 'Archivo, sans-serif',
                fontSize: '12px',
                marginBottom: '8px',
              }}
              rows={3}
              autoFocus
            />
          )}

          {!editingId || editingField !== 'description' ? (
            task.description && (
              <div
                onClick={() => {
                  setEditingId(task.id);
                  setEditingField('description');
                  setEditingValue(task.description);
                }}
                style={{
                  fontSize: '12px',
                  color: '#64748b',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  marginBottom: '8px',
                  fontStyle: 'italic',
                }}
              >
                {task.description}
              </div>
            )
          ) : null}

          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              onClick={() => handleAddTask(phaseId, task.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                fontSize: '12px',
                backgroundColor: '#e8f5e9',
                color: '#1D9E75',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'Archivo, sans-serif',
              }}
            >
              <Plus size={14} /> Add Subtask
            </button>
          </div>

          <AnimatePresence>
            {isExpanded &&
              subtasks.map((subtask) => renderTaskRow(subtask, phaseId, depth + 1))}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '400px',
          fontSize: '14px',
          color: '#64748b',
          fontFamily: 'Archivo, sans-serif',
        }}
      >
        Loading WBS...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: '#FEE2E2',
          color: '#991b1b',
          borderRadius: '6px',
          fontFamily: 'Archivo, sans-serif',
        }}
      >
        Error: {error}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#fafafa',
        borderRadius: '8px',
        fontFamily: 'Archivo, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <h2
          style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#1f2937',
            margin: '0',
            fontFamily: 'Archivo Black',
          }}
        >
          Work Breakdown Structure
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowAddPhase(!showAddPhase)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: '#1D9E75',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: 'Archivo, sans-serif',
              fontWeight: '600',
            }}
          >
            <Plus size={14} /> Phase
          </button>
          <button
            onClick={handleExportJSON}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: '#378ADD',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: 'Archivo, sans-serif',
              fontWeight: '600',
            }}
          >
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showAddPhase && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: 'white',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
            }}
          >
            <input
              type="text"
              value={newPhaseName}
              onChange={(e) => setNewPhaseName(e.target.value)}
              placeholder="Phase name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddPhase();
              }}
              autoFocus
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '13px',
                fontFamily: 'Archivo, sans-serif',
              }}
            />
            <button
              onClick={handleAddPhase}
              style={{
                padding: '8px 16px',
                backgroundColor: '#1D9E75',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontFamily: 'Archivo, sans-serif',
                fontWeight: '600',
              }}
            >
              Add
            </button>
            <button
              onClick={() => setShowAddPhase(false)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontFamily: 'Archivo, sans-serif',
              }}
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ overflowX: 'auto' }}>
        {phases.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#94a3b8',
              fontSize: '14px',
            }}
          >
            No phases yet. Click "Add Phase" to get started.
          </div>
        ) : (
          phases.map((phase, phaseIndex) => (
            <motion.div
              key={phase.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                marginBottom: '20px',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: phaseColors[phaseIndex % phaseColors.length],
              }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, phase.id)}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  backgroundColor: 'white',
                  borderBottom: '1px solid #e5e7eb',
                  cursor: 'pointer',
                }}
                onClick={() => togglePhaseExpanded(phase.id)}
              >
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0',
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                >
                  {expandedPhases.has(phase.id) ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                </button>
                <h3
                  style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#1f2937',
                    margin: '0',
                    flex: 1,
                    fontFamily: 'Archivo Black',
                  }}
                >
                  {phase.name}
                </h3>
                <span
                  style={{
                    fontSize: '12px',
                    color: '#94a3b8',
                    backgroundColor: '#e5e7eb',
                    padding: '2px 8px',
                    borderRadius: '12px',
                  }}
                >
                  {phase.tasks.length} tasks
                </span>
              </div>

              <AnimatePresence>
                {expandedPhases.has(phase.id) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ padding: '12px' }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          '30px 200px 120px 100px 80px 100px 80px 40px',
                        gap: '12px',
                        alignItems: 'center',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#64748b',
                        padding: '8px',
                        borderBottom: '2px solid #d1d5db',
                        marginBottom: '12px',
                      }}
                    >
                      <div />
                      <div>Task Name</div>
                      <div>Status</div>
                      <div>Start Date</div>
                      <div>Duration</div>
                      <div>Assignee</div>
                      <div>Cost</div>
                      <div />
                    </div>

                    <AnimatePresence>
                      {phase.tasks
                        .filter((t) => !t.parent_id)
                        .map((task) => renderTaskRow(task, phase.id))}
                    </AnimatePresence>

                    <button
                      onClick={() => handleAddTask(phase.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        marginTop: '12px',
                        backgroundColor: 'white',
                        color: '#378ADD',
                        border: '1px dashed #378ADD',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontFamily: 'Archivo, sans-serif',
                        fontWeight: '600',
                      }}
                    >
                      <Plus size={14} /> Add Task
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>

      <div
        style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: 'white',
          borderRadius: '6px',
          border: '1px solid #e5e7eb',
          fontSize: '12px',
          color: '#64748b',
        }}
      >
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: statusColors.not_started,
              }}
            />
            <span>Not Started</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: statusColors.in_progress,
              }}
            />
            <span>In Progress</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: statusColors.complete,
              }}
            />
            <span>Complete</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: statusColors.blocked,
              }}
            />
            <span>Blocked</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '3px',
                height: '16px',
                backgroundColor: statusColors.blocked,
              }}
            />
            <span>Critical Path</span>
          </div>
        </div>
      </div>
    </div>
  );
}

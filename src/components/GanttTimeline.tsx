'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronLeftDouble,
  ChevronRightDouble,
  ZoomIn,
  ZoomOut,
  Calendar,
} from 'lucide-react';

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
  tasks: Task[];
}

type TimelineViewType = 'day' | 'week' | 'month';

const statusColors = {
  not_started: '#94a3b8',
  in_progress: '#378ADD',
  complete: '#1D9E75',
  blocked: '#E8443A',
};

const phaseColors = [
  '#E8F5E9',
  '#F3E5F5',
  '#E3F2FD',
  '#FCE4EC',
  '#FFF3E0',
  '#F1F8E9',
];

export default function GanttTimeline({ projectId }: { projectId: string }) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [view, setView] = useState<TimelineViewType>('week');
  const [startDate, setStartDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);

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

  const getDateRange = useCallback(() => {
    const allTasks = phases.flatMap((p) => p.tasks);
    if (allTasks.length === 0) {
      const end = new Date(startDate);
      end.setDate(end.getDate() + 30);
      return { start: startDate, end };
    }

    const dates = allTasks.flatMap((t) => [
      new Date(t.start_date),
      new Date(t.end_date),
    ]);

    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    minDate.setDate(minDate.getDate() - 5);
    maxDate.setDate(maxDate.getDate() + 5);

    return { start: minDate, end: maxDate };
  }, [phases, startDate]);

  const { start: rangeStart, end: rangeEnd } = getDateRange();

  const getTimelineHeaders = () => {
    const headers: Array<{ date: Date; label: string }> = [];
    const current = new Date(rangeStart);

    if (view === 'day') {
      while (current <= rangeEnd) {
        headers.push({
          date: new Date(current),
          label: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        });
        current.setDate(current.getDate() + 1);
      }
    } else if (view === 'week') {
      const startOfWeek = new Date(current);
      startOfWeek.setDate(
        startOfWeek.getDate() - startOfWeek.getDay()
      );

      while (startOfWeek <= rangeEnd) {
        const weekEnd = new Date(startOfWeek);
        weekEnd.setDate(weekEnd.getDate() + 6);
        headers.push({
          date: new Date(startOfWeek),
          label: `${startOfWeek.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })} - ${weekEnd.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}`,
        });
        startOfWeek.setDate(startOfWeek.getDate() + 7);
      }
    } else if (view === 'month') {
      const current = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
      while (current <= rangeEnd) {
        headers.push({
          date: new Date(current),
          label: current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        });
        current.setMonth(current.getMonth() + 1);
      }
    }

    return headers;
  };

  const getTaskPosition = (task: Task) => {
    const totalRange = rangeEnd.getTime() - rangeStart.getTime();
    const taskStart = new Date(task.start_date).getTime();
    const taskEnd = new Date(task.end_date).getTime();

    const startPercent = ((taskStart - rangeStart.getTime()) / totalRange) * 100;
    const widthPercent = ((taskEnd - taskStart) / totalRange) * 100;

    return {
      left: Math.max(0, startPercent),
      width: Math.max(2, widthPercent),
    };
  };

  const getColumnWidth = () => {
    if (view === 'day') return 100;
    if (view === 'week') return 120;
    return 150;
  };

  const handleTaskDragStart = (
    e: React.MouseEvent,
    task: Task,
    edge?: 'start' | 'end'
  ) => {
    setDraggedTask(task.id);
    setDragOffset(e.clientX);
    e.preventDefault();
  };

  const handleTaskDragMove = (e: React.MouseEvent, task: Task) => {
    if (!draggedTask || draggedTask !== task.id) return;

    const delta = e.clientX - dragOffset;
    const totalRange = rangeEnd.getTime() - rangeStart.getTime();
    const pixelsPerDay =
      (getColumnWidth() * (view === 'day' ? 1 : view === 'week' ? 7 : 30)) /
      (totalRange / (1000 * 60 * 60 * 24));

    const daysDelta = Math.round(delta / pixelsPerDay);

    if (daysDelta !== 0) {
      const newStart = new Date(task.start_date);
      newStart.setDate(newStart.getDate() + daysDelta);

      const newEnd = new Date(task.end_date);
      newEnd.setDate(newEnd.getDate() + daysDelta);

      updateTask(task.id, {
        start_date: newStart.toISOString().split('T')[0],
        end_date: newEnd.toISOString().split('T')[0],
      });

      setDragOffset(e.clientX);
    }
  };

  const handleTaskDragEnd = () => {
    setDraggedTask(null);
  };

  const updateTask = async (
    taskId: string,
    updates: Partial<Task>
  ) => {
    try {
      const { error: err } = await supabase
        .from('project_tasks')
        .update(updates)
        .eq('id', taskId);

      if (err) throw err;

      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
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

  const renderDependencyArrows = () => {
    const allTasks = phases.flatMap((p) => p.tasks);
    const arrows: React.ReactNode[] = [];

    allTasks.forEach((task) => {
      if (!task.dependencies || task.dependencies.length === 0) return;

      task.dependencies.forEach((depId) => {
        const depTask = allTasks.find((t) => t.id === depId);
        if (!depTask) return;

        const sourcePos = getTaskPosition(depTask);
        const targetPos = getTaskPosition(task);

        arrows.push(
          <svg
            key={`arrow-${depId}-${task.id}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#cbd5e1" />
              </marker>
            </defs>
            <line
              x1={`${sourcePos.left + sourcePos.width}%`}
              y1="50%"
              x2={`${targetPos.left}%`}
              y2="50%"
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeDasharray="4,4"
              markerEnd="url(#arrowhead)"
            />
          </svg>
        );
      });
    });

    return arrows;
  };

  const renderTaskBar = (task: Task, phaseIndex: number, depth: number = 0) => {
    const position = getTaskPosition(task);
    const isCritical = criticalPath.has(task.id);
    const isSelected = selectedTask === task.id;

    return (
      <motion.div
        key={task.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          display: 'grid',
          gridTemplateColumns: '250px 1fr',
          alignItems: 'center',
          minHeight: '40px',
          borderBottom: '1px solid #f0f0f0',
          backgroundColor:
            isSelected || draggedTask === task.id ? '#f9f9f9' : 'transparent',
        }}
        onClick={() => setSelectedTask(isSelected ? null : task.id)}
      >
        <div
          style={{
            padding: '8px 12px',
            fontSize: '13px',
            fontWeight: '500',
            color: '#1f2937',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            paddingLeft: `${depth * 20 + 12}px`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor:
              phaseIndex % 2 === 0 ? 'white' : phaseColors[phaseIndex % phaseColors.length],
            borderRight: '1px solid #e5e7eb',
          }}
        >
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: statusColors[task.status],
              flexShrink: 0,
            }}
          />
          <span>{task.name}</span>
        </div>

        <div
          style={{
            position: 'relative',
            height: '100%',
            backgroundColor:
              phaseIndex % 2 === 0 ? 'white' : phaseColors[phaseIndex % phaseColors.length],
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: `${position.left}%`,
              width: `${position.width}%`,
              height: '28px',
              margin: '6px 0',
              backgroundColor: isCritical
                ? '#FF6B35'
                : statusColors[task.status],
              borderRadius: '3px',
              border: isSelected ? '2px solid #378ADD' : 'none',
              cursor: 'grab',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: '6px',
              fontSize: '11px',
              color: 'white',
              fontWeight: '600',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}
            onMouseDown={(e) => handleTaskDragStart(e, task)}
            onMouseMove={(e) => {
              if (draggedTask === task.id) {
                handleTaskDragMove(e, task);
              }
            }}
            onMouseUp={handleTaskDragEnd}
            onMouseLeave={handleTaskDragEnd}
          >
            {task.duration_days}d
          </div>
        </div>
      </motion.div>
    );
  };

  const renderTodayMarker = () => {
    const today = new Date();
    if (today < rangeStart || today > rangeEnd) return null;

    const totalRange = rangeEnd.getTime() - rangeStart.getTime();
    const todayPercent = ((today.getTime() - rangeStart.getTime()) / totalRange) * 100;

    return (
      <div
        style={{
          position: 'absolute',
          left: `${todayPercent}%`,
          top: 0,
          bottom: 0,
          width: '2px',
          backgroundColor: '#E8443A',
          zIndex: 10,
        }}
      />
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
        Loading Gantt chart...
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

  const headers = getTimelineHeaders();
  const columnWidth = getColumnWidth();
  const totalWidth = headers.length * columnWidth;

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#fafafa',
        borderRadius: '8px',
        fontFamily: 'Archivo, sans-serif',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
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
          Gantt Timeline
        </h2>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => {
              const newDate = new Date(startDate);
              newDate.setMonth(newDate.getMonth() - 3);
              setStartDate(newDate);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              color: '#64748b',
            }}
          >
            <ChevronLeftDouble size={18} />
          </button>
          <button
            onClick={() => {
              const newDate = new Date(startDate);
              newDate.setMonth(newDate.getMonth() - 1);
              setStartDate(newDate);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              color: '#64748b',
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <input
            type="date"
            value={startDate.toISOString().split('T')[0]}
            onChange={(e) => setStartDate(new Date(e.target.value))}
            style={{
              padding: '6px 10px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '12px',
            }}
          />
          <button
            onClick={() => {
              const newDate = new Date(startDate);
              newDate.setMonth(newDate.getMonth() + 1);
              setStartDate(newDate);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              color: '#64748b',
            }}
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => {
              const newDate = new Date(startDate);
              newDate.setMonth(newDate.getMonth() + 3);
              setStartDate(newDate);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              color: '#64748b',
            }}
          >
            <ChevronRightDouble size={18} />
          </button>

          <div style={{ width: '1px', height: '24px', backgroundColor: '#d1d5db' }} />

          <select
            value={view}
            onChange={(e) => setView(e.target.value as TimelineViewType)}
            style={{
              padding: '6px 10px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'Archivo, sans-serif',
            }}
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          overflow: 'hidden',
          backgroundColor: 'white',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '250px 1fr',
            borderBottom: '2px solid #e5e7eb',
            backgroundColor: '#f9fafb',
          }}
        >
          <div
            style={{
              padding: '12px',
              fontWeight: '700',
              fontSize: '12px',
              color: '#1f2937',
              borderRight: '1px solid #e5e7eb',
            }}
          >
            Task Name
          </div>

          <div
            style={{
              overflowX: 'auto',
              overflowY: 'hidden',
              backgroundColor: '#f9fafb',
            }}
            ref={scrollContainerRef}
            onScroll={(e) => setScrollLeft((e.target as HTMLDivElement).scrollLeft)}
          >
            <div style={{ width: `${totalWidth}px`, display: 'flex' }}>
              {headers.map((header, index) => (
                <div
                  key={index}
                  style={{
                    width: `${columnWidth}px`,
                    padding: '12px 8px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#64748b',
                    borderRight: '1px solid #e5e7eb',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {header.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '250px 1fr',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              overflow: 'auto',
              borderRight: '1px solid #e5e7eb',
              backgroundColor: 'white',
            }}
          >
            <AnimatePresence>
              {phases.map((phase, phaseIndex) => (
                <div key={phase.id}>
                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: phaseColors[phaseIndex % phaseColors.length],
                      borderBottom: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      minHeight: '40px',
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
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </button>
                    <span style={{ fontSize: '13px', color: '#1f2937' }}>
                      {phase.name}
                    </span>
                  </div>

                  <AnimatePresence>
                    {expandedPhases.has(phase.id) &&
                      phase.tasks
                        .filter((t) => !t.parent_id)
                        .map((task) => (
                          <div key={task.id}>
                            {renderTaskBar(task, phaseIndex)}

                            {expandedTasks.has(task.id) &&
                              phase.tasks
                                .filter((t) => t.parent_id === task.id)
                                .map((subtask) =>
                                  renderTaskBar(subtask, phaseIndex, 1)
                                )}
                          </div>
                        ))}
                  </AnimatePresence>
                </div>
              ))}
            </AnimatePresence>
          </div>

          <div
            style={{
              overflow: 'auto',
              position: 'relative',
            }}
            ref={scrollContainerRef}
            onScroll={(e) => {
              const target = e.currentTarget;
              const leftPanel = target.previousElementSibling as HTMLDivElement;
              if (leftPanel) {
                leftPanel.scrollTop = target.scrollTop;
              }
            }}
          >
            <div style={{ position: 'relative', width: `${totalWidth}px` }}>
              {renderTodayMarker()}
              {renderDependencyArrows()}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${headers.length}, ${columnWidth}px)`,
                  minHeight: '100%',
                }}
              >
                {headers.map((header, index) => (
                  <div
                    key={index}
                    style={{
                      borderRight: '1px solid #f0f0f0',
                      backgroundColor:
                        index % 2 === 0 ? 'white' : '#fafafa',
                    }}
                  />
                ))}
              </div>

              <AnimatePresence>
                {phases.map((phase, phaseIndex) => (
                  <div key={`timeline-${phase.id}`}>
                    {expandedPhases.has(phase.id) &&
                      phase.tasks
                        .filter((t) => !t.parent_id)
                        .map((task) => (
                          <div key={`bar-${task.id}`}>
                            <div
                              style={{
                                minHeight: '40px',
                                borderBottom: '1px solid #f0f0f0',
                                backgroundColor:
                                  phaseIndex % 2 === 0
                                    ? 'white'
                                    : phaseColors[phaseIndex % phaseColors.length],
                                position: 'relative',
                              }}
                            >
                              {renderTodayMarker()}
                            </div>

                            {expandedTasks.has(task.id) &&
                              phase.tasks
                                .filter((t) => t.parent_id === task.id)
                                .map(() => (
                                  <div
                                    key={`subtask-spacing-${task.id}`}
                                    style={{
                                      minHeight: '40px',
                                      borderBottom: '1px solid #f0f0f0',
                                      backgroundColor:
                                        phaseIndex % 2 === 0
                                          ? 'white'
                                          : phaseColors[phaseIndex % phaseColors.length],
                                    }}
                                  />
                                ))}
                          </div>
                        ))}
                  </div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: 'white',
          borderRadius: '6px',
          border: '1px solid #e5e7eb',
          display: 'flex',
          gap: '24px',
          fontSize: '12px',
          color: '#64748b',
          flexWrap: 'wrap',
        }}
      >
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
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#FF6B35',
            }}
          />
          <span>Critical Path</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '2px', height: '16px', backgroundColor: '#E8443A' }} />
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}

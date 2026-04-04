'use client';

import React, { useMemo, useState } from 'react';

interface Task {
  name: string;
  startWeek: number;
  endWeek: number;
}

interface Phase {
  name: string;
  startWeek: number;
  endWeek: number;
  tasks: Task[];
}

interface Milestone {
  name: string;
  week: number;
  type: 'major' | 'minor';
}

interface GanttChartProps {
  phases: Phase[];
  totalWeeks: number;
  criticalPath?: string[];
  milestones?: Milestone[];
}

const phaseColors: Record<string, string> = {
  'Preconstruction': '#3b82f6',
  'Foundation': '#9ca3af',
  'Structure': '#f97316',
  'MEP': '#22c55e',
  'Finishes': '#a855f7',
  'Closeout': '#06b6d4',
};

const GanttChart: React.FC<GanttChartProps> = ({
  phases,
  totalWeeks,
  criticalPath = [],
  milestones = [],
}) => {
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);

  const weekArray = useMemo(() => {
    return Array.from({ length: totalWeeks }, (_, i) => i + 1);
  }, [totalWeeks]);

  const cellWidth = 40;
  const chartWidth = weekArray.length * cellWidth;

  const isCriticalPath = (taskName: string): boolean => {
    return criticalPath.includes(taskName);
  };

  const getPhaseColor = (phaseName: string): string => {
    return phaseColors[phaseName] || '#6b7280';
  };

  const calculatePosition = (startWeek: number): number => {
    return (startWeek - 1) * cellWidth;
  };

  const calculateWidth = (startWeek: number, endWeek: number): number => {
    return (endWeek - startWeek + 1) * cellWidth;
  };

  return (
    <div
      style={
        {
          '--bg': '#ffffff',
          '--fg': '#1f2937',
          '--border': '#e5e7eb',
          '--accent': '#3b82f6',
        } as React.CSSProperties
      }
      className="flex flex-col gap-4 p-6 bg-white rounded-lg border border-gray-200"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Project Gantt Chart</h2>
        <div className="text-sm text-gray-600">
          Total Duration: {totalWeeks} weeks
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4">
        <div style={{ width: '200px', flexShrink: 0 }}>
          <div className="font-semibold text-gray-700 mb-2 h-8 flex items-center">
            Phases & Tasks
          </div>

          {phases.map((phase) => (
            <div key={phase.name} className="mb-2">
              <div className="font-semibold text-gray-800 h-8 flex items-center px-2 bg-gray-50 rounded">
                {phase.name}
              </div>
              {phase.tasks.map((task) => (
                <div
                  key={`${phase.name}-${task.name}`}
                  className="h-8 flex items-center px-4 text-sm text-gray-600 border-l-2 border-gray-200"
                >
                  {task.name}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="relative flex-1 overflow-x-auto">
          <div
            className="relative"
            style={{
              width: `${chartWidth}px`,
              minWidth: '100%',
            }}
          >
            <div className="flex border-b border-gray-300">
              {weekArray.map((week) => (
                <div
                  key={week}
                  style={{ width: `${cellWidth}px` }}
                  className="text-xs font-semibold text-gray-600 text-center py-2 border-r border-gray-200"
                >
                  W{week}
                </div>
              ))}
            </div>

            <svg
              className="absolute top-10 left-0 pointer-events-none"
              style={{ width: `${chartWidth}px`, height: '100%' }}
            >
              <defs>
                <pattern
                  id="grid"
                  width={cellWidth}
                  height="1"
                  patternUnits="userSpaceOnUse"
                >
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="100%"
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width={chartWidth} height="100%" fill="url(#grid)" />
            </svg>

            <div className="relative pt-10">
              {phases.map((phase, phaseIndex) => (
                <div key={`phase-${phaseIndex}`}>
                  <div
                    style={{
                      height: '32px',
                      position: 'relative',
                      marginBottom: '8px',
                    }}
                  >
                    <div
                      className="absolute h-8 rounded bg-opacity-80 cursor-pointer transition-all hover:shadow-lg"
                      style={{
                        left: `${calculatePosition(phase.startWeek)}px`,
                        width: `${calculateWidth(
                          phase.startWeek,
                          phase.endWeek
                        )}px`,
                        backgroundColor: getPhaseColor(phase.name),
                        top: '0px',
                      }}
                      onMouseEnter={() => setHoveredTask(phase.name)}
                      onMouseLeave={() => setHoveredTask(null)}
                      title={`${phase.name}: Week ${phase.startWeek} - ${phase.endWeek}`}
                    >
                      <span className="text-xs text-white font-semibold px-2 py-1 leading-8">
                        {hoveredTask === phase.name && (
                          <span className="whitespace-nowrap">
                            W{phase.startWeek}-{phase.endWeek}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {phase.tasks.map((task, taskIndex) => (
                    <div
                      key={`task-${phaseIndex}-${taskIndex}`}
                      style={{
                        height: '32px',
                        position: 'relative',
                        marginBottom: '4px',
                      }}
                    >
                      <div
                        className={`absolute h-6 rounded cursor-pointer transition-all hover:shadow-md ${
                          isCriticalPath(task.name)
                            ? 'border-2 border-red-500'
                            : 'border border-gray-300'
                        }`}
                        style={{
                          left: `${calculatePosition(task.startWeek)}px`,
                          width: `${calculateWidth(
                            task.startWeek,
                            task.endWeek
                          )}px`,
                          backgroundColor: isCriticalPath(task.name)
                            ? getPhaseColor(phase.name)
                            : `${getPhaseColor(phase.name)}40`,
                          top: '4px',
                        }}
                        onMouseEnter={() =>
                          setHoveredTask(`${phase.name}-${task.name}`)
                        }
                        onMouseLeave={() => setHoveredTask(null)}
                      >
                        {hoveredTask === `${phase.name}-${task.name}` && (
                          <div className="absolute bottom-full left-0 mb-2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
                            <div className="font-semibold">{task.name}</div>
                            <div>
                              W{task.startWeek}-{task.endWeek} (
                              {task.endWeek - task.startWeek + 1}w)
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {milestones.map((milestone, idx) => (
                <div
                  key={`milestone-${idx}`}
                  className="absolute flex flex-col items-center"
                  style={{
                    left: `${calculatePosition(milestone.week)}px`,
                    top: '0px',
                  }}
                >
                  <div
                    className={`text-lg leading-none ${
                      milestone.type === 'major'
                        ? 'text-purple-600'
                        : 'text-gray-400'
                    }`}
                  >
                    ◆
                  </div>
                  <div className="text-xs text-gray-600 mt-1 bg-white px-1 rounded whitespace-nowrap">
                    {milestone.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6 text-xs text-gray-600 mt-4 px-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-400 rounded"></div>
          <span>Regular Task</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-400 rounded border-2 border-red-500"></div>
          <span>Critical Path</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg text-purple-600">◆</span>
          <span>Milestone</span>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;

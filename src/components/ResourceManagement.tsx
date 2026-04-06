'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { supabase } from '@/lib/supabase';

// TypeScript Interfaces
interface Certification {
  id: string;
  name: string;
  expiry_date: string;
  status: 'active' | 'expiring_soon' | 'expired';
}

interface CrewMember {
  id: string;
  name: string;
  trade: string;
  skill_level: 'apprentice' | 'journeyman' | 'master';
  hourly_rate: number;
  availability: 'available' | 'on_site' | 'unavailable';
  certifications: Certification[];
}

interface TaskAssignment {
  id: string;
  crew_member_id: string;
  task_id: string;
  task_name: string;
  hours_assigned: number;
  required_trade: string;
  week_starting: string;
}

interface WeeklyCapacity {
  crew_member_id: string;
  week_starting: string;
  total_hours: number;
  assigned_hours: number;
  overallocated: boolean;
}

interface Task {
  id: string;
  name: string;
  required_trade: string;
  estimated_hours: number;
  week_starting: string;
  priority: 'low' | 'medium' | 'high';
}

const BRAND_COLORS = {
  green: '#1D9E75',
  gold: '#D85A30',
  red: '#E8443A',
  purple: '#7F77DD',
  blue: '#378ADD',
};

const TRADES = [
  'Carpenter',
  'Electrician',
  'Plumber',
  'HVAC Technician',
  'Mason',
  'Roofer',
  'Painter',
  'Laborer',
];

const SKILL_LEVELS = ['apprentice', 'journeyman', 'master'];

export default function ResourceManagement() {
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([
    {
      id: '1',
      name: 'John Smith',
      trade: 'Carpenter',
      skill_level: 'journeyman',
      hourly_rate: 65,
      availability: 'available',
      certifications: [
        {
          id: '1',
          name: 'OSHA 30-Hour',
          expiry_date: '2026-08-15',
          status: 'active',
        },
      ],
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      trade: 'Electrician',
      skill_level: 'master',
      hourly_rate: 80,
      availability: 'on_site',
      certifications: [
        {
          id: '2',
          name: 'Journeyman Electrician',
          expiry_date: '2026-12-01',
          status: 'active',
        },
        {
          id: '3',
          name: 'First Aid CPR',
          expiry_date: '2026-04-20',
          status: 'expiring_soon',
        },
      ],
    },
    {
      id: '3',
      name: 'Mike Chen',
      trade: 'Plumber',
      skill_level: 'journeyman',
      hourly_rate: 70,
      availability: 'available',
      certifications: [
        {
          id: '4',
          name: 'Journeyman Plumber',
          expiry_date: '2027-03-10',
          status: 'active',
        },
      ],
    },
    {
      id: '4',
      name: 'James Wilson',
      trade: 'Carpenter',
      skill_level: 'apprentice',
      hourly_rate: 45,
      availability: 'available',
      certifications: [],
    },
  ]);

  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      name: 'Framing - East Wing',
      required_trade: 'Carpenter',
      estimated_hours: 80,
      week_starting: '2026-04-06',
      priority: 'high',
    },
    {
      id: '2',
      name: 'Electrical Rough-In',
      required_trade: 'Electrician',
      estimated_hours: 60,
      week_starting: '2026-04-13',
      priority: 'high',
    },
    {
      id: '3',
      name: 'Plumbing Installation',
      required_trade: 'Plumber',
      estimated_hours: 40,
      week_starting: '2026-04-13',
      priority: 'medium',
    },
  ]);

  const [assignments, setAssignments] = useState<TaskAssignment[]>([
    {
      id: '1',
      crew_member_id: '1',
      task_id: '1',
      task_name: 'Framing - East Wing',
      hours_assigned: 40,
      required_trade: 'Carpenter',
      week_starting: '2026-04-06',
    },
    {
      id: '2',
      crew_member_id: '4',
      task_id: '1',
      task_name: 'Framing - East Wing',
      hours_assigned: 32,
      required_trade: 'Carpenter',
      week_starting: '2026-04-06',
    },
    {
      id: '3',
      crew_member_id: '2',
      task_id: '2',
      task_name: 'Electrical Rough-In',
      hours_assigned: 60,
      required_trade: 'Electrician',
      week_starting: '2026-04-13',
    },
  ]);

  const [filterTrade, setFilterTrade] = useState<string>('');
  const [filterAvailability, setFilterAvailability] = useState<string>('');
  const [filterSkillLevel, setFilterSkillLevel] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddCrewForm, setShowAddCrewForm] = useState(false);
  const [editingCrew, setEditingCrew] = useState<CrewMember | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string>('2026-04-06');

  // Add new crew member form state
  const [newCrewForm, setNewCrewForm] = useState<Partial<CrewMember>>({
    name: '',
    trade: TRADES[0],
    skill_level: 'apprentice',
    hourly_rate: 45,
    availability: 'available',
    certifications: [],
  });

  // Calculate certifications status
  const calculateCertStatus = (expiryDate: string): Certification['status'] => {
    const today = new Date('2026-04-05');
    const expiry = new Date(expiryDate);
    const daysUntilExpiry =
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 30) return 'expiring_soon';
    return 'active';
  };

  // Filter crew members
  const filteredCrewMembers = useMemo(() => {
    return crewMembers.filter((member) => {
      const matchesTrade = !filterTrade || member.trade === filterTrade;
      const matchesAvailability =
        !filterAvailability || member.availability === filterAvailability;
      const matchesSkillLevel =
        !filterSkillLevel || member.skill_level === filterSkillLevel;
      const matchesSearch =
        !searchQuery ||
        member.name.toLowerCase().includes(searchQuery.toLowerCase());

      return (
        matchesTrade &&
        matchesAvailability &&
        matchesSkillLevel &&
        matchesSearch
      );
    });
  }, [crewMembers, filterTrade, filterAvailability, filterSkillLevel, searchQuery]);

  // Calculate weekly capacity
  const weeklyCapacity = useMemo<Record<string, WeeklyCapacity>>(() => {
    const capacity: Record<string, WeeklyCapacity> = {};

    crewMembers.forEach((member) => {
      capacity[member.id] = {
        crew_member_id: member.id,
        week_starting: selectedWeek,
        total_hours: 40,
        assigned_hours: 0,
        overallocated: false,
      };
    });

    assignments
      .filter((a) => a.week_starting === selectedWeek)
      .forEach((assignment) => {
        if (capacity[assignment.crew_member_id]) {
          capacity[assignment.crew_member_id].assigned_hours +=
            assignment.hours_assigned;
        }
      });

    Object.values(capacity).forEach((c) => {
      c.overallocated = c.assigned_hours > c.total_hours;
    });

    return capacity;
  }, [crewMembers, assignments, selectedWeek]);

  // Suggest best crew members for a task
  const suggestCrewForTask = useCallback(
    (requiredTrade: string): CrewMember[] => {
      return filteredCrewMembers
        .filter(
          (member) =>
            member.trade === requiredTrade && member.availability !== 'unavailable'
        )
        .sort((a, b) => {
          const aSkillValue = SKILL_LEVELS.indexOf(a.skill_level);
          const bSkillValue = SKILL_LEVELS.indexOf(b.skill_level);
          return bSkillValue - aSkillValue;
        });
    },
    [filteredCrewMembers]
  );

  // Calculate total labor cost
  const totalLaborCost = useMemo(() => {
    return assignments.reduce((sum, assignment) => {
      const member = crewMembers.find((c) => c.id === assignment.crew_member_id);
      return sum + (member ? member.hourly_rate * assignment.hours_assigned : 0);
    }, 0);
  }, [assignments, crewMembers]);

  // Handle add crew member
  const handleAddCrewMember = useCallback(() => {
    if (!newCrewForm.name || !newCrewForm.trade) return;

    const crew: CrewMember = {
      id: Date.now().toString(),
      name: newCrewForm.name,
      trade: newCrewForm.trade,
      skill_level: newCrewForm.skill_level || 'apprentice',
      hourly_rate: newCrewForm.hourly_rate || 45,
      availability: newCrewForm.availability || 'available',
      certifications: newCrewForm.certifications || [],
    };

    setCrewMembers((members) => [...members, crew]);
    setNewCrewForm({
      name: '',
      trade: TRADES[0],
      skill_level: 'apprentice',
      hourly_rate: 45,
      availability: 'available',
      certifications: [],
    });
    setShowAddCrewForm(false);
  }, [newCrewForm]);

  // Handle delete crew member
  const handleDeleteCrewMember = useCallback((id: string) => {
    setCrewMembers((members) => members.filter((m) => m.id !== id));
    setAssignments((a) => a.filter((assignment) => assignment.crew_member_id !== id));
  }, []);

  // Handle assign task
  const handleAssignTask = useCallback(
    (crewMemberId: string, taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      const crew = crewMembers.find((c) => c.id === crewMemberId);

      if (!task || !crew) return;

      const newAssignment: TaskAssignment = {
        id: Date.now().toString(),
        crew_member_id: crewMemberId,
        task_id: taskId,
        task_name: task.name,
        hours_assigned: Math.min(40, task.estimated_hours),
        required_trade: task.required_trade,
        week_starting: task.week_starting,
      };

      setAssignments((a) => [...a, newAssignment]);
    },
    [tasks, crewMembers]
  );

  // Handle unassign task
  const handleUnassignTask = useCallback((assignmentId: string) => {
    setAssignments((a) => a.filter((assignment) => assignment.id !== assignmentId));
  }, []);

  // Get assignments for crew member in selected week
  const getAssignmentsForCrew = useCallback(
    (crewId: string) => {
      return assignments.filter(
        (a) => a.crew_member_id === crewId && a.week_starting === selectedWeek
      );
    },
    [assignments, selectedWeek]
  );

  // Calendar heatmap data
  const heatmapData = useMemo(() => {
    const data: Record<string, number> = {};

    crewMembers.forEach((member) => {
      const key = `${member.id}-${selectedWeek}`;
      const capacity = weeklyCapacity[member.id];
      data[key] = capacity
        ? (capacity.assigned_hours / capacity.total_hours) * 100
        : 0;
    });

    return data;
  }, [crewMembers, weeklyCapacity, selectedWeek]);

  const getHeatmapColor = (percentage: number): string => {
    if (percentage === 0) return '#f0f0f0';
    if (percentage <= 50) return BRAND_COLORS.green;
    if (percentage <= 90) return BRAND_COLORS.gold;
    return BRAND_COLORS.red;
  };

  return (
    <div
      style={{
        padding: '32px',
        backgroundColor: '#f9f9f7',
        minHeight: '100vh',
        fontFamily: "'Archivo', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>
          Resource Management
        </h1>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Manage crew roster, assignments, and capacity planning
        </p>
      </div>

      {/* Cost Summary & Week Selector */}
      <motion.div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '24px',
          marginBottom: '32px',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderLeft: `4px solid ${BRAND_COLORS.blue}`,
          }}
        >
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
            Total Labor Cost
          </p>
          <p
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: BRAND_COLORS.blue,
            }}
          >
            ${totalLaborCost.toLocaleString('en-US', {
              minimumFractionDigits: 0,
            })}
          </p>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
            {assignments.length} active assignments
          </p>
        </div>

        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '8px' }}>
            Week Starting
          </label>
          <input
            type="date"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: `1px solid #ddd`,
              borderRadius: '4px',
              fontSize: '13px',
              fontFamily: "'Archivo', sans-serif",
              cursor: 'pointer',
            }}
          />
        </div>
      </motion.div>

      {/* Team Utilization Heatmap */}
      <motion.div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
          Team Utilization — Week of {selectedWeek}
        </h2>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
              minWidth: '500px',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '12px 8px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    color: '#666',
                  }}
                >
                  Crew Member
                </th>
                <th
                  style={{
                    textAlign: 'center',
                    padding: '12px 8px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    color: '#666',
                  }}
                >
                  Utilization
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: '12px 8px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    color: '#666',
                  }}
                >
                  Hours
                </th>
              </tr>
            </thead>
            <tbody>
              {crewMembers.map((member) => {
                const capacity = weeklyCapacity[member.id];
                const percentage =
                  capacity.total_hours > 0
                    ? (capacity.assigned_hours / capacity.total_hours) * 100
                    : 0;
                const heatmapColor = getHeatmapColor(percentage);

                return (
                  <tr
                    key={member.id}
                    style={{
                      borderBottom: '1px solid #eee',
                      backgroundColor: capacity.overallocated ? '#ffebee' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px 8px' }}>
                      <div>
                        <p style={{ fontWeight: 600, marginBottom: '2px' }}>
                          {member.name}
                        </p>
                        <p style={{ fontSize: '11px', color: '#999' }}>
                          {member.trade}
                        </p>
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <div
                        style={{
                          width: '120px',
                          height: '24px',
                          backgroundColor: '#f0f0f0',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          margin: '0 auto',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(percentage, 100)}%`,
                            height: '100%',
                            backgroundColor: heatmapColor,
                            transition: 'width 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {percentage > 20 && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                color: 'white',
                              }}
                            >
                              {Math.round(percentage)}%
                            </span>
                          )}
                        </div>
                        {percentage <= 20 && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              color: '#666',
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                            }}
                          >
                            {Math.round(percentage)}%
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '12px 8px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: capacity.overallocated ? BRAND_COLORS.red : '#333',
                      }}
                    >
                      {capacity.assigned_hours}/{capacity.total_hours}h
                      {capacity.overallocated && (
                        <span style={{ marginLeft: '8px', color: BRAND_COLORS.red }}>
                          ⚠️
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '24px', marginTop: '16px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                backgroundColor: BRAND_COLORS.green,
                borderRadius: '3px',
              }}
            />
            <span>Good (0-50%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                backgroundColor: BRAND_COLORS.gold,
                borderRadius: '3px',
              }}
            />
            <span>Heavy (50-90%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                backgroundColor: BRAND_COLORS.red,
                borderRadius: '3px',
              }}
            />
            <span>Over (90%+)</span>
          </div>
        </div>
      </motion.div>

      {/* Crew Roster Section */}
      <motion.div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Crew Roster</h2>
          <button
            onClick={() => setShowAddCrewForm(!showAddCrewForm)}
            style={{
              padding: '8px 16px',
              backgroundColor: BRAND_COLORS.green,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) =>
              ((e.target as HTMLElement).style.backgroundColor = '#158f63')
            }
            onMouseOut={(e) =>
              ((e.target as HTMLElement).style.backgroundColor =
                BRAND_COLORS.green)
            }
          >
            + Add Crew Member
          </button>
        </div>

        {/* Add Crew Form */}
        <AnimatePresence>
          {showAddCrewForm && (
            <motion.div
              style={{
                backgroundColor: '#f5f5f5',
                borderRadius: '6px',
                padding: '16px',
                marginBottom: '16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
              }}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <input
                type="text"
                placeholder="Name"
                value={newCrewForm.name || ''}
                onChange={(e) =>
                  setNewCrewForm({ ...newCrewForm, name: e.target.value })
                }
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontFamily: "'Archivo', sans-serif",
                }}
              />
              <select
                value={newCrewForm.trade || TRADES[0]}
                onChange={(e) =>
                  setNewCrewForm({ ...newCrewForm, trade: e.target.value })
                }
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontFamily: "'Archivo', sans-serif",
                  cursor: 'pointer',
                }}
              >
                {TRADES.map((trade) => (
                  <option key={trade} value={trade}>
                    {trade}
                  </option>
                ))}
              </select>
              <select
                value={newCrewForm.skill_level || 'apprentice'}
                onChange={(e) =>
                  setNewCrewForm({
                    ...newCrewForm,
                    skill_level: e.target.value as CrewMember['skill_level'],
                  })
                }
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontFamily: "'Archivo', sans-serif",
                  cursor: 'pointer',
                }}
              >
                <option value="apprentice">Apprentice</option>
                <option value="journeyman">Journeyman</option>
                <option value="master">Master</option>
              </select>
              <input
                type="number"
                placeholder="Hourly Rate"
                value={newCrewForm.hourly_rate || 45}
                onChange={(e) =>
                  setNewCrewForm({
                    ...newCrewForm,
                    hourly_rate: parseFloat(e.target.value),
                  })
                }
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontFamily: "'Archivo', sans-serif",
                }}
              />
              <select
                value={newCrewForm.availability || 'available'}
                onChange={(e) =>
                  setNewCrewForm({
                    ...newCrewForm,
                    availability: e.target.value as CrewMember['availability'],
                  })
                }
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontFamily: "'Archivo', sans-serif",
                  cursor: 'pointer',
                }}
              >
                <option value="available">Available</option>
                <option value="on_site">On Site</option>
                <option value="unavailable">Unavailable</option>
              </select>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleAddCrewMember}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    backgroundColor: BRAND_COLORS.green,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Add Member
                </button>
                <button
                  onClick={() => setShowAddCrewForm(false)}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    backgroundColor: '#ddd',
                    color: '#333',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '13px',
              fontFamily: "'Archivo', sans-serif",
            }}
          />
          <select
            value={filterTrade}
            onChange={(e) => setFilterTrade(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '13px',
              fontFamily: "'Archivo', sans-serif",
              cursor: 'pointer',
            }}
          >
            <option value="">All Trades</option>
            {TRADES.map((trade) => (
              <option key={trade} value={trade}>
                {trade}
              </option>
            ))}
          </select>
          <select
            value={filterAvailability}
            onChange={(e) => setFilterAvailability(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '13px',
              fontFamily: "'Archivo', sans-serif",
              cursor: 'pointer',
            }}
          >
            <option value="">All Availability</option>
            <option value="available">Available</option>
            <option value="on_site">On Site</option>
            <option value="unavailable">Unavailable</option>
          </select>
          <select
            value={filterSkillLevel}
            onChange={(e) => setFilterSkillLevel(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '13px',
              fontFamily: "'Archivo', sans-serif",
              cursor: 'pointer',
            }}
          >
            <option value="">All Skill Levels</option>
            <option value="apprentice">Apprentice</option>
            <option value="journeyman">Journeyman</option>
            <option value="master">Master</option>
          </select>
        </div>

        {/* Crew Cards Grid */}
        <motion.div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {filteredCrewMembers.map((member) => {
            const memberAssignments = getAssignmentsForCrew(member.id);
            const hasExpiringCerts = member.certifications.some(
              (c) => calculateCertStatus(c.expiry_date) === 'expiring_soon'
            );
            const hasExpiredCerts = member.certifications.some(
              (c) => calculateCertStatus(c.expiry_date) === 'expired'
            );

            return (
              <motion.div
                key={member.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: hasExpiredCerts
                    ? `2px solid ${BRAND_COLORS.red}`
                    : hasExpiringCerts
                      ? `2px solid ${BRAND_COLORS.gold}`
                      : '1px solid #eee',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
                whileHover={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              >
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px',
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        marginBottom: '4px',
                      }}
                    >
                      {member.name}
                    </h3>
                    <p style={{ fontSize: '12px', color: '#666' }}>
                      {member.trade} — {member.skill_level}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteCrewMember(member.id)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#f0f0f0',
                      color: '#666',
                      border: 'none',
                      borderRadius: '3px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => {
                      const el = e.target as HTMLElement;
                      el.style.backgroundColor = BRAND_COLORS.red;
                      el.style.color = 'white';
                    }}
                    onMouseOut={(e) => {
                      const el = e.target as HTMLElement;
                      el.style.backgroundColor = '#f0f0f0';
                      el.style.color = '#666';
                    }}
                  >
                    Remove
                  </button>
                </div>

                {/* Status Badges */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      backgroundColor:
                        member.availability === 'available'
                          ? '#e8f5e9'
                          : member.availability === 'on_site'
                            ? '#fff3e0'
                            : '#ffebee',
                      color:
                        member.availability === 'available'
                          ? BRAND_COLORS.green
                          : member.availability === 'on_site'
                            ? BRAND_COLORS.gold
                            : BRAND_COLORS.red,
                      borderRadius: '3px',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}
                  >
                    {member.availability}
                  </span>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      backgroundColor: '#e3f2fd',
                      color: BRAND_COLORS.blue,
                      borderRadius: '3px',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    ${member.hourly_rate}/hr
                  </span>
                </div>

                {/* Assignments for this week */}
                {memberAssignments.length > 0 && (
                  <div style={{ marginBottom: '12px', fontSize: '12px' }}>
                    <p
                      style={{
                        fontWeight: 600,
                        marginBottom: '6px',
                        color: '#333',
                      }}
                    >
                      This Week's Assignments
                    </p>
                    {memberAssignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        style={{
                          padding: '6px 8px',
                          backgroundColor: '#f5f5f5',
                          borderRadius: '3px',
                          marginBottom: '4px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ flex: 1 }}>
                          {assignment.task_name} ({assignment.hours_assigned}h)
                        </span>
                        <button
                          onClick={() => handleUnassignTask(assignment.id)}
                          style={{
                            padding: '2px 6px',
                            backgroundColor: '#ffcdd2',
                            color: BRAND_COLORS.red,
                            border: 'none',
                            borderRadius: '2px',
                            fontSize: '10px',
                            cursor: 'pointer',
                          }}
                        >
                          Unassign
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Certifications */}
                {member.certifications.length > 0 && (
                  <div style={{ marginBottom: '12px', fontSize: '11px' }}>
                    <p style={{ fontWeight: 600, marginBottom: '6px' }}>
                      Certifications
                    </p>
                    {member.certifications.map((cert) => {
                      const status = calculateCertStatus(cert.expiry_date);
                      return (
                        <div
                          key={cert.id}
                          style={{
                            padding: '4px 6px',
                            backgroundColor:
                              status === 'active'
                                ? '#e8f5e9'
                                : status === 'expiring_soon'
                                  ? '#fff3e0'
                                  : '#ffebee',
                            borderRadius: '2px',
                            marginBottom: '4px',
                            borderLeft: `3px solid ${
                              status === 'active'
                                ? BRAND_COLORS.green
                                : status === 'expiring_soon'
                                  ? BRAND_COLORS.gold
                                  : BRAND_COLORS.red
                            }`,
                          }}
                        >
                          <p style={{ margin: '0 0 2px 0' }}>{cert.name}</p>
                          <p style={{ margin: 0, color: '#666' }}>
                            Expires: {cert.expiry_date}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Suggested Tasks */}
                {member.availability !== 'unavailable' && (
                  <div style={{ borderTop: '1px solid #eee', paddingTop: '12px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>
                      Suggested Tasks
                    </p>
                    {tasks
                      .filter((t) => t.required_trade === member.trade)
                      .slice(0, 2)
                      .map((task) => (
                        <button
                          key={task.id}
                          onClick={() => handleAssignTask(member.id, task.id)}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '6px 8px',
                            backgroundColor: BRAND_COLORS.green,
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            marginBottom: '4px',
                            transition: 'background-color 0.2s',
                          }}
                          onMouseOver={(e) =>
                            ((e.target as HTMLElement).style.backgroundColor =
                              '#158f63')
                          }
                          onMouseOut={(e) =>
                            ((e.target as HTMLElement).style.backgroundColor =
                              BRAND_COLORS.green)
                          }
                        >
                          Assign to {task.name}
                        </button>
                      ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {filteredCrewMembers.length === 0 && (
          <p style={{ textAlign: 'center', color: '#999', fontSize: '13px' }}>
            No crew members found matching your filters
          </p>
        )}
      </motion.div>

      {/* Assignment Board */}
      <motion.div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
          Assignment Board — Week of {selectedWeek}
        </h2>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
              minWidth: '600px',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '12px 8px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    color: '#666',
                  }}
                >
                  Task
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '12px 8px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    color: '#666',
                  }}
                >
                  Assigned To
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: '12px 8px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    color: '#666',
                  }}
                >
                  Hours
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: '12px 8px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    color: '#666',
                  }}
                >
                  Cost
                </th>
                <th
                  style={{
                    textAlign: 'center',
                    padding: '12px 8px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    color: '#666',
                  }}
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {assignments
                .filter((a) => a.week_starting === selectedWeek)
                .map((assignment) => {
                  const crew = crewMembers.find((c) => c.id === assignment.crew_member_id);
                  const cost = crew ? crew.hourly_rate * assignment.hours_assigned : 0;

                  return (
                    <tr key={assignment.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 500 }}>
                        {assignment.task_name}
                      </td>
                      <td style={{ padding: '12px 8px' }}>{crew?.name || 'N/A'}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        {assignment.hours_assigned}h
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600 }}>
                        ${cost.toLocaleString('en-US', {
                          minimumFractionDigits: 0,
                        })}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleUnassignTask(assignment.id)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: BRAND_COLORS.red,
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                          }}
                          onMouseOver={(e) =>
                            ((e.target as HTMLElement).style.backgroundColor =
                              '#c72825')
                          }
                          onMouseOut={(e) =>
                            ((e.target as HTMLElement).style.backgroundColor =
                              BRAND_COLORS.red)
                          }
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {assignments.filter((a) => a.week_starting === selectedWeek).length === 0 && (
          <p style={{ textAlign: 'center', color: '#999', fontSize: '13px', marginTop: '16px' }}>
            No assignments for this week
          </p>
        )}
      </motion.div>
    </div>
  );
}

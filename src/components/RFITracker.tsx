'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface RFI {
  id: string;
  rfi_number: string;
  subject: string;
  question: string;
  answer?: string;
  status: 'open' | 'answered' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  submitted_by: string;
  assigned_to?: string;
  project_id: string;
  created_at: string;
  due_date: string;
  responded_at?: string;
  cost_impact?: number;
  schedule_impact?: number;
  category?: 'structural' | 'MEP' | 'finish' | 'other';
}

interface FilterState {
  status: string[];
  priority: string[];
  assignedTo: string[];
  dateRange: [string, string];
  searchTerm: string;
}

const RFITracker: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [rfis, setRfis] = useState<RFI[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRfi, setSelectedRfi] = useState<RFI | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [sortBy, setSortBy] = useState<keyof RFI>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: [],
    priority: [],
    assignedTo: [],
    dateRange: ['', ''],
    searchTerm: '',
  });
  const [selectedRfis, setSelectedRfis] = useState<Set<string>>(new Set());
  const [bulkAssignTo, setBulkAssignTo] = useState('');

  useEffect(() => {
    fetchRfis();
  }, [projectId]);

  const fetchRfis = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rfis')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRfis(data || []);
    } catch (err) {
      console.error('Error fetching RFIs:', err);
    } finally {
      setLoading(false);
    }
  };

  const categoryAssignment: Record<string, string> = {
    structural: 'engineer',
    MEP: 'mechanical',
    finish: 'architect',
    other: 'project_manager',
  };

  const handleCreateRfi = async (formData: Partial<RFI>) => {
    try {
      const category = formData.category || 'other';
      const newRfi: Partial<RFI> = {
        ...formData,
        project_id: projectId,
        assigned_to: categoryAssignment[category] || 'project_manager',
        status: 'open',
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('rfis')
        .insert([newRfi])
        .select()
        .single();

      if (error) throw error;
      setRfis([data, ...rfis]);
      setShowNewForm(false);
    } catch (err) {
      console.error('Error creating RFI:', err);
    }
  };

  const handleUpdateRfi = async (rfiId: string, updates: Partial<RFI>) => {
    try {
      const { data, error } = await supabase
        .from('rfis')
        .update(updates)
        .eq('id', rfiId)
        .select()
        .single();

      if (error) throw error;
      setRfis(rfis.map((r) => (r.id === rfiId ? data : r)));
      if (selectedRfi?.id === rfiId) setSelectedRfi(data);
    } catch (err) {
      console.error('Error updating RFI:', err);
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignTo || selectedRfis.size === 0) return;
    try {
      const updates = Array.from(selectedRfis).map((rfiId) =>
        supabase
          .from('rfis')
          .update({ assigned_to: bulkAssignTo })
          .eq('id', rfiId)
      );

      await Promise.all(updates);
      fetchRfis();
      setSelectedRfis(new Set());
      setBulkAssignTo('');
    } catch (err) {
      console.error('Error bulk assigning:', err);
    }
  };

  const filteredAndSortedRfis = useMemo(() => {
    let result = [...rfis];

    if (filters.status.length > 0) {
      result = result.filter((r) => filters.status.includes(r.status));
    }
    if (filters.priority.length > 0) {
      result = result.filter((r) => filters.priority.includes(r.priority));
    }
    if (filters.assignedTo.length > 0) {
      result = result.filter((r) =>
        filters.assignedTo.includes(r.assigned_to || 'unassigned')
      );
    }
    if (filters.dateRange[0] && filters.dateRange[1]) {
      result = result.filter((r) => {
        const createdDate = new Date(r.created_at);
        return (
          createdDate >= new Date(filters.dateRange[0]) &&
          createdDate <= new Date(filters.dateRange[1])
        );
      });
    }
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          r.subject.toLowerCase().includes(term) ||
          r.question.toLowerCase().includes(term) ||
          r.rfi_number.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      const aVal = a[sortBy] ?? '';
      const bVal = b[sortBy] ?? '';
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortAsc ? comparison : -comparison;
    });

    return result;
  }, [rfis, filters, sortBy, sortAsc]);

  const metrics = useMemo(() => {
    const now = new Date();
    const open = rfis.filter((r) => r.status === 'open');
    const overdue = open.filter((r) => new Date(r.due_date) < now);
    const responseTimes = rfis
      .filter((r) => r.responded_at && r.created_at)
      .map(
        (r) =>
          (new Date(r.responded_at!).getTime() -
            new Date(r.created_at).getTime()) /
          (1000 * 60 * 60 * 24)
      );

    return {
      totalOpen: open.length,
      overdueCount: overdue.length,
      avgResponseTime:
        responseTimes.length > 0
          ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1)
          : 'N/A',
      responseRate: rfis.length > 0
        ? ((rfis.filter((r) => r.responded_at).length / rfis.length) * 100).toFixed(0)
        : '0',
    };
  }, [rfis]);

  const isOverdue = (rfi: RFI) => {
    return rfi.status === 'open' && new Date(rfi.due_date) < new Date();
  };

  const statusColors: Record<string, string> = {
    open: '#E8443A',
    answered: '#D85A30',
    closed: '#1D9E75',
  };

  const priorityColors: Record<string, string> = {
    low: '#94a3b8',
    medium: '#3b82f6',
    high: '#D85A30',
    critical: '#E8443A',
  };

  const priorityLevels = { low: 1, medium: 2, high: 3, critical: 4 };

  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: '#ffffff',
        minHeight: '100vh',
        fontFamily: 'Archivo, sans-serif',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#1D9E75',
              margin: 0,
            }}
          >
            RFI Tracker
          </h1>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#1D9E75',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            {showNewForm ? 'Cancel' : '+ New RFI'}
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              padding: '16px',
              backgroundColor: '#f0fdf4',
              borderRadius: '8px',
              borderLeft: `4px solid #1D9E75`,
            }}
          >
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Open RFIs</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1D9E75' }}>
              {metrics.totalOpen}
            </div>
          </div>
          <div
            style={{
              padding: '16px',
              backgroundColor: '#fef2f2',
              borderRadius: '8px',
              borderLeft: `4px solid #E8443A`,
            }}
          >
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Overdue</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#E8443A' }}>
              {metrics.overdueCount}
            </div>
          </div>
          <div
            style={{
              padding: '16px',
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              borderLeft: `4px solid #378ADD`,
            }}
          >
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Avg Response (days)</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#378ADD' }}>
              {metrics.avgResponseTime}
            </div>
          </div>
          <div
            style={{
              padding: '16px',
              backgroundColor: '#f5f3ff',
              borderRadius: '8px',
              borderLeft: `4px solid #7F77DD`,
            }}
          >
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Response Rate</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#7F77DD' }}>
              {metrics.responseRate}%
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showNewForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              backgroundColor: '#f9fafb',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '24px',
              border: '1px solid #e5e7eb',
            }}
          >
            <NewRfiForm
              onSubmit={(data) => {
                handleCreateRfi(data);
              }}
              onCancel={() => setShowNewForm(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ marginBottom: '24px' }}>
        <FilterPanel
          filters={filters}
          onFilterChange={setFilters}
          onSortChange={(field) => {
            if (sortBy === field) {
              setSortAsc(!sortAsc);
            } else {
              setSortBy(field as keyof RFI);
              setSortAsc(true);
            }
          }}
          currentSort={{ field: sortBy, ascending: sortAsc }}
        />
      </div>

      {selectedRfis.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '16px',
            backgroundColor: '#fef3c7',
            borderRadius: '8px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: '600' }}>
            {selectedRfis.size} RFI(s) selected
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              value={bulkAssignTo}
              onChange={(e) => setBulkAssignTo(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
              }}
            >
              <option value="">Assign to...</option>
              <option value="engineer">Engineer</option>
              <option value="mechanical">Mechanical</option>
              <option value="architect">Architect</option>
              <option value="project_manager">Project Manager</option>
            </select>
            <button
              onClick={handleBulkAssign}
              style={{
                padding: '6px 12px',
                backgroundColor: '#1D9E75',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              Assign
            </button>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #1D9E75',
              borderRadius: '50%',
              margin: '0 auto',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      ) : filteredAndSortedRfis.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            color: '#6b7280',
          }}
        >
          No RFIs found
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            display: 'grid',
            gap: '12px',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          }}
        >
          {filteredAndSortedRfis.map((rfi) => (
            <motion.div
              key={rfi.id}
              whileHover={{ y: -2 }}
              onClick={() => {
                setSelectedRfi(rfi);
                setShowDetailPanel(true);
              }}
              style={{
                padding: '16px',
                backgroundColor: '#ffffff',
                border: isOverdue(rfi) ? '2px solid #E8443A' : '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              <input
                type="checkbox"
                checked={selectedRfis.has(rfi.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  const newSelected = new Set(selectedRfis);
                  if (e.target.checked) {
                    newSelected.add(rfi.id);
                  } else {
                    newSelected.delete(rfi.id);
                  }
                  setSelectedRfis(newSelected);
                }}
                style={{ marginRight: '8px', cursor: 'pointer' }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: '#1D9E75',
                  }}
                >
                  {rfi.rfi_number}
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: statusColors[rfi.status],
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: '600',
                    }}
                  >
                    {rfi.status}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: priorityColors[rfi.priority],
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: '600',
                    }}
                  >
                    {rfi.priority}
                  </span>
                </div>
              </div>
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#111827',
                  margin: '0 0 8px 0',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {rfi.subject}
              </h3>
              <p
                style={{
                  fontSize: '13px',
                  color: '#6b7280',
                  margin: '0 0 8px 0',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {rfi.question}
              </p>
              <div
                style={{
                  fontSize: '12px',
                  color: '#9ca3af',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>Due: {new Date(rfi.due_date).toLocaleDateString()}</span>
                {rfi.assigned_to && (
                  <span style={{ color: '#1D9E75' }}>→ {rfi.assigned_to}</span>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {showDetailPanel && selectedRfi && (
          <RfiDetailPanel
            rfi={selectedRfi}
            onUpdate={handleUpdateRfi}
            onClose={() => setShowDetailPanel(false)}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

interface NewRfiFormProps {
  onSubmit: (data: Partial<RFI>) => void;
  onCancel: () => void;
}

const NewRfiForm: React.FC<NewRfiFormProps> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    rfi_number: `RFI-${Date.now().toString().slice(-6)}`,
    subject: '',
    question: '',
    priority: 'medium' as const,
    category: 'other' as const,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    submitted_by: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required';
    if (!formData.question.trim()) newErrors.question = 'Question is required';
    if (!formData.submitted_by.trim()) newErrors.submitted_by = 'Submitted by is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
            Subject
          </label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: errors.subject ? '2px solid #E8443A' : '1px solid #d1d5db',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
            placeholder="RFI subject"
          />
          {errors.subject && <span style={{ fontSize: '12px', color: '#E8443A' }}>{errors.subject}</span>}
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
            Submitted By
          </label>
          <input
            type="text"
            value={formData.submitted_by}
            onChange={(e) => setFormData({ ...formData, submitted_by: e.target.value })}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: errors.submitted_by ? '2px solid #E8443A' : '1px solid #d1d5db',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
            placeholder="Your name"
          />
          {errors.submitted_by && (
            <span style={{ fontSize: '12px', color: '#E8443A' }}>{errors.submitted_by}</span>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
          Question
        </label>
        <textarea
          value={formData.question}
          onChange={(e) => setFormData({ ...formData, question: e.target.value })}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: errors.question ? '2px solid #E8443A' : '1px solid #d1d5db',
            fontSize: '14px',
            minHeight: '100px',
            fontFamily: 'Archivo, sans-serif',
            boxSizing: 'border-box',
          }}
          placeholder="Describe your question or request"
        />
        {errors.question && <span style={{ fontSize: '12px', color: '#E8443A' }}>{errors.question}</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
            Category
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
            }}
          >
            <option value="structural">Structural</option>
            <option value="MEP">MEP</option>
            <option value="finish">Finish</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
            Priority
          </label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
            }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
            Due Date
          </label>
          <input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            backgroundColor: '#e5e7eb',
            color: '#111827',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          style={{
            padding: '8px 16px',
            backgroundColor: '#1D9E75',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          Create RFI
        </button>
      </div>
    </form>
  );
};

interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onSortChange: (field: string) => void;
  currentSort: { field: keyof RFI; ascending: boolean };
}

const FilterPanel: React.FC<FilterPanelProps> = ({ filters, onFilterChange, onSortChange, currentSort }) => {
  const toggleFilter = (key: keyof FilterState, value: string) => {
    const current = filters[key];
    if (Array.isArray(current)) {
      const newArray = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      onFilterChange({ ...filters, [key]: newArray });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      style={{
        backgroundColor: '#f9fafb',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
      }}
    >
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
          Search
        </label>
        <input
          type="text"
          value={filters.searchTerm}
          onChange={(e) => onFilterChange({ ...filters, searchTerm: e.target.value })}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #d1d5db',
            fontSize: '14px',
            boxSizing: 'border-box',
          }}
          placeholder="Search by RFI number, subject, or question..."
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            Status
          </label>
          {['open', 'answered', 'closed'].map((status) => (
            <label
              key={status}
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: '13px',
                marginBottom: '4px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={filters.status.includes(status)}
                onChange={() => toggleFilter('status', status)}
                style={{ marginRight: '6px', cursor: 'pointer' }}
              />
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </label>
          ))}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            Priority
          </label>
          {['low', 'medium', 'high', 'critical'].map((priority) => (
            <label
              key={priority}
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: '13px',
                marginBottom: '4px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={filters.priority.includes(priority)}
                onChange={() => toggleFilter('priority', priority)}
                style={{ marginRight: '6px', cursor: 'pointer' }}
              />
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </label>
          ))}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            Assigned To
          </label>
          {['engineer', 'mechanical', 'architect', 'project_manager'].map((person) => (
            <label
              key={person}
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: '13px',
                marginBottom: '4px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={filters.assignedTo.includes(person)}
                onChange={() => toggleFilter('assignedTo', person)}
                style={{ marginRight: '6px', cursor: 'pointer' }}
              />
              {person.replace('_', ' ')}
            </label>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

interface RfiDetailPanelProps {
  rfi: RFI;
  onUpdate: (rfiId: string, updates: Partial<RFI>) => void;
  onClose: () => void;
}

const RfiDetailPanel: React.FC<RfiDetailPanelProps> = ({ rfi, onUpdate, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [answer, setAnswer] = useState(rfi.answer || '');
  const [status, setStatus] = useState(rfi.status);

  const handleSaveAnswer = () => {
    onUpdate(rfi.id, {
      answer,
      status: status === 'answered' ? 'answered' : status,
      responded_at: status === 'answered' ? new Date().toISOString() : undefined,
    });
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 400 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 400 }}
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        width: '100%',
        maxWidth: '500px',
        height: '100vh',
        backgroundColor: '#ffffff',
        boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
        overflow: 'auto',
      }}
    >
      <div style={{ padding: '20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#111827' }}>
            {rfi.rfi_number}
          </h2>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 8px 0', color: '#111827' }}>
            {rfi.subject}
          </h3>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            {rfi.question}
          </p>
        </div>

        <div
          style={{
            padding: '12px',
            backgroundColor: '#f9fafb',
            borderRadius: '6px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Status</span>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1D9E75' }}>
                {rfi.status}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Priority</span>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#D85A30' }}>
                {rfi.priority}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Assigned To</span>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#378ADD' }}>
                {rfi.assigned_to || 'Unassigned'}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Due Date</span>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                {new Date(rfi.due_date).toLocaleDateString()}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {rfi.cost_impact !== undefined && (
              <div>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>Cost Impact</span>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                  ${rfi.cost_impact.toLocaleString()}
                </div>
              </div>
            )}
            {rfi.schedule_impact !== undefined && (
              <div>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>Schedule Impact</span>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                  {rfi.schedule_impact} days
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
              Response
            </label>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#1D9E75',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                {rfi.answer ? 'Edit' : 'Add'}
              </button>
            )}
          </div>
          {isEditing ? (
            <div>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  minHeight: '120px',
                  marginBottom: '8px',
                  fontFamily: 'Archivo, sans-serif',
                  boxSizing: 'border-box',
                }}
                placeholder="Write your response..."
              />
              <div style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', color: '#6b7280' }}>
                  Update Status:
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    marginTop: '4px',
                  }}
                >
                  <option value="open">Open</option>
                  <option value="answered">Answered</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSaveAnswer}
                  style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: '#1D9E75',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setAnswer(rfi.answer || '');
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: '#e5e7eb',
                    color: '#111827',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '12px',
                backgroundColor: rfi.answer ? '#f0fdf4' : '#f9fafb',
                borderRadius: '4px',
                minHeight: '60px',
                color: rfi.answer ? '#111827' : '#9ca3af',
                fontSize: '13px',
                lineHeight: '1.5',
              }}
            >
              {rfi.answer || 'No response yet'}
            </div>
          )}
        </div>

        <div
          style={{
            paddingTop: '20px',
            borderTop: '1px solid #e5e7eb',
            fontSize: '12px',
            color: '#9ca3af',
          }}
        >
          <div style={{ marginBottom: '6px' }}>
            Created: {new Date(rfi.created_at).toLocaleString()}
          </div>
          {rfi.responded_at && (
            <div>Responded: {new Date(rfi.responded_at).toLocaleString()}</div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default RFITracker;

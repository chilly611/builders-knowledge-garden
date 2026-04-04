'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Filter,
  SortAsc,
  Trash2,
  Download,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  Loader2,
  Check,
  X,
  Edit3,
} from 'lucide-react';

// Type definitions
interface ChangeOrder {
  id: string;
  project_id: string;
  number: number;
  description: string;
  reason?: string;
  cost_impact: number;
  schedule_impact_days: number;
  status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'void';
  created_at: string;
  updated_at?: string;
}

interface CreateChangeOrderPayload {
  projectId: string;
  description: string;
  reason: string;
  cost_impact: number;
  schedule_impact_days: number;
}

interface UpdateChangeOrderPayload {
  id: string;
  status?: 'pending' | 'submitted' | 'approved' | 'rejected' | 'void';
  cost_impact?: number;
  schedule_impact_days?: number;
  description?: string;
}

type FilterStatus = 'all' | 'pending' | 'submitted' | 'approved' | 'rejected' | 'void';
type SortField = 'date' | 'number' | 'cost';

// Status styling
const statusColors: Record<ChangeOrder['status'], string> = {
  pending: '#e9ecef',
  submitted: '#cfe2ff',
  approved: '#d1e7dd',
  rejected: '#f8d7da',
  void: '#ccc',
};

const statusTextColors: Record<ChangeOrder['status'], string> = {
  pending: '#495057',
  submitted: '#004085',
  approved: '#155724',
  rejected: '#721c24',
  void: '#666',
};

// Component Props
interface ChangeOrderModuleProps {
  projectId: string;
}

export default function ChangeOrderModule({ projectId }: ChangeOrderModuleProps) {
  // State management
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'cost_impact' | 'schedule_impact_days' } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Form state for create modal
  const [formData, setFormData] = useState({
    description: '',
    reason: '',
    cost_impact: '',
    schedule_impact_days: '',
  });

  // Fetch change orders
  const fetchChangeOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/projects/change-orders?projectId=${projectId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch change orders: ${response.statusText}`);
      }
      const data = await response.json();
      setChangeOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Initial fetch
  useEffect(() => {
    fetchChangeOrders();
  }, [fetchChangeOrders]);

  // Create change order
  const handleCreateChangeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }
    if (formData.cost_impact === '' || formData.schedule_impact_days === '') {
      setError('Cost impact and schedule impact are required');
      return;
    }

    setIsSaving(true);
    try {
      const payload: CreateChangeOrderPayload = {
        projectId,
        description: formData.description,
        reason: formData.reason,
        cost_impact: parseFloat(formData.cost_impact),
        schedule_impact_days: parseInt(formData.schedule_impact_days, 10),
      };

      const response = await fetch('/api/v1/projects/change-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to create change order: ${response.statusText}`);
      }

      const newChangeOrder = await response.json();
      setChangeOrders([newChangeOrder, ...changeOrders]);
      setShowCreateModal(false);
      setFormData({ description: '', reason: '', cost_impact: '', schedule_impact_days: '' });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create change order');
    } finally {
      setIsSaving(false);
    }
  };

  // Update change order status
  const handleStatusChange = async (id: string, newStatus: ChangeOrder['status']) => {
    setIsSaving(true);
    try {
      const payload: UpdateChangeOrderPayload = { id, status: newStatus };
      const response = await fetch('/api/v1/projects/change-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to update change order: ${response.statusText}`);
      }

      const updated = await response.json();
      setChangeOrders(changeOrders.map((co) => (co.id === id ? updated : co)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setIsSaving(false);
    }
  };

  // Start inline edit
  const startEdit = (id: string, field: 'cost_impact' | 'schedule_impact_days') => {
    const co = changeOrders.find((c) => c.id === id);
    if (co) {
      setEditingCell({ id, field });
      setEditValue(String(co[field]));
    }
  };

  // Save inline edit
  const saveEdit = async (id: string) => {
    if (!editingCell) return;

    const value = editingCell.field === 'cost_impact' ? parseFloat(editValue) : parseInt(editValue, 10);
    if (isNaN(value)) {
      setError('Invalid input');
      return;
    }

    setIsSaving(true);
    try {
      const payload: UpdateChangeOrderPayload = { id, [editingCell.field]: value };
      const response = await fetch('/api/v1/projects/change-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to update change order: ${response.statusText}`);
      }

      const updated = await response.json();
      setChangeOrders(changeOrders.map((co) => (co.id === id ? updated : co)));
      setEditingCell(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete change order
  const handleDelete = async (id: string) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/v1/projects/change-orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete change order: ${response.statusText}`);
      }

      setChangeOrders(changeOrders.filter((co) => co.id !== id));
      setShowDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setIsSaving(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Number', 'Description', 'Reason', 'Cost Impact', 'Schedule Impact (days)', 'Status', 'Created'];
    const rows = filteredAndSortedOrders.map((co) => [
      co.number,
      co.description,
      co.reason || '',
      `$${co.cost_impact}`,
      co.schedule_impact_days,
      co.status,
      new Date(co.created_at).toLocaleDateString(),
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `change-orders-${projectId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter and sort
  const filteredOrders = changeOrders.filter((co) => filterStatus === 'all' || co.status === filterStatus);
  const filteredAndSortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortField === 'date') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortField === 'number') return b.number - a.number;
    if (sortField === 'cost') return b.cost_impact - a.cost_impact;
    return 0;
  });

  // Calculate summary
  const summary = {
    totalCount: changeOrders.length,
    approvedCostImpact: changeOrders
      .filter((co) => co.status === 'approved')
      .reduce((sum, co) => sum + co.cost_impact, 0),
    pendingCostImpact: changeOrders
      .filter((co) => co.status === 'pending' || co.status === 'submitted')
      .reduce((sum, co) => sum + co.cost_impact, 0),
    totalScheduleImpact: changeOrders.reduce((sum, co) => sum + co.schedule_impact_days, 0),
  };

  // Styles
  const styles = {
    container: {
      padding: '24px',
      backgroundColor: '#FFFFFF',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    header: {
      display: 'flex' as const,
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      borderBottom: '1px solid #E5E5E0',
      paddingBottom: '16px',
    },
    title: {
      fontSize: '24px',
      fontWeight: 600,
      color: '#000',
      margin: 0,
    },
    headerActions: {
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
    },
    button: (variant: 'primary' | 'secondary' = 'secondary') => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      backgroundColor: variant === 'primary' ? '#1D9E75' : '#FAFAF8',
      color: variant === 'primary' ? '#FFFFFF' : '#000',
      border: variant === 'primary' ? 'none' : '1px solid #E5E5E0',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 500,
      transition: 'all 0.2s',
    }),
    summaryGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px',
    },
    summaryCard: {
      padding: '16px',
      backgroundColor: '#FAFAF8',
      borderRadius: '8px',
      border: '1px solid #E5E5E0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    },
    summaryLabel: {
      fontSize: '12px',
      color: '#666',
      fontWeight: 500,
      marginBottom: '8px',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },
    summaryValue: {
      fontSize: '28px',
      fontWeight: 700,
      color: '#000',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    filterBar: {
      display: 'flex',
      gap: '16px',
      alignItems: 'center',
      marginBottom: '20px',
      flexWrap: 'wrap' as const,
    },
    select: {
      padding: '8px 12px',
      backgroundColor: '#FAFAF8',
      border: '1px solid #E5E5E0',
      borderRadius: '6px',
      fontSize: '14px',
      cursor: 'pointer',
      fontFamily: 'system-ui',
    },
    tableWrapper: {
      overflowX: 'auto' as const,
      marginBottom: '24px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      fontSize: '14px',
    },
    th: {
      textAlign: 'left' as const,
      padding: '12px',
      backgroundColor: '#FAFAF8',
      borderBottom: '1px solid #E5E5E0',
      fontWeight: 600,
      color: '#000',
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid #E5E5E0',
      color: '#333',
    },
    statusBadge: (status: ChangeOrder['status']) => ({
      padding: '4px 8px',
      backgroundColor: statusColors[status],
      color: statusTextColors[status],
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: 500,
      display: 'inline-block",
    }),
    editableCell: {
      cursor: 'pointer',
      padding: '4px 8px',
      borderRadius: '4px',
      transition: 'background-color 0.2s',
      '&:hover': { backgroundColor: '#f0f0f0' },
    },
    editInput: {
      padding: '6px 8px',
      border: '1px solid #1D9E75',
      borderRadius: '4px',
      fontSize: '14px',
      fontFamily: 'system-ui',
    },
    modal: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modalContent: {
      backgroundColor: '#FFFFFF',
      borderRadius: '8px',
      padding: '32px',
      maxWidth: '500px',
      width: '90%',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: 600,
      marginBottom: '20px',
      color: '#000',
    },
    formGroup: {
      marginBottom: '16px',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: 500,
      marginBottom: '6px',
      color: '#000',
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #E5E5E0',
      borderRadius: '6px',
      fontSize: '14px',
      fontFamily: 'system-ui',
      boxSizing: 'border-box' as const,
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #E5E5E0',
      borderRadius: '6px',
      fontSize: '14px',
      fontFamily: 'system-ui',
      boxSizing: 'border-box' as const,
      minHeight: '80px',
      resize: 'vertical' as const,
    },
    formActions: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: '24px',
    },
    errorMessage: {
      padding: '12px',
      backgroundColor: '#f8d7da',
      color: '#721c24',
      borderRadius: '6px',
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      marginBottom: '16px',
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: '48px 24px',
      color: '#666',
    },
    emptyIcon: {
      fontSize: '48px',
      marginBottom: '16px',
    },
  };

  if (loading) {
    return (
      <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#1D9E75' }} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Change Orders</h1>
        <div style={styles.headerActions}>
          <button
            style={{ ...styles.button('secondary'), cursor: 'pointer' }}
            onClick={handleExportCSV}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FAFAF8')}
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            style={{ ...styles.button('primary'), cursor: 'pointer' }}
            onClick={() => setShowCreateModal(true)}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#168668')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1D9E75')}
          >
            <Plus size={16} />
            New Change Order
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={styles.errorMessage}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Summary cards */}
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Total Change Orders</div>
          <div style={styles.summaryValue}>{summary.totalCount}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Approved Cost Impact</div>
          <div style={{ ...styles.summaryValue, color: summary.approvedCostImpact < 0 ? '#28a745' : '#dc3545' }}>
            {summary.approvedCostImpact < 0 ? <TrendingDown size={24} /> : <TrendingUp size={24} />}
            ${Math.abs(summary.approvedCostImpact).toLocaleString()}
          </div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Pending Cost Impact</div>
          <div style={{ ...styles.summaryValue, color: summary.pendingCostImpact < 0 ? '#28a745' : '#dc3545' }}>
            {summary.pendingCostImpact < 0 ? <TrendingDown size={24} /> : <TrendingUp size={24} />}
            ${Math.abs(summary.pendingCostImpact).toLocaleString()}
          </div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Total Schedule Impact</div>
          <div style={{ ...styles.summaryValue, gap: '4px' }}>
            <Clock size={24} />
            {summary.totalScheduleImpact} days
          </div>
        </div>
      </div>

      {/* Filter and sort */}
      <div style={styles.filterBar}>
        <Filter size={16} style={{ color: '#666' }} />
        <select
          style={styles.select}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="void">Void</option>
        </select>

        <SortAsc size={16} style={{ color: '#666', marginLeft: '12px' }} />
        <select
          style={styles.select}
          value={sortField}
          onChange={(e) => setSortField(e.target.value as SortField)}
        >
          <option value="date">Sort by Date (Newest)</option>
          <option value="number">Sort by Number</option>
          <option value="cost">Sort by Cost Impact</option>
        </select>
      </div>

      {/* Table */}
      {filteredAndSortedOrders.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📋</div>
          <p>No change orders found</p>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Number</th>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>Reason</th>
                <th style={styles.th}>Cost Impact</th>
                <th style={styles.th}>Schedule Impact</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedOrders.map((co) => (
                <tr key={co.id}>
                  <td style={styles.td}>
                    <strong>CO-{String(co.number).padStart(4, '0')}</strong>
                  </td>
                  <td style={styles.td}>{co.description}</td>
                  <td style={styles.td}>{co.reason || '—'}</td>
                  <td
                    style={{
                      ...styles.td,
                      cursor: editingCell?.id === co.id && editingCell?.field === 'cost_impact' ? 'default' : 'pointer',
                      color: co.cost_impact < 0 ? '#28a745' : co.cost_impact > 0 ? '#dc3545' : '#666',
                      fontWeight: 500,
                    }}
                  >
                    {editingCell?.id === co.id && editingCell?.field === 'cost_impact' ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveEdit(co.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(co.id);
                          if (e.key === 'Escape') setEditingCell(null);
                        }}
                        style={{ ...styles.editInput, width: '100px' }}
                        autoFocus
                      />
                    ) : (
                      <span
                        style={{
                          ...styles.editableCell,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                        onClick={() => startEdit(co.id, 'cost_impact')}
                      >
                        {co.cost_impact < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                        ${co.cost_impact}
                        <Edit3 size={12} style={{ opacity: 0.5 }} />
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      ...styles.td,
                      cursor: editingCell?.id === co.id && editingCell?.field === 'schedule_impact_days' ? 'default' : 'pointer',
                    }}
                  >
                    {editingCell?.id === co.id && editingCell?.field === 'schedule_impact_days' ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveEdit(co.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(co.id);
                          if (e.key === 'Escape') setEditingCell(null);
                        }}
                        style={{ ...styles.editInput, width: '80px' }}
                        autoFocus
                      />
                    ) : (
                      <span
                        style={{
                          ...styles.editableCell,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                        onClick={() => startEdit(co.id, 'schedule_impact_days')}
                      >
                        <Clock size={14} />
                        {co.schedule_impact_days} days
                        <Edit3 size={12} style={{ opacity: 0.5 }} />
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <select
                      style={{
                        ...styles.statusBadge(co.status),
                        border: `1px solid ${statusTextColors[co.status]}`,
                        cursor: 'pointer',
                        padding: '6px',
                      }}
                      value={co.status}
                      onChange={(e) => handleStatusChange(co.id, e.target.value as ChangeOrder['status'])}
                      disabled={isSaving}
                    >
                      <option value="pending">Pending</option>
                      <option value="submitted">Submitted</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="void">Void</option>
                    </select>
                  </td>
                  <td style={styles.td}>
                    <button
                      style={{
                        ...styles.button('secondary'),
                        padding: '6px 8px',
                        color: '#dc3545',
                        cursor: 'pointer',
                        border: '1px solid #f8d7da',
                      }}
                      onClick={() => setShowDeleteConfirm(co.id)}
                      disabled={isSaving}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8d7da')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FAFAF8')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div style={styles.modal} onClick={() => setShowCreateModal(false)}>
          <div
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={styles.modalTitle}>Create Change Order</h2>

            <form onSubmit={handleCreateChangeOrder}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Description *</label>
                <textarea
                  style={styles.textarea}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter change order description"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Reason</label>
                <textarea
                  style={styles.textarea}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Enter reason for change (optional)"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Cost Impact $ *</label>
                  <input
                    type="number"
                    step="0.01"
                    style={styles.input}
                    value={formData.cost_impact}
                    onChange={(e) => setFormData({ ...formData, cost_impact: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Schedule Impact (days) *</label>
                  <input
                    type="number"
                    style={styles.input}
                    value={formData.schedule_impact_days}
                    onChange={(e) => setFormData({ ...formData, schedule_impact_days: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div style={styles.formActions}>
                <button
                  type="button"
                  style={{ ...styles.button('secondary'), cursor: 'pointer' }}
                  onClick={() => setShowCreateModal(false)}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FAFAF8')}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ ...styles.button('primary'), cursor: 'pointer' }}
                  disabled={isSaving}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#168668')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1D9E75')}
                >
                  {isSaving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={styles.modal} onClick={() => setShowDeleteConfirm(null)}>
          <div
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={styles.modalTitle}>Delete Change Order?</h2>
            <p style={{ color: '#666', marginBottom: '24px' }}>
              This action cannot be undone. The change order will be permanently deleted.
            </p>

            <div style={styles.formActions}>
              <button
                style={{ ...styles.button('secondary'), cursor: 'pointer' }}
                onClick={() => setShowDeleteConfirm(null)}
                disabled={isSaving}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FAFAF8')}
              >
                <X size={16} />
                Cancel
              </button>
              <button
                style={{
                  ...styles.button('primary'),
                  backgroundColor: '#dc3545',
                  cursor: 'pointer',
                }}
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={isSaving}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#c82333')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#dc3545')}
              >
                {isSaving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={16} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

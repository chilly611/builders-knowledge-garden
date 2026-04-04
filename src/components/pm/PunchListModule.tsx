'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Filter,
  SortAsc,
  Trash2,
  Download,
  MapPin,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Check,
  X,
  Edit3,
  Camera,
  List,
  LayoutGrid,
} from 'lucide-react';

interface PunchItem {
  id: string;
  project_id: string;
  description: string;
  location?: string;
  assigned_trade?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'ready_for_inspection' | 'closed' | 'deferred';
  photo_url?: string;
  created_at: string;
  updated_at?: string;
}

interface PunchListModuleProps {
  projectId: string;
}

const priorityColors: Record<string, { bg: string; text: string }> = {
  low: { bg: '#e9ecef', text: '#495057' },
  medium: { bg: '#fff3cd', text: '#856404' },
  high: { bg: '#f8d7da', text: '#721c24' },
  critical: { bg: '#dc3545', text: '#ffffff' },
};

const statusColors: Record<string, string> = {
  open: '#cfe2ff',
  in_progress: '#fff3cd',
  ready_for_inspection: '#ffeeba',
  closed: '#d1e7dd',
  deferred: '#e9ecef',
};

const statusLabels: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  ready_for_inspection: 'Ready for Inspection',
  closed: 'Closed',
  deferred: 'Deferred',
};

const PunchListModule: React.FC<PunchListModuleProps> = ({ projectId }) => {
  const [items, setItems] = useState<PunchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<{
    itemId: string;
    field: 'assigned_trade' | 'location';
  } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'location'>('date');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [createForm, setCreateForm] = useState({
    description: '',
    location: '',
    assigned_trade: '',
    priority: 'medium' as const,
    photo_url: '',
  });
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/v1/projects/punch-items?projectId=${projectId}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch punch items: ${response.statusText}`);
      }
      const data = await response.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load punch items');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.description.trim()) {
      alert('Description is required');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/v1/projects/punch-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          ...createForm,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create punch item');
      }

      const newItem = await response.json();
      setItems((prev) => [newItem, ...prev]);
      setShowCreateModal(false);
      setCreateForm({
        description: '',
        location: '',
        assigned_trade: '',
        priority: 'medium',
        photo_url: '',
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create item');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (
    itemId: string,
    newStatus: PunchItem['status']
  ) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    try {
      const response = await fetch('/api/v1/projects/punch-items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: itemId,
          status: newStatus,
          assigned_trade: item.assigned_trade,
          priority: item.priority,
          photo_url: item.photo_url,
          location: item.location,
          description: item.description,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const updated = await response.json();
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? updated : i))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleInlineEdit = async (
    itemId: string,
    field: 'assigned_trade' | 'location',
    value: string
  ) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    try {
      const updatePayload: Record<string, any> = {
        id: itemId,
        status: item.status,
        priority: item.priority,
        photo_url: item.photo_url,
        description: item.description,
      };
      updatePayload[field] = value;

      const response = await fetch('/api/v1/projects/punch-items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        throw new Error('Failed to update item');
      }

      const updated = await response.json();
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? updated : i))
      );
      setEditingField(null);
      setEditValue('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const response = await fetch('/api/v1/projects/punch-items', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      setItems((prev) => prev.filter((i) => i.id !== itemId));
      setShowDeleteConfirm(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    itemId?: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For demo purposes, using data URL. In production, upload to cloud storage.
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (itemId) {
        // Update existing item
        const item = items.find((i) => i.id === itemId);
        if (item) {
          handleInlineEdit(itemId, 'location', item.location || '');
          // This would need to also update the photo_url
        }
      } else {
        // Update form
        setCreateForm((prev) => ({ ...prev, photo_url: dataUrl }));
      }
    };
    reader.readAsDataURL(file);
  };

  const exportToCSV = () => {
    const headers = [
      'ID',
      'Description',
      'Location',
      'Assigned Trade',
      'Priority',
      'Status',
      'Created',
    ];
    const rows = filteredItems.map((item) => [
      item.id,
      item.description,
      item.location || '',
      item.assigned_trade || '',
      item.priority,
      item.status,
      new Date(item.created_at).toLocaleDateString(),
    ]);

    const csv =
      [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `punch-list-${projectId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  let filteredItems = items.filter((item) => {
    if (filterStatus && item.status !== filterStatus) return false;
    if (filterPriority && item.priority !== filterPriority) return false;
    return true;
  });

  filteredItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'date') {
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    if (sortBy === 'priority') {
      const priorityOrder: Record<string, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
      };
      return (
        priorityOrder[a.priority] - priorityOrder[b.priority]
      );
    }
    if (sortBy === 'location') {
      return (a.location || '').localeCompare(b.location || '');
    }
    return 0;
  });

  const stats = {
    total: items.length,
    open: items.filter((i) => i.status === 'open').length,
    inProgress: items.filter((i) => i.status === 'in_progress').length,
    closed: items.filter((i) => i.status === 'closed').length,
  };

  const completionPercentage =
    stats.total > 0 ? Math.round((stats.closed / stats.total) * 100) : 0;

  const groupedByLocation = Array.from(
    filteredItems.reduce(
      (acc, item) => {
        const location = item.location || 'Unassigned';
        if (!acc.has(location)) {
          acc.set(location, []);
        }
        acc.get(location)!.push(item);
        return acc;
      },
      new Map<string, PunchItem[]>()
    )
  ).sort(([a], [b]) => a.localeCompare(b));

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '400px',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E5E5E0',
        }}
      >
        <Loader2 size={32} style={{ color: '#1D9E75', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '24px',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E5E5E0',
          textAlign: 'center',
        }}
      >
        <AlertTriangle size={32} style={{ color: '#dc3545', marginBottom: '12px' }} />
        <p style={{ color: '#495057', marginBottom: '16px' }}>{error}</p>
        <button
          onClick={() => fetchItems()}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1D9E75',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontFamily: 'system-ui',
            fontSize: '14px',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#FAFAF8', padding: '24px', borderRadius: '8px' }}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input, select, textarea {
          font-family: system-ui;
        }
        input::placeholder, textarea::placeholder {
          color: #999;
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <h1 style={{ fontSize: '28px', color: '#1a1a1a', margin: 0, fontWeight: '600' }}>
          Punch List
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '10px 16px',
            backgroundColor: '#1D9E75',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'system-ui',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          <Plus size={18} />
          New Item
        </button>
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            padding: '16px',
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E5E5E0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px' }}>
            Total Items
          </p>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#1D9E75' }}>
            {stats.total}
          </p>
        </div>

        <div
          style={{
            padding: '16px',
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E5E5E0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px' }}>
            Open
          </p>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#dc3545' }}>
            {stats.open}
          </p>
        </div>

        <div
          style={{
            padding: '16px',
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E5E5E0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px' }}>
            In Progress
          </p>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#ffc107' }}>
            {stats.inProgress}
          </p>
        </div>

        <div
          style={{
            padding: '16px',
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E5E5E0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px' }}>
            Closed
          </p>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#28a745' }}>
            {stats.closed}
          </p>
        </div>

        <div
          style={{
            padding: '16px',
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E5E5E0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: `conic-gradient(#28a745 ${completionPercentage * 3.6}deg, #E5E5E0 0deg)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: '700',
              color: '#1a1a1a',
            }}
          >
            {completionPercentage}%
          </div>
          <p style={{ margin: "8px 0 0 0", color: "#666", fontSize: "12px" }}>
            Completion
          </p>
        </div>
      </div>

      {/* Filters & Controls */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Filter size={18} style={{ color: '#666' }} />
          <select
            value={filterStatus || ''}
            onChange={(e) => setFilterStatus(e.target.value || null)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #E5E5E0',
              backgroundColor: '#FFFFFF',
              fontFamily: 'system-ui',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <option value="">All Statuses</option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={filterPriority || ''}
            onChange={(e) => setFilterPriority(e.target.value || null)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #E5E5E0',
              backgroundColor: '#FFFFFF',
              fontFamily: 'system-ui',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <SortAsc size={18} style={{ color: '#666' }} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'priority' | 'location')}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #E5E5E0',
              backgroundColor: '#FFFFFF',
              fontFamily: 'system-ui',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <option value="date">Date</option>
            <option value="priority">Priority</option>
            <option value="location">Location</option>
          </select>
        </div>

        <button
          onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #E5E5E0',
            backgroundColor: '#FFFFFF',
            fontFamily: 'system-ui',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          {viewMode === 'list' ? '📍 Location View' : '📋 List View'}
        </button>
      </div>

      {/* Items by Location */}
      {filteredItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#888' }}>
          <p style={{ margin: 0, fontSize: '14px' }}>No punch items found.</p>
        </div>
      ) : (
        <div>
          {groupedByLocation.map(([location, locationItems]) => (
            <div key={location}>
                <h3
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1a1a1a',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <MapPin size={16} style={{ color: '#1D9E75' }} />
                  {location}
                  <span
                    style={{
                      fontSize: '12px',
                      backgroundColor: '#f0f0f0',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      color: '#666',
                    }}
                  >
                    {locationItems.length}
                  </span>
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                  {locationItems.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '12px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '8px',
                        border: `2px solid ${statusColors[item.status]}`,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      }}
                    >
                      {item.photo_url && (
                        <div
                          style={{
                            width: '100%',
                            height: '120px',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            marginBottom: '8px',
                          }}
                        >
                          <img
                            src={item.photo_url}
                            alt={item.description}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      )}

                      <h4
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#1a1a1a',
                        }}
                      >
                        {item.description}
                      </h4>

                      {item.assigned_trade && (
                        <p
                          style={{
                            margin: '0 0 8px 0',
                            fontSize: '12px',
                            color: '#666',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Wrench size={14} />
                          {item.assigned_trade}
                        </p>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          gap: '6px',
                          marginBottom: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: priorityColors[item.priority].bg,
                            color: priorityColors[item.priority].text,
                            fontSize: '11px',
                            fontWeight: '600',
                            textTransform: 'capitalize',
                          }}
                        >
                          {item.priority}
                        </span>

                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: statusColors[item.status],
                            fontSize: '11px',
                            fontWeight: '600',
                          }}
                        >
                          {statusLabels[item.status]}
                        </span>
                      </div>

                      <button
                        onClick={() => setShowDeleteConfirm(item.id)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          border: '1px solid #E5E5E0',
                          backgroundColor: '#fff5f5',
                          cursor: 'pointer',
                          fontFamily: 'system-ui',
                          fontSize: '12px',
                          color: '#dc3545',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              padding: '24px',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            }}
          >
            <h2
              style={{
                margin: '0 0 16px 0',
                fontSize: '20px',
                fontWeight: '600',
                color: '#1a1a1a',
              }}
            >
              New Punch Item
            </h2>

            <form onSubmit={handleCreateItem}>
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '6px',
                    color: '#1a1a1a',
                  }}
                >
                  Description *
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E5E0',
                    fontFamily: 'system-ui',
                    fontSize: '14px',
                    minHeight: '80px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '6px',
                    color: '#1a1a1a',
                  }}
                >
                  Location
                </label>
                <input
                  type="text"
                  value={createForm.location}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, location: e.target.value }))
                  }
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E5E0',
                    fontFamily: 'system-ui',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '6px',
                    color: '#1a1a1a',
                  }}
                >
                  Assigned Trade
                </label>
                <input
                  type="text"
                  value={createForm.assigned_trade}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      assigned_trade: e.target.value,
                    }))
                  }
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E5E0',
                    fontFamily: 'system-ui',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                 />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '6px',
                    color: '#1a1a1a',
                  }}
                >
                  Priority
                </label>
                <select
                  value={createForm.priority}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      priority: e.target.value as 'low' | 'medium' | 'high' | 'critical',
                    }))
                  }
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E5E0',
                    fontFamily: 'system-ui',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '6px',
                    color: '#1a1a1a',
                  }}
                >
                  Photo
                </label>
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  {createForm.photo_url && (
                    <img
                      src={createForm.photo_url}
                      alt="Preview"
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '6px',
                        objectFit: 'cover',
                      }}
                    />
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e)}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #E5E5E0',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontFamily: 'system-ui',
                      fontSize: '14px',
                    }}
                  >
                    <Camera size={16} />
                    Upload
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '6px',
                    border: '1px solid #E5E5E0',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer',
                    fontFamily: 'system-ui',
                    fontSize: '14px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '6px',
                    backgroundColor: '#1D9E75',
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: creating ? 'not-allowed' : 'pointer',
                    fontFamily: 'system-ui',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: creating ? 0.6 : 1,
                  }}
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
          }}
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              padding: '24px',
              width: '90%',
              maxWidth: '400px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            }}
          >
            <h2
              style={{
                margin: '0 0 12px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: '#1a1a1a',
              }}
            >
              Delete Item?
            </h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              This action cannot be undone. Are you sure you want to delete this punch item?
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '6px',
                  border: '1px solid #E5E5E0',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  fontFamily: 'system-ui',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteItem(showDeleteConfirm)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '6px',
                  backgroundColor: '#dc3545',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'system-ui',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PunchListModule;

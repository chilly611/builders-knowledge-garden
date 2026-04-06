'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface Permit {
  id: string;
  type: 'building' | 'electrical' | 'plumbing' | 'mechanical' | 'grading' | 'demo';
  status: 'not_applied' | 'submitted' | 'under_review' | 'approved' | 'expired' | 'denied';
  jurisdiction: string;
  permit_number: string;
  submitted_date: string;
  approval_date?: string;
  expiry_date?: string;
  cost: number;
  notes: string;
  document_url?: string;
  renewal_date?: string;
}

interface ComplianceItem {
  id: string;
  jurisdiction: string;
  requirement: string;
  is_completed: boolean;
}

interface Notification {
  id: string;
  permit_id: string;
  message: string;
  date: string;
}

const JURISDICTIONS = [
  'New York, NY',
  'Los Angeles, CA',
  'Chicago, IL',
  'Houston, TX',
  'Phoenix, AZ',
  'Philadelphia, PA',
  'San Antonio, TX',
  'San Diego, CA',
  'Dallas, TX',
  'San Jose, CA',
];

const COMPLIANCE_REQUIREMENTS: Record<string, string[]> = {
  'New York, NY': [
    'Building permit approved',
    'Electrical inspection complete',
    'Plumbing inspection complete',
    'Mechanical inspection complete',
    'Final Certificate of Occupancy',
  ],
  'Los Angeles, CA': [
    'Building permit issued',
    'Electrical permit issued',
    'Plumbing permit issued',
    'HVAC permit issued',
    'Department of Building and Safety approval',
  ],
  'Chicago, IL': [
    'Building permit obtained',
    'Electrical inspection passed',
    'Plumbing inspection passed',
    'Mechanical inspection passed',
    'Department of Buildings final approval',
  ],
  'Houston, TX': [
    'Building permit issued',
    'Electrical rough inspection complete',
    'Plumbing rough inspection complete',
    'Final inspection approval',
  ],
  'Phoenix, AZ': [
    'Building permit approved',
    'Electrical permit issued',
    'Plumbing permit issued',
    'City of Phoenix final sign-off',
  ],
};

const PERMIT_TYPES: Record<string, { label: string; color: string }> = {
  building: { label: 'Building', color: '#1D9E75' },
  electrical: { label: 'Electrical', color: '#D85A30' },
  plumbing: { label: 'Plumbing', color: '#378ADD' },
  mechanical: { label: 'Mechanical', color: '#7F77DD' },
  grading: { label: 'Grading', color: '#E8443A' },
  demo: { label: 'Demolition', color: '#6B7280' },
};

const STATUS_COLORS: Record<string, string> = {
  not_applied: '#9CA3AF',
  submitted: '#F59E0B',
  under_review: '#3B82F6',
  approved: '#10B981',
  expired: '#EF4444',
  denied: '#DC2626',
};

const STATUS_LABELS: Record<string, string> = {
  not_applied: 'Not Applied',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  expired: 'Expired',
  denied: 'Denied',
};

export default function PermitsCompliance() {
  const [permits, setPermits] = useState<Permit[]>([
    {
      id: '1',
      type: 'building',
      status: 'approved',
      jurisdiction: 'New York, NY',
      permit_number: 'NYC-2024-001234',
      submitted_date: '2024-01-15',
      approval_date: '2024-02-20',
      expiry_date: '2026-02-20',
      cost: 5000,
      notes: 'Main building permit for renovation project',
      document_url: '/permits/nyc-building-001.pdf',
    },
    {
      id: '2',
      type: 'electrical',
      status: 'under_review',
      jurisdiction: 'New York, NY',
      permit_number: 'NYC-2024-005678',
      submitted_date: '2024-02-01',
      cost: 2000,
      notes: 'Electrical work for new panel installation',
    },
    {
      id: '3',
      type: 'plumbing',
      status: 'expired',
      jurisdiction: 'New York, NY',
      permit_number: 'NYC-2023-009012',
      submitted_date: '2023-06-10',
      approval_date: '2023-07-15',
      expiry_date: '2024-07-15',
      cost: 1500,
      notes: 'Water line replacement - REQUIRES RENEWAL',
    },
  ]);

  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string>('New York, NY');
  const [viewType, setViewType] = useState<'cards' | 'table'>('cards');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingPermit, setEditingPermit] = useState<Permit | null>(null);
  const [formData, setFormData] = useState<Partial<Permit>>({});

  const complianceRequirements = useMemo(() => {
    const requirements = COMPLIANCE_REQUIREMENTS[selectedJurisdiction] || [];
    const completedTypes = new Set(
      permits
        .filter((p) => p.jurisdiction === selectedJurisdiction && p.status === 'approved')
        .map((p) => p.type)
    );

    return requirements.map((req, idx) => ({
      id: `${selectedJurisdiction}-${idx}`,
      jurisdiction: selectedJurisdiction,
      requirement: req,
      is_completed: completedTypes.has(
        Object.keys(PERMIT_TYPES).find((key) => req.toLowerCase().includes(key)) as any
      ),
    }));
  }, [selectedJurisdiction, permits]);

  const expiryAlerts = useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    return permits.filter((p) => {
      if (!p.expiry_date) return false;
      const expiryDate = new Date(p.expiry_date);
      return expiryDate <= thirtyDaysFromNow && expiryDate >= today;
    });
  }, [permits]);

  const expiredPermits = useMemo(() => {
    const today = new Date();
    return permits.filter((p) => p.expiry_date && new Date(p.expiry_date) < today);
  }, [permits]);

  const filteredPermits = useMemo(() => {
    return permits.filter((p) => {
      const matchesSearch =
        p.permit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.notes.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || p.type === filterType;
      const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [permits, searchTerm, filterType, filterStatus]);

  const statistics = useMemo(() => {
    const total = permits.length;
    const approved = permits.filter((p) => p.status === 'approved').length;
    const processingTimes = permits
      .filter((p) => p.submitted_date && p.approval_date)
      .map((p) => {
        const submitted = new Date(p.submitted_date);
        const approved = new Date(p.approval_date!);
        return Math.floor((approved.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
      });

    const avgProcessingTime =
      processingTimes.length > 0
        ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length)
        : 0;

    return {
      total,
      approved,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
      avgProcessingTime,
    };
  }, [permits]);

  const completionPercentage = useMemo(() => {
    if (complianceRequirements.length === 0) return 0;
    const completed = complianceRequirements.filter((item) => item.is_completed).length;
    return Math.round((completed / complianceRequirements.length) * 100);
  }, [complianceRequirements]);

  const handleAddPermit = useCallback(() => {
    setEditingPermit(null);
    setFormData({
      type: 'building',
      status: 'not_applied',
      jurisdiction: selectedJurisdiction,
      cost: 0,
      notes: '',
    });
    setShowForm(true);
  }, [selectedJurisdiction]);

  const handleEditPermit = useCallback((permit: Permit) => {
    setEditingPermit(permit);
    setFormData(permit);
    setShowForm(true);
  }, []);

  const handleDeletePermit = useCallback((id: string) => {
    setPermits((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleSavePermit = useCallback(() => {
    if (!formData.permit_number || !formData.type || !formData.status || !formData.submitted_date) {
      alert('Please fill in all required fields');
      return;
    }

    if (editingPermit) {
      setPermits((prev) =>
        prev.map((p) => (p.id === editingPermit.id ? { ...editingPermit, ...formData } : p))
      );
    } else {
      const newPermit: Permit = {
        id: String(Date.now()),
        type: formData.type!,
        status: formData.status!,
        jurisdiction: formData.jurisdiction || selectedJurisdiction,
        permit_number: formData.permit_number!,
        submitted_date: formData.submitted_date!,
        approval_date: formData.approval_date,
        expiry_date: formData.expiry_date,
        cost: formData.cost || 0,
        notes: formData.notes || '',
        document_url: formData.document_url,
      };
      setPermits((prev) => [newPermit, ...prev]);
    }

    setShowForm(false);
    setFormData({});
    setEditingPermit(null);
  }, [editingPermit, formData, selectedJurisdiction]);

  const handleFormChange = useCallback(
    (field: keyof Permit, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#FAFAF9', minHeight: '100vh', fontFamily: 'Archivo, sans-serif' }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#1F2937', marginBottom: '8px' }}>
            Permits & Compliance
          </h1>
          <p style={{ fontSize: '16px', color: '#6B7280' }}>
            Track permits, manage compliance requirements, and monitor expiry dates
          </p>
        </div>

        {/* Statistics Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          {[
            { label: 'Total Permits', value: statistics.total, color: '#1D9E75' },
            { label: 'Approved', value: statistics.approved, color: '#10B981' },
            { label: 'Approval Rate', value: `${statistics.approvalRate}%`, color: '#3B82F6' },
            { label: 'Avg Processing', value: `${statistics.avgProcessingTime}d`, color: '#D85A30' },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '12px',
                border: `1px solid #E5E7EB`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>{stat.label}</p>
              <p style={{ fontSize: '28px', fontWeight: 700, color: stat.color }}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Alerts */}
        <AnimatePresence>
          {(expiryAlerts.length > 0 || expiredPermits.length > 0) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginBottom: '24px' }}
            >
              {expiredPermits.length > 0 && (
                <div
                  style={{
                    backgroundColor: '#FEE2E2',
                    border: '1px solid #FECACA',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '12px',
                  }}
                >
                  <p style={{ color: '#991B1B', fontWeight: 600, margin: 0 }}>
                    {expiredPermits.length} expired permit{expiredPermits.length !== 1 ? 's' : ''} require
                    immediate renewal
                  </p>
                </div>
              )}
              {expiryAlerts.length > 0 && (
                <div
                  style={{
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #FCD34D',
                    borderRadius: '8px',
                    padding: '16px',
                  }}
                >
                  <p style={{ color: '#92400E', fontWeight: 600, margin: 0 }}>
                    {expiryAlerts.length} permit{expiryAlerts.length !== 1 ? 's' : ''} expiring within 30 days
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Jurisdiction & Controls */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '16px',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1F2937' }}>
                Jurisdiction
              </label>
              <select
                value={selectedJurisdiction}
                onChange={(e) => setSelectedJurisdiction(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontFamily: 'Archivo, sans-serif',
                }}
              >
                {JURISDICTIONS.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1F2937' }}>
                Search Permits
              </label>
              <input
                type="text"
                placeholder="Search by permit number or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'Archivo, sans-serif',
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1F2937' }}>
                Permit Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontFamily: 'Archivo, sans-serif',
                }}
              >
                <option value="all">All Types</option>
                {Object.entries(PERMIT_TYPES).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1F2937' }}>
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontFamily: 'Archivo, sans-serif',
                }}
              >
                <option value="all">All Statuses</option>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <button
                onClick={() => setViewType('cards')}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: viewType === 'cards' ? 'none' : '1px solid #D1D5DB',
                  backgroundColor: viewType === 'cards' ? '#1D9E75' : 'white',
                  color: viewType === 'cards' ? 'white' : '#1F2937',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Archivo, sans-serif',
                }}
              >
                Cards
              </button>
              <button
                onClick={() => setViewType('table')}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: viewType === 'table' ? 'none' : '1px solid #D1D5DB',
                  backgroundColor: viewType === 'table' ? '#1D9E75' : 'white',
                  color: viewType === 'table' ? 'white' : '#1F2937',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Archivo, sans-serif',
                }}
              >
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Compliance Checklist */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            marginBottom: '24px',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1F2937', marginBottom: '12px' }}>
              Compliance Checklist - {selectedJurisdiction}
            </h2>
            <div style={{ backgroundColor: '#F3F4F6', borderRadius: '8px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '8px',
                  backgroundColor: completionPercentage > 66 ? '#10B981' : completionPercentage > 33 ? '#F59E0B' : '#EF4444',
                  width: `${completionPercentage}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px' }}>
              {completionPercentage}% Complete ({complianceRequirements.filter((c) => c.is_completed).length}/
              {complianceRequirements.length})
            </p>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {complianceRequirements.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  backgroundColor: item.is_completed ? '#ECFDF5' : '#F9FAFB',
                  borderRadius: '8px',
                  border: `1px solid ${item.is_completed ? '#DBEAFE' : '#E5E7EB'}`,
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    backgroundColor: item.is_completed ? '#10B981' : '#D1D5DB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '12px',
                    flexShrink: 0,
                  }}
                >
                  {item.is_completed && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
                </div>
                <p style={{ margin: 0, color: item.is_completed ? '#10B981' : '#6B7280', fontSize: '14px' }}>
                  {item.requirement}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Permits List */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1F2937', margin: 0 }}>Permits</h2>
            <button
              onClick={handleAddPermit}
              style={{
                padding: '10px 16px',
                backgroundColor: '#1D9E75',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Archivo, sans-serif',
              }}
            >
              + Add Permit
            </button>
          </div>

          {filteredPermits.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#9CA3AF',
              }}
            >
              <p style={{ fontSize: '16px', margin: 0 }}>No permits found</p>
            </div>
          ) : viewType === 'cards' ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '16px',
              }}
            >
              <AnimatePresence>
                {filteredPermits.map((permit, idx) => {
                  const isExpiring =
                    permit.expiry_date && getDaysUntilExpiry(permit.expiry_date) <= 30 && getDaysUntilExpiry(permit.expiry_date) > 0;
                  const isExpired =
                    permit.expiry_date && getDaysUntilExpiry(permit.expiry_date) <= 0;

                  return (
                    <motion.div
                      key={permit.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: idx * 0.05 }}
                      style={{
                        backgroundColor: isExpired ? '#FEF2F2' : isExpiring ? '#FFFBEB' : 'white',
                        border: isExpired ? '2px solid #FECACA' : isExpiring ? '2px solid #FCD34D' : '1px solid #E5E7EB',
                        borderRadius: '12px',
                        padding: '16px',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '4px 12px',
                                backgroundColor: PERMIT_TYPES[permit.type].color,
                                color: 'white',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: 600,
                              }}
                            >
                              {PERMIT_TYPES[permit.type].label}
                            </span>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '4px 12px',
                                backgroundColor: STATUS_COLORS[permit.status],
                                color: 'white',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: 600,
                              }}
                            >
                              {STATUS_LABELS[permit.status]}
                            </span>
                          </div>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', margin: '4px 0 0 0' }}>
                            {permit.permit_number}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleEditPermit(permit)}
                            style={{
                              padding: '6px 10px',
                              backgroundColor: '#E5E7EB',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontFamily: 'Archivo, sans-serif',
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePermit(permit.id)}
                            style={{
                              padding: '6px 10px',
                              backgroundColor: '#FEE2E2',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              color: '#DC2626',
                              fontFamily: 'Archivo, sans-serif',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.6' }}>
                        <p style={{ margin: '4px 0' }}>
                          <strong>Jurisdiction:</strong> {permit.jurisdiction}
                        </p>
                        <p style={{ margin: '4px 0' }}>
                          <strong>Submitted:</strong> {formatDate(permit.submitted_date)}
                        </p>
                        {permit.approval_date && (
                          <p style={{ margin: '4px 0' }}>
                            <strong>Approved:</strong> {formatDate(permit.approval_date)}
                          </p>
                        )}
                        {permit.expiry_date && (
                          <p
                            style={{
                              margin: '4px 0',
                              color: isExpired ? '#991B1B' : isExpiring ? '#92400E' : '#6B7280',
                            }}
                          >
                            <strong>Expires:</strong> {formatDate(permit.expiry_date)} ({getDaysUntilExpiry(permit.expiry_date)} days)
                          </p>
                        )}
                        <p style={{ margin: '4px 0' }}>
                          <strong>Cost:</strong> ${permit.cost.toLocaleString()}
                        </p>
                        {permit.notes && (
                          <p style={{ margin: '8px 0 0 0', fontStyle: 'italic', color: '#4B5563' }}>
                            "{permit.notes}"
                          </p>
                        )}
                      </div>

                      {permit.document_url && (
                        <div style={{ marginTop: '12px' }}>
                          <a
                            href={permit.document_url}
                            style={{
                              fontSize: '12px',
                              color: '#1D9E75',
                              textDecoration: 'none',
                              fontWeight: 600,
                              borderBottom: '1px solid #1D9E75',
                            }}
                          >
                            View Document
                          </a>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                    {['Type', 'Permit #', 'Status', 'Jurisdiction', 'Submitted', 'Expires', 'Cost', 'Actions'].map((header) => (
                      <th
                        key={header}
                        style={{
                          padding: '12px',
                          textAlign: 'left',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#6B7280',
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPermits.map((permit) => {
                    const isExpiring =
                      permit.expiry_date && getDaysUntilExpiry(permit.expiry_date) <= 30 && getDaysUntilExpiry(permit.expiry_date) > 0;
                    const isExpired =
                      permit.expiry_date && getDaysUntilExpiry(permit.expiry_date) <= 0;

                    return (
                      <motion.tr
                        key={permit.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                          borderBottom: '1px solid #E5E7EB',
                          backgroundColor: isExpired ? '#FEF2F2' : isExpiring ? '#FFFBEB' : 'white',
                        }}
                      >
                        <td style={{ padding: '12px', fontSize: '13px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              backgroundColor: PERMIT_TYPES[permit.type].color,
                              color: 'white',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                          >
                            {PERMIT_TYPES[permit.type].label}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', fontWeight: 600 }}>{permit.permit_number}</td>
                        <td style={{ padding: '12px', fontSize: '13px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              backgroundColor: STATUS_COLORS[permit.status],
                              color: 'white',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                          >
                            {STATUS_LABELS[permit.status]}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px' }}>{permit.jurisdiction}</td>
                        <td style={{ padding: '12px', fontSize: '13px' }}>{formatDate(permit.submitted_date)}</td>
                        <td
                          style={{
                            padding: '12px',
                            fontSize: '13px',
                            color: isExpired ? '#991B1B' : isExpiring ? '#92400E' : '#6B7280',
                          }}
                        >
                          {permit.expiry_date ? formatDate(permit.expiry_date) : '-'}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', fontWeight: 600 }}>${permit.cost.toLocaleString()}</td>
                        <td style={{ padding: '12px', fontSize: '13px' }}>
                          <button
                            onClick={() => handleEditPermit(permit)}
                            style={{
                              marginRight: '8px',
                              padding: '4px 8px',
                              backgroundColor: '#E5E7EB',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontFamily: 'Archivo, sans-serif',
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePermit(permit.id)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#FEE2E2',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              color: '#DC2626',
                              fontFamily: 'Archivo, sans-serif',
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => {
              setShowForm(false);
              setFormData({});
              setEditingPermit(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '600px',
                width: '90%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
              }}
            >
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1F2937', marginBottom: '24px' }}>
                {editingPermit ? 'Edit Permit' : 'Add New Permit'}
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1F2937' }}>
                    Permit Number*
                  </label>
                  <input
                    type="text"
                    value={formData.permit_number || ''}
                    onChange={(e) => handleFormChange('permit_number', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      fontFamily: 'Archivo, sans-serif',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1F2937' }}>
                    Type*
                  </label>
                  <select
                    value={formData.type || ''}
                    onChange={(e) => handleFormChange('type', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      fontFamily: 'Archivo, sans-serif',
                    }}
                  >
                    <option value="">Select type</option>
                    {Object.entries(PERMIT_TYPES).map(([key, { label }]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1F2937' }}>
                    Status*
                  </label>
                  <select
                    value={formData.status || ''}
                    onChange={(e) => handleFormChange('status', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      fontFamily: 'Archivo, sans-serif',
                    }}
                  >
                    <option value="">Select status</option>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1F2937' }}>
                    Cost ($)
                  </label>
                  <input
                    type="number"
                    value={formData.cost || ''}
                    onChange={(e) => handleFormChange('cost', parseInt(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      fontFamily: 'Archivo, sans-serif',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1F2937' }}>
                    Submitted Date*
                  </label>
                  <input
                    type="date"
                    value={formData.submitted_date || ''}
                    onChange={(e) => handleFormChange('submitted_date', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      fontFamily: 'Archivo, sans-serif',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1F2937' }}>
                    Approval Date
                  </label>
                  <input
                    type="date"
                    value={formData.approval_date || ''}
                    onChange={(e) => handleFormChange('approval_date', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      fontFamily: 'Archivo, sans-serif',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1F2937' }}>
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.expiry_date || ''}
                    onChange={(e) => handleFormChange('expiry_date', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      fontFamily: 'Archivo, sans-serif',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1F2937' }}>
                    Jurisdiction
                  </label>
                  <select
                    value={formData.jurisdiction || selectedJurisdiction}
                    onChange={(e) => handleFormChange('jurisdiction', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      fontFamily: 'Archivo, sans-serif',
                    }}
                  >
                    {JURISDICTIONS.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1F2937' }}>
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'Archivo, sans-serif',
                    minHeight: '80px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setFormData({});
                    setEditingPermit(null);
                  }}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Archivo, sans-serif',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePermit}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#1D9E75',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Archivo, sans-serif',
                  }}
                >
                  {editingPermit ? 'Update' : 'Create'} Permit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

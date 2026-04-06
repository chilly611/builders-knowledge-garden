'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface CheckpointItem {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'pending' | 'pass' | 'fail' | 'conditional';
  notes?: string;
  photos_required: boolean;
  photos: string[];
  documentation_links?: string[];
  punch_list?: string[];
}

interface Inspection {
  id: string;
  name: string;
  phase: 'foundation' | 'framing' | 'rough-in' | 'insulation' | 'drywall' | 'final';
  project_id: string;
  jurisdiction: string;
  inspector: string;
  inspection_date?: string;
  items: CheckpointItem[];
  signature?: string;
  status: 'pending' | 'in-progress' | 'completed';
  created_at: string;
  completed_at?: string;
}

interface Template {
  phase: string;
  items: Omit<CheckpointItem, 'id' | 'status' | 'photos' | 'notes' | 'punch_list'>[];
}

const JURISDICTION_TEMPLATES: Record<string, Template[]> = {
  california: [
    {
      phase: 'foundation',
      items: [
        {
          name: 'Foundation Excavation',
          description: 'Verify excavation depth and dimensions',
          category: 'structural',
          photos_required: true,
        },
        {
          name: 'Soil Compaction',
          description: 'Check soil compaction to specification',
          category: 'structural',
          photos_required: true,
        },
        {
          name: 'Rebar Installation',
          description: 'Verify rebar placement and spacing',
          category: 'structural',
          photos_required: true,
        },
        {
          name: 'Form Work',
          description: 'Inspect form work for alignment and durability',
          category: 'structural',
          photos_required: true,
        },
      ],
    },
    {
      phase: 'framing',
      items: [
        {
          name: 'Framing Layout',
          description: 'Verify stud spacing and alignment',
          category: 'structural',
          photos_required: true,
        },
        {
          name: 'Shear Walls',
          description: 'Check shear wall construction per plan',
          category: 'structural',
          photos_required: true,
        },
        {
          name: 'Header Installation',
          description: 'Verify header sizing and support',
          category: 'structural',
          photos_required: true,
        },
      ],
    },
  ],
  texas: [
    {
      phase: 'foundation',
      items: [
        {
          name: 'Foundation Depth',
          description: 'Verify foundation depth per Texas building code',
          category: 'structural',
          photos_required: true,
        },
        {
          name: 'Moisture Barrier',
          description: 'Check moisture barrier installation',
          category: 'structural',
          photos_required: true,
        },
      ],
    },
  ],
  florida: [
    {
      phase: 'foundation',
      items: [
        {
          name: 'Wind Load Rating',
          description: 'Verify hurricane tie-down installation',
          category: 'structural',
          photos_required: true,
        },
        {
          name: 'Foundation Pilings',
          description: 'Inspect pilings for proper installation',
          category: 'structural',
          photos_required: true,
        },
      ],
    },
  ],
};

const DEFAULT_TEMPLATES: Record<string, Template> = {
  foundation: {
    phase: 'foundation',
    items: [
      {
        name: 'Excavation',
        description: 'Excavation depth and dimensions verified',
        category: 'structural',
        photos_required: true,
      },
      {
        name: 'Soil Preparation',
        description: 'Soil compacted and prepared',
        category: 'structural',
        photos_required: true,
      },
      {
        name: 'Rebar',
        description: 'Rebar placement verified',
        category: 'structural',
        photos_required: true,
      },
    ],
  },
  framing: {
    phase: 'framing',
    items: [
      {
        name: 'Framing Layout',
        description: 'Stud spacing verified per plan',
        category: 'structural',
        photos_required: true,
      },
      {
        name: 'Shear Walls',
        description: 'Shear wall construction verified',
        category: 'structural',
        photos_required: true,
      },
    ],
  },
  'rough-in': {
    phase: 'rough-in',
    items: [
      {
        name: 'Electrical Rough-In',
        description: 'Electrical wiring installed and inspected',
        category: 'MEP',
        photos_required: true,
      },
      {
        name: 'Plumbing Rough-In',
        description: 'Plumbing lines installed and inspected',
        category: 'MEP',
        photos_required: true,
      },
      {
        name: 'HVAC Rough-In',
        description: 'HVAC ductwork installed',
        category: 'MEP',
        photos_required: true,
      },
    ],
  },
  insulation: {
    phase: 'insulation',
    items: [
      {
        name: 'Wall Insulation',
        description: 'Wall insulation installed to specification',
        category: 'finish',
        photos_required: true,
      },
      {
        name: 'Ceiling Insulation',
        description: 'Ceiling insulation coverage verified',
        category: 'finish',
        photos_required: true,
      },
      {
        name: 'Air Sealing',
        description: 'Air sealing completed',
        category: 'finish',
        photos_required: false,
      },
    ],
  },
  drywall: {
    phase: 'drywall',
    items: [
      {
        name: 'Drywall Installation',
        description: 'Drywall hung and fastening verified',
        category: 'finish',
        photos_required: false,
      },
      {
        name: 'Taping and Mudding',
        description: 'Taping and mudding completed',
        category: 'finish',
        photos_required: false,
      },
    ],
  },
  final: {
    phase: 'final',
    items: [
      {
        name: 'Final Electrical',
        description: 'All electrical devices installed and working',
        category: 'MEP',
        photos_required: false,
      },
      {
        name: 'Final Plumbing',
        description: 'All plumbing fixtures installed and tested',
        category: 'MEP',
        photos_required: false,
      },
      {
        name: 'Paint and Finish',
        description: 'Paint and finish work completed',
        category: 'finish',
        photos_required: false,
      },
      {
        name: 'Flooring',
        description: 'Flooring installation completed',
        category: 'finish',
        photos_required: true,
      },
    ],
  },
};

const InspectionCheckpoints: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'timeline'>('list');
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState('california');

  useEffect(() => {
    fetchInspections();
  }, [projectId]);

  const fetchInspections = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inspections')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInspections(data || []);
    } catch (err) {
      console.error('Error fetching inspections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInspection = async (formData: Partial<Inspection>) => {
    try {
      const template = DEFAULT_TEMPLATES[formData.phase as string];
      const items: CheckpointItem[] = template.items.map((item, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        ...item,
        status: 'pending' as const,
        photos: [],
      }));

      const newInspection: Partial<Inspection> = {
        ...formData,
        project_id: projectId,
        items,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('inspections')
        .insert([newInspection])
        .select()
        .single();

      if (error) throw error;
      setInspections([data, ...inspections]);
      setShowNewForm(false);
    } catch (err) {
      console.error('Error creating inspection:', err);
    }
  };

  const handleUpdateInspection = async (inspectionId: string, updates: Partial<Inspection>) => {
    try {
      const { data, error } = await supabase
        .from('inspections')
        .update(updates)
        .eq('id', inspectionId)
        .select()
        .single();

      if (error) throw error;
      setInspections(
        inspections.map((i) => (i.id === inspectionId ? data : i))
      );
      if (selectedInspection?.id === inspectionId) setSelectedInspection(data);
    } catch (err) {
      console.error('Error updating inspection:', err);
    }
  };

  const stats = {
    total: inspections.length,
    completed: inspections.filter((i) => i.status === 'completed').length,
    passRate:
      inspections.length > 0
        ? (
            (inspections.filter((i) =>
              i.items.every((item) => item.status !== 'fail')
            ).length /
              inspections.length) *
            100
          ).toFixed(0)
        : '0',
    avgItemsPerInspection:
      inspections.length > 0
        ? (
            inspections.reduce((sum, i) => sum + i.items.length, 0) /
            inspections.length
          ).toFixed(1)
        : '0',
  };

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
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#1D9E75',
              margin: 0,
            }}
          >
            Inspection Checkpoints
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
            {showNewForm ? 'Cancel' : '+ New Inspection'}
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
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Total Inspections
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1D9E75' }}>
              {stats.total}
            </div>
          </div>
          <div
            style={{
              padding: '16px',
              backgroundColor: '#f0fdf4',
              borderRadius: '8px',
              borderLeft: `4px solid #1D9E75`,
            }}
          >
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Completed
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1D9E75' }}>
              {stats.completed}
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
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Pass Rate
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#7F77DD' }}>
              {stats.passRate}%
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
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Avg Items
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#378ADD' }}>
              {stats.avgItemsPerInspection}
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
            <NewInspectionForm
              onSubmit={(data) => {
                handleCreateInspection(data);
              }}
              onCancel={() => setShowNewForm(false)}
              jurisdiction={selectedJurisdiction}
              onJurisdictionChange={setSelectedJurisdiction}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          {(['list', 'calendar', 'timeline'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '8px 16px',
                backgroundColor: viewMode === mode ? '#1D9E75' : '#e5e7eb',
                color: viewMode === mode ? '#ffffff' : '#111827',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

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
      ) : inspections.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            color: '#6b7280',
          }}
        >
          No inspections yet. Create one to get started.
        </div>
      ) : viewMode === 'list' ? (
        <InspectionListView
          inspections={inspections}
          onSelectInspection={setSelectedInspection}
          onUpdateInspection={handleUpdateInspection}
        />
      ) : viewMode === 'calendar' ? (
        <InspectionCalendarView
          inspections={inspections}
          onSelectInspection={setSelectedInspection}
        />
      ) : (
        <InspectionTimelineView inspections={inspections} />
      )}

      <AnimatePresence>
        {selectedInspection && (
          <InspectionDetailPanel
            inspection={selectedInspection}
            onUpdate={handleUpdateInspection}
            onClose={() => setSelectedInspection(null)}
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

interface NewInspectionFormProps {
  onSubmit: (data: Partial<Inspection>) => void;
  onCancel: () => void;
  jurisdiction: string;
  onJurisdictionChange: (jurisdiction: string) => void;
}

const NewInspectionForm: React.FC<NewInspectionFormProps> = ({
  onSubmit,
  onCancel,
  jurisdiction,
  onJurisdictionChange,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    phase: 'foundation' as const,
    inspector: '',
    inspection_date: new Date().toISOString().split('T')[0],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.inspector.trim()) newErrors.inspector = 'Inspector is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ ...formData, jurisdiction });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
            Inspection Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: errors.name ? '2px solid #E8443A' : '1px solid #d1d5db',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
            placeholder="e.g., Foundation Inspection"
          />
          {errors.name && <span style={{ fontSize: '12px', color: '#E8443A' }}>{errors.name}</span>}
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
            Inspector Name
          </label>
          <input
            type="text"
            value={formData.inspector}
            onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: errors.inspector ? '2px solid #E8443A' : '1px solid #d1d5db',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
            placeholder="Inspector name"
          />
          {errors.inspector && (
            <span style={{ fontSize: '12px', color: '#E8443A' }}>{errors.inspector}</span>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
            Phase
          </label>
          <select
            value={formData.phase}
            onChange={(e) => setFormData({ ...formData, phase: e.target.value as any })}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
            }}
          >
            <option value="foundation">Foundation</option>
            <option value="framing">Framing</option>
            <option value="rough-in">Rough-in</option>
            <option value="insulation">Insulation</option>
            <option value="drywall">Drywall</option>
            <option value="final">Final</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
            Jurisdiction
          </label>
          <select
            value={jurisdiction}
            onChange={(e) => onJurisdictionChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
            }}
          >
            <option value="california">California</option>
            <option value="texas">Texas</option>
            <option value="florida">Florida</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
            Date
          </label>
          <input
            type="date"
            value={formData.inspection_date}
            onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })}
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
          Create Inspection
        </button>
      </div>
    </form>
  );
};

interface InspectionListViewProps {
  inspections: Inspection[];
  onSelectInspection: (inspection: Inspection) => void;
  onUpdateInspection: (inspectionId: string, updates: Partial<Inspection>) => void;
}

const InspectionListView: React.FC<InspectionListViewProps> = ({
  inspections,
  onSelectInspection,
  onUpdateInspection,
}) => {
  const statusColors: Record<string, string> = {
    pending: '#94a3b8',
    'in-progress': '#D85A30',
    completed: '#1D9E75',
  };

  const phaseOrder = ['foundation', 'framing', 'rough-in', 'insulation', 'drywall', 'final'];
  const sorted = [...inspections].sort(
    (a, b) => phaseOrder.indexOf(a.phase) - phaseOrder.indexOf(b.phase)
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ display: 'grid', gap: '12px' }}
    >
      {sorted.map((inspection) => {
        const passItems = inspection.items.filter((i) => i.status === 'pass').length;
        const failItems = inspection.items.filter((i) => i.status === 'fail').length;
        const pendingItems = inspection.items.filter((i) => i.status === 'pending').length;

        return (
          <motion.div
            key={inspection.id}
            whileHover={{ y: -2 }}
            onClick={() => onSelectInspection(inspection)}
            style={{
              padding: '16px',
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
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
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#111827',
                    margin: '0 0 4px 0',
                  }}
                >
                  {inspection.name}
                </h3>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                  Phase: {inspection.phase.charAt(0).toUpperCase() + inspection.phase.slice(1)} •
                  Inspector: {inspection.inspector}
                </p>
              </div>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '4px',
                  backgroundColor: statusColors[inspection.status],
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                {inspection.status}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
              }}
            >
              <div
                style={{
                  padding: '10px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '6px',
                  borderLeft: '3px solid #1D9E75',
                }}
              >
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Pass</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1D9E75' }}>
                  {passItems}
                </div>
              </div>
              <div
                style={{
                  padding: '10px',
                  backgroundColor: '#fef2f2',
                  borderRadius: '6px',
                  borderLeft: '3px solid #E8443A',
                }}
              >
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Fail</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#E8443A' }}>
                  {failItems}
                </div>
              </div>
              <div
                style={{
                  padding: '10px',
                  backgroundColor: '#f5f3ff',
                  borderRadius: '6px',
                  borderLeft: '3px solid #7F77DD',
                }}
              >
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Pending</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#7F77DD' }}>
                  {pendingItems}
                </div>
              </div>
              <div
                style={{
                  padding: '10px',
                  backgroundColor: '#f0f9ff',
                  borderRadius: '6px',
                  borderLeft: '3px solid #378ADD',
                }}
              >
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Total</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#378ADD' }}>
                  {inspection.items.length}
                </div>
              </div>
            </div>

            {inspection.inspection_date && (
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#9ca3af' }}>
                {new Date(inspection.inspection_date).toLocaleDateString()}
              </div>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
};

interface InspectionCalendarViewProps {
  inspections: Inspection[];
  onSelectInspection: (inspection: Inspection) => void;
}

const InspectionCalendarView: React.FC<InspectionCalendarViewProps> = ({
  inspections,
  onSelectInspection,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  const firstDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const getInspectionsForDate = (day: number) => {
    return inspections.filter((i) => {
      if (!i.inspection_date) return false;
      const inspectionDate = new Date(i.inspection_date);
      return (
        inspectionDate.getDate() === day &&
        inspectionDate.getMonth() === currentDate.getMonth() &&
        inspectionDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid #e5e7eb',
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
        <button
          onClick={() =>
            setCurrentDate(
              new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
            )
          }
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
          }}
        >
          ←
        </button>
        <h3
          style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#111827',
            margin: 0,
          }}
        >
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        <button
          onClick={() =>
            setCurrentDate(
              new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
            )
          }
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
          }}
        >
          →
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '8px',
          marginBottom: '8px',
        }}
      >
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            style={{
              padding: '8px',
              textAlign: 'center',
              fontWeight: 'bold',
              color: '#6b7280',
              fontSize: '12px',
            }}
          >
            {day}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
        {emptyDays.map((_, i) => (
          <div
            key={`empty-${i}`}
            style={{
              aspectRatio: '1',
              backgroundColor: '#f9fafb',
              borderRadius: '4px',
            }}
          />
        ))}
        {days.map((day) => {
          const dayInspections = getInspectionsForDate(day);
          return (
            <motion.div
              key={day}
              whileHover={{ y: -2 }}
              style={{
                aspectRatio: '1',
                padding: '8px',
                backgroundColor: dayInspections.length > 0 ? '#f0fdf4' : '#ffffff',
                border: dayInspections.length > 0 ? '2px solid #1D9E75' : '1px solid #e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden',
                cursor: dayInspections.length > 0 ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={() => dayInspections.length > 0 && onSelectInspection(dayInspections[0])}
            >
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>
                {day}
              </div>
              {dayInspections.length > 0 && (
                <div
                  style={{
                    fontSize: '10px',
                    color: '#1D9E75',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {dayInspections[0].name}
                </div>
              )}
              {dayInspections.length > 1 && (
                <div style={{ fontSize: '10px', color: '#6b7280' }}>
                  +{dayInspections.length - 1} more
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

interface InspectionTimelineViewProps {
  inspections: Inspection[];
}

const InspectionTimelineView: React.FC<InspectionTimelineViewProps> = ({ inspections }) => {
  const phaseOrder = ['foundation', 'framing', 'rough-in', 'insulation', 'drywall', 'final'];
  const sorted = [...inspections].sort(
    (a, b) => phaseOrder.indexOf(a.phase) - phaseOrder.indexOf(b.phase)
  );

  const getPhaseColor = (phase: string) => {
    const colors: Record<string, string> = {
      foundation: '#1D9E75',
      framing: '#D85A30',
      'rough-in': '#378ADD',
      insulation: '#7F77DD',
      drywall: '#E8443A',
      final: '#1D9E75',
    };
    return colors[phase] || '#94a3b8';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid #e5e7eb',
      }}
    >
      <div style={{ position: 'relative', paddingLeft: '40px' }}>
        {sorted.map((inspection, index) => (
          <motion.div
            key={inspection.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            style={{
              marginBottom: '24px',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '-40px',
                top: '4px',
                width: '20px',
                height: '20px',
                backgroundColor: getPhaseColor(inspection.phase),
                borderRadius: '50%',
                border: '3px solid #ffffff',
                boxShadow: '0 0 0 2px ' + getPhaseColor(inspection.phase),
              }}
            />
            {index < sorted.length - 1 && (
              <div
                style={{
                  position: 'absolute',
                  left: '-30px',
                  top: '20px',
                  width: '2px',
                  height: '30px',
                  backgroundColor: '#e5e7eb',
                }}
              />
            )}
            <div
              style={{
                padding: '12px',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
                borderLeft: `3px solid ${getPhaseColor(inspection.phase)}`,
              }}
            >
              <h4
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  margin: '0 0 4px 0',
                  color: '#111827',
                }}
              >
                {inspection.name}
              </h4>
              <p
                style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  margin: '0 0 4px 0',
                }}
              >
                Phase: {inspection.phase} • Inspector: {inspection.inspector}
              </p>
              {inspection.inspection_date && (
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
                  {new Date(inspection.inspection_date).toLocaleDateString()}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

interface InspectionDetailPanelProps {
  inspection: Inspection;
  onUpdate: (inspectionId: string, updates: Partial<Inspection>) => void;
  onClose: () => void;
}

const InspectionDetailPanel: React.FC<InspectionDetailPanelProps> = ({
  inspection,
  onUpdate,
  onClose,
}) => {
  const [items, setItems] = useState<CheckpointItem[]>(inspection.items);
  const [signatureCanvas, setSignatureCanvas] = useState<HTMLCanvasElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const handleItemStatusChange = (itemId: string, newStatus: string) => {
    const updatedItems = items.map((item) =>
      item.id === itemId ? { ...item, status: newStatus as any } : item
    );
    setItems(updatedItems);
    onUpdate(inspection.id, { items: updatedItems });
  };

  const handleItemNotesChange = (itemId: string, notes: string) => {
    const updatedItems = items.map((item) =>
      item.id === itemId ? { ...item, notes } : item
    );
    setItems(updatedItems);
  };

  const handleSaveNotes = () => {
    onUpdate(inspection.id, { items });
  };

  const handlePunchListAdd = (itemId: string, punchItem: string) => {
    const updatedItems = items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            punch_list: [...(item.punch_list || []), punchItem],
          }
        : item
    );
    setItems(updatedItems);
    onUpdate(inspection.id, { items: updatedItems });
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1D9E75';
      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      ctx.stroke();
    }
  };

  const endDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const saveSignature = () => {
    if (canvasRef.current) {
      onUpdate(inspection.id, { signature: canvasRef.current.toDataURL() });
    }
  };

  const completeInspection = () => {
    onUpdate(inspection.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
  };

  const statusColors: Record<string, string> = {
    pending: '#94a3b8',
    pass: '#1D9E75',
    fail: '#E8443A',
    conditional: '#D85A30',
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
        maxWidth: '600px',
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
            {inspection.name}
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
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Phase</span>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                {inspection.phase}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Inspector</span>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                {inspection.inspector}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Jurisdiction</span>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                {inspection.jurisdiction}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Status</span>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1D9E75' }}>
                {inspection.status}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
            Checkpoint Items
          </h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {items.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '12px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  borderLeft: `3px solid ${statusColors[item.status]}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px',
                  }}
                >
                  <div>
                    <h4
                      style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        margin: '0 0 2px 0',
                        color: '#111827',
                      }}
                    >
                      {item.name}
                    </h4>
                    <p
                      style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        margin: 0,
                      }}
                    >
                      {item.description}
                    </p>
                  </div>
                  <select
                    value={item.status}
                    onChange={(e) => handleItemStatusChange(item.id, e.target.value)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db',
                      fontSize: '12px',
                      backgroundColor: statusColors[item.status],
                      color: '#ffffff',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="pass">Pass</option>
                    <option value="fail">Fail</option>
                    <option value="conditional">Conditional</option>
                  </select>
                </div>

                {item.status === 'fail' && (
                  <div style={{ marginBottom: '8px' }}>
                    <textarea
                      value={item.notes || ''}
                      onChange={(e) => handleItemNotesChange(item.id, e.target.value)}
                      onBlur={handleSaveNotes}
                      placeholder="Describe the failure..."
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #fecaca',
                        fontSize: '12px',
                        minHeight: '60px',
                        boxSizing: 'border-box',
                        fontFamily: 'Archivo, sans-serif',
                      }}
                    />
                  </div>
                )}

                {item.status === 'conditional' && (
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                      Punch List Items
                    </label>
                    <div style={{ marginBottom: '6px' }}>
                      {item.punch_list?.map((punch, idx) => (
                        <div
                          key={idx}
                          style={{
                            fontSize: '12px',
                            padding: '4px 8px',
                            backgroundColor: '#fff5e6',
                            borderRadius: '4px',
                            marginBottom: '4px',
                            borderLeft: '2px solid #D85A30',
                          }}
                        >
                          {punch}
                        </div>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Add punch list item..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          handlePunchListAdd(item.id, e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #d1d5db',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}

                {item.photos_required && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                      📷 Photo Required
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      style={{
                        fontSize: '12px',
                        padding: '4px',
                      }}
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
            Digital Signature
          </h3>
          <canvas
            ref={canvasRef}
            width={500}
            height={150}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
            style={{
              width: '100%',
              height: 'auto',
              border: '2px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              cursor: 'crosshair',
              marginBottom: '8px',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={clearSignature}
              style={{
                flex: 1,
                padding: '6px',
                backgroundColor: '#e5e7eb',
                color: '#111827',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              Clear
            </button>
            <button
              onClick={saveSignature}
              style={{
                flex: 1,
                padding: '6px',
                backgroundColor: '#1D9E75',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              Save Signature
            </button>
          </div>
        </div>

        {inspection.status !== 'completed' && (
          <button
            onClick={completeInspection}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#1D9E75',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Complete Inspection
          </button>
        )}

        <div
          style={{
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '1px solid #e5e7eb',
            fontSize: '12px',
            color: '#9ca3af',
          }}
        >
          <div style={{ marginBottom: '6px' }}>
            Created: {new Date(inspection.created_at).toLocaleString()}
          </div>
          {inspection.completed_at && (
            <div>Completed: {new Date(inspection.completed_at).toLocaleString()}</div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default InspectionCheckpoints;

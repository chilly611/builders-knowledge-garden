'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  MapPin,
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Search,
  DollarSign,
  Calendar,
  User,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import BuildGate from '@/lib/auth/BuildGate';

const BUILDING_TYPES = [
  { id: 'residential', label: 'Residential', icon: Building2 },
  { id: 'commercial', label: 'Commercial', icon: Briefcase },
  { id: 'industrial', label: 'Industrial', icon: Building2 },
  { id: 'healthcare', label: 'Healthcare', icon: Building2 },
  { id: 'education', label: 'Education', icon: Building2 },
  { id: 'hospitality', label: 'Hospitality', icon: Building2 },
  { id: 'mixed-use', label: 'Mixed-Use', icon: Building2 },
  { id: 'infrastructure', label: 'Infrastructure', icon: Building2 },
];

const JURISDICTIONS = [
  { label: 'United States', group: 'regions' },
  { label: 'California', group: 'US States' },
  { label: 'Texas', group: 'US States' },
  { label: 'New York', group: 'US States' },
  { label: 'Florida', group: 'US States' },
  { label: 'Illinois', group: 'US States' },
  { label: 'Pennsylvania', group: 'US States' },
  { label: 'Ohio', group: 'US States' },
  { label: 'Georgia', group: 'US States' },
  { label: 'North Carolina', group: 'US States' },
  { label: 'Canada', group: 'regions' },
  { label: 'United Kingdom', group: 'International' },
  { label: 'Australia', group: 'International' },
  { label: 'Germany', group: 'International' },
  { label: 'Japan', group: 'International' },
];

interface WizardData {
  buildingType: string;
  jurisdiction: string;
  projectName: string;
  clientName: string;
  location: string;
  budget: string;
  startDate: string;
  notes: string;
}

interface AIAnalysis {
  estimateStatus: 'idle' | 'loading' | 'done' | 'error';
  scheduleStatus: 'idle' | 'loading' | 'done' | 'error';
  complianceStatus: 'idle' | 'loading' | 'done' | 'error';
  estimateData: any | null;
  scheduleData: any | null;
  complianceData: any | null;
}

interface ValidationErrors {
  [key: string]: string;
}

export default function ProjectCreationWizard() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({
    buildingType: '',
    jurisdiction: '',
    projectName: '',
    clientName: '',
    location: '',
    budget: '',
    startDate: '',
    notes: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showJurisdictionDropdown, setShowJurisdictionDropdown] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis>({
    estimateStatus: 'idle',
    scheduleStatus: 'idle',
    complianceStatus: 'idle',
    estimateData: null,
    scheduleData: null,
    complianceData: null,
  });

  const filteredJurisdictions = JURISDICTIONS.filter((j) =>
    j.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto-redirect once all AI analyses are done (or errored)
  const allAIDone =
    aiAnalysis.estimateStatus !== 'idle' &&
    aiAnalysis.estimateStatus !== 'loading' &&
    aiAnalysis.scheduleStatus !== 'idle' &&
    aiAnalysis.scheduleStatus !== 'loading' &&
    aiAnalysis.complianceStatus !== 'idle' &&
    aiAnalysis.complianceStatus !== 'loading';

  useEffect(() => {
    if (allAIDone && projectId && currentStep === 4) {
      const timer = setTimeout(() => {
        router.push(`/projects/${projectId}`);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [allAIDone, projectId, currentStep, router]);

  const validateStep = (step: number): boolean => {
    const newErrors: ValidationErrors = {};

    if (step === 1) {
      if (!wizardData.buildingType) {
        newErrors.buildingType = 'Please select a building type';
      }
    } else if (step === 2) {
      if (!wizardData.jurisdiction) {
        newErrors.jurisdiction = 'Please select a jurisdiction';
      }
    } else if (step === 3) {
      if (!wizardData.projectName.trim()) {
        newErrors.projectName = 'Project name is required';
      }
      if (!wizardData.clientName.trim()) {
        newErrors.clientName = 'Client name is required';
      }
      if (!wizardData.location.trim()) {
        newErrors.location = 'Location is required';
      }
      if (!wizardData.budget.trim()) {
        newErrors.budget = 'Budget is required';
      }
      if (!wizardData.startDate.trim()) {
        newErrors.startDate = 'Start date is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 3) {
        // Step 3 → triggers project creation + AI analysis (Step 4)
        handleCreateProject();
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleCreateProject = async () => {
    setIsLoading(true);
    setCurrentStep(4);
    setAiAnalysis({
      estimateStatus: 'loading',
      scheduleStatus: 'loading',
      complianceStatus: 'loading',
      estimateData: null,
      scheduleData: null,
      complianceData: null,
    });

    try {
      // Step 1: Create the project with correct field mapping
      const createResponse = await fetch('/api/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: wizardData.projectName,
          client_name: wizardData.clientName,
          building_type: wizardData.buildingType,
          project_type: wizardData.buildingType,
          jurisdiction: wizardData.jurisdiction,
          location: wizardData.location,
          budget_amount: parseFloat(wizardData.budget) || 0,
          start_date: wizardData.startDate,
          notes: wizardData.notes,
        }),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create project');
      }

      const { project } = await createResponse.json();
      const createdProjectId = project.id;
      setProjectId(createdProjectId);

      // Step 2: Fire AI calls in parallel
      const aiPayload = {
        projectId: createdProjectId,
        buildingType: wizardData.buildingType,
        jurisdiction: wizardData.jurisdiction,
        budget: parseFloat(wizardData.budget) || undefined,
        startDate: wizardData.startDate,
        projectName: wizardData.projectName,
      };

      // Estimate
      fetch('/api/v1/projects/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiPayload),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('Estimate failed');
          const data = await res.json();
          setAiAnalysis((prev) => ({
            ...prev,
            estimateStatus: 'done',
            estimateData: data.estimate,
          }));
        })
        .catch(() => {
          setAiAnalysis((prev) => ({ ...prev, estimateStatus: 'error' }));
        });

      // Schedule
      fetch('/api/v1/projects/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiPayload),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('Schedule failed');
          const data = await res.json();
          setAiAnalysis((prev) => ({
            ...prev,
            scheduleStatus: 'done',
            scheduleData: data.schedule,
          }));
        })
        .catch(() => {
          setAiAnalysis((prev) => ({ ...prev, scheduleStatus: 'error' }));
        });

      // Compliance
      fetch('/api/v1/projects/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: createdProjectId,
          buildingType: wizardData.buildingType,
          jurisdiction: wizardData.jurisdiction,
          budget: parseFloat(wizardData.budget) || undefined,
        }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('Compliance failed');
          const data = await res.json();
          setAiAnalysis((prev) => ({
            ...prev,
            complianceStatus: 'done',
            complianceData: data.compliance,
          }));
        })
        .catch(() => {
          setAiAnalysis((prev) => ({ ...prev, complianceStatus: 'error' }));
        });

    } catch (error) {
      console.error('Error creating project:', error);
      setErrors({ submit: 'Failed to create project. Please try again.' });
      setIsLoading(false);
      setCurrentStep(3);
    }
  };

  return (
    <BuildGate requiredTier="pro">
      <div style={{
        background: 'var(--bg)',
        color: 'var(--fg)',
        minHeight: '100vh',
        padding: '2rem 1rem',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Progress Bar */}
          <div style={{ marginBottom: '3rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}>
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  style={{
                    flex: 1,
                    height: '4px',
                    background: step <= currentStep ? 'var(--accent)' : 'var(--border)',
                    marginRight: step < 4 ? '0.5rem' : '0',
                    borderRadius: '2px',
                    transition: 'background-color 0.3s ease',
                  }}
                />
              ))}
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.875rem',
              color: 'var(--fg)',
              opacity: 0.7,
            }}>
              <span>Building Type</span>
              <span>Jurisdiction</span>
              <span>Details</span>
              <span>AI Analysis</span>
            </div>
          </div>

          {/* Step 1: Building Type */}
          {currentStep === 1 && (
            <div style={{
              animation: 'fadeIn 0.3s ease',
              animationFillMode: 'forwards',
            }}>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: '700',
                marginBottom: '0.5rem',
              }}>
                What type of project are you building?
              </h1>
              <p style={{
                fontSize: '1rem',
                opacity: 0.7,
                marginBottom: '2rem',
              }}>
                Select the primary building type for your project
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '1rem',
              }}>
                {BUILDING_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = wizardData.buildingType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setWizardData({ ...wizardData, buildingType: type.id })}
                      style={{
                        padding: '1.5rem',
                        border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: '0.75rem',
                        background: isSelected ? 'var(--bg-secondary)' : 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.75rem',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 0 0 3px rgba(29, 158, 117, 0.1)' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
                          (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-secondary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                          (e.currentTarget as HTMLButtonElement).style.background = 'white';
                        }
                      }}
                    >
                      <Icon
                        size={28}
                        color={isSelected ? 'var(--accent)' : 'var(--fg)'}
                      />
                      <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                        {type.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              {errors.buildingType && (
                <p style={{
                  color: '#dc2626',
                  fontSize: '0.875rem',
                  marginTop: '1rem',
                }}>
                  {errors.buildingType}
                </p>
              )}
            </div>
          )}

          {/* Step 2: Jurisdiction */}
          {currentStep === 2 && (
            <div style={{
              animation: 'fadeIn 0.3s ease',
              animationFillMode: 'forwards',
            }}>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: '700',
                marginBottom: '0.5rem',
              }}>
                Where is your project located?
              </h1>
              <p style={{
                fontSize: '1rem',
                opacity: 0.7,
                marginBottom: '2rem',
              }}>
                Select the jurisdiction for building codes and regulations
              </p>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '1rem',
                }}>
                  <Search size={18} style={{
                    position: 'absolute',
                    left: '1rem',
                    pointerEvents: 'none',
                    opacity: 0.5,
                  }} />
                  <input
                    type="text"
                    placeholder="Search jurisdictions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowJurisdictionDropdown(true)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.5rem',
                      border: `1px solid var(--border)`,
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      background: 'white',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {showJurisdictionDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: `1px solid var(--border)`,
                    borderRadius: '0.5rem',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    zIndex: 10,
                    marginTop: '0.5rem',
                  }}>
                    {filteredJurisdictions.map((jurisdiction, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setWizardData({
                            ...wizardData,
                            jurisdiction: jurisdiction.label,
                          });
                          setSearchQuery('');
                          setShowJurisdictionDropdown(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          border: 'none',
                          background: 'white',
                          textAlign: 'left',
                          cursor: 'pointer',
                          borderBottom: `1px solid var(--border)`,
                          fontSize: '0.95rem',
                          transition: 'background-color 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-secondary)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'white';
                        }}
                      >
                        {jurisdiction.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {wizardData.jurisdiction && (
                <div style={{
                  padding: '1rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}>
                  <CheckCircle size={20} color="var(--accent)" />
                  <span>Selected: <strong>{wizardData.jurisdiction}</strong></span>
                </div>
              )}

              {errors.jurisdiction && (
                <p style={{
                  color: '#dc2626',
                  fontSize: '0.875rem',
                  marginTop: '1rem',
                }}>
                  {errors.jurisdiction}
                </p>
              )}
            </div>
          )}

          {/* Step 3: Project Details */}
          {currentStep === 3 && (
            <div style={{
              animation: 'fadeIn 0.3s ease',
              animationFillMode: 'forwards',
            }}>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: '700',
                marginBottom: '0.5rem',
              }}>
                Tell us about your project
              </h1>
              <p style={{
                fontSize: '1rem',
                opacity: 0.7,
                marginBottom: '2rem',
              }}>
                Enter key details about your construction project
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))',
                gap: '1.5rem',
              }}>
                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                  }}>
                    <FileText size={16} />
                    Project Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Downtown Office Complex"
                    value={wizardData.projectName}
                    onChange={(e) =>
                      setWizardData({ ...wizardData, projectName: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${errors.projectName ? '#dc2626' : 'var(--border)'}`,
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      background: 'white',
                      boxSizing: 'border-box',
                    }}
                  />
                  {errors.projectName && (
                    <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {errors.projectName}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                  }}>
                    <User size={16} />
                    Client Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Acme Development Corp"
                    value={wizardData.clientName}
                    onChange={(e) =>
                      setWizardData({ ...wizardData, clientName: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${errors.clientName ? '#dc2626' : 'var(--border)'}`,
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      background: 'white',
                      boxSizing: 'border-box',
                    }}
                  />
                  {errors.clientName && (
                    <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {errors.clientName}
                    </p>
                  )}
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                  }}>
                    <MapPin size={16} />
                    Location / Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 123 Main St, San Francisco, CA 94102"
                    value={wizardData.location}
                    onChange={(e) =>
                      setWizardData({ ...wizardData, location: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${errors.location ? '#dc2626' : 'var(--border)'}`,
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      background: 'white',
                      boxSizing: 'border-box',
                    }}
                  />
                  {errors.location && (
                    <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {errors.location}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                  }}>
                    <DollarSign size={16} />
                    Estimated Budget
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 5000000"
                    value={wizardData.budget}
                    onChange={(e) =>
                      setWizardData({ ...wizardData, budget: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${errors.budget ? '#dc2626' : 'var(--border)'}`,
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      background: 'white',
                      boxSizing: 'border-box',
                    }}
                  />
                  {errors.budget && (
                    <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {errors.budget}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                  }}>
                    <Calendar size={16} />
                    Target Start Date
                  </label>
                  <input
                    type="date"
                    value={wizardData.startDate}
                    onChange={(e) =>
                      setWizardData({ ...wizardData, startDate: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${errors.startDate ? '#dc2626' : 'var(--border)'}`,
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      background: 'white',
                      boxSizing: 'border-box',
                    }}
                  />
                  {errors.startDate && (
                    <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {errors.startDate}
                    </p>
                  )}
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                  }}>
                    <Briefcase size={16} />
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    placeholder="Add any additional details about the project..."
                    value={wizardData.notes}
                    onChange={(e) =>
                      setWizardData({ ...wizardData, notes: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid var(--border)`,
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      background: 'white',
                      minHeight: '100px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Live AI Analysis */}
          {currentStep === 4 && (
            <div style={{
              animation: 'fadeIn 0.3s ease',
              animationFillMode: 'forwards',
            }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                  {allAIDone ? 'Your Project is Ready' : 'AI Analyzing Your Project'}
                </h1>
                <p style={{ fontSize: '1rem', opacity: 0.7 }}>
                  {allAIDone
                    ? 'Redirecting to your dashboard in a moment...'
                    : `Building type: ${wizardData.buildingType} · Jurisdiction: ${wizardData.jurisdiction}`}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Estimate Card */}
                <div style={{
                  border: `2px solid ${aiAnalysis.estimateStatus === 'done' ? 'var(--accent)' : aiAnalysis.estimateStatus === 'error' ? '#dc2626' : 'var(--border)'}`,
                  borderRadius: '0.75rem',
                  padding: '1.25rem',
                  background: aiAnalysis.estimateStatus === 'done' ? '#f0fdf4' : 'white',
                  transition: 'all 0.3s ease',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: aiAnalysis.estimateData ? '1rem' : '0' }}>
                    <DollarSign size={24} color={aiAnalysis.estimateStatus === 'done' ? 'var(--accent)' : '#9ca3af'} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: '1rem' }}>Cost Estimate</p>
                      <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {aiAnalysis.estimateStatus === 'loading' && 'Generating CSI breakdown...'}
                        {aiAnalysis.estimateStatus === 'done' && 'Complete'}
                        {aiAnalysis.estimateStatus === 'error' && 'Failed — will retry on dashboard'}
                      </p>
                    </div>
                    {aiAnalysis.estimateStatus === 'loading' && (
                      <div style={{ width: 24, height: 24, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    )}
                    {aiAnalysis.estimateStatus === 'done' && <CheckCircle size={24} color="var(--accent)" />}
                  </div>
                  {aiAnalysis.estimateData && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.85rem' }}>
                      <div style={{ background: 'white', borderRadius: '0.5rem', padding: '0.75rem', textAlign: 'center', border: '1px solid var(--border)' }}>
                        <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>Total Cost</p>
                        <p style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--fg)' }}>
                          ${(aiAnalysis.estimateData.totalCost / 1000000).toFixed(1)}M
                        </p>
                      </div>
                      <div style={{ background: 'white', borderRadius: '0.5rem', padding: '0.75rem', textAlign: 'center', border: '1px solid var(--border)' }}>
                        <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>Per Sq Ft</p>
                        <p style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--fg)' }}>
                          ${aiAnalysis.estimateData.costPerSqFt?.toFixed(0) || '—'}
                        </p>
                      </div>
                      <div style={{ background: 'white', borderRadius: '0.5rem', padding: '0.75rem', textAlign: 'center', border: '1px solid var(--border)' }}>
                        <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>CSI Divisions</p>
                        <p style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--fg)' }}>
                          {aiAnalysis.estimateData.csiDivisions?.length || 0}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Schedule Card */}
                <div style={{
                  border: `2px solid ${aiAnalysis.scheduleStatus === 'done' ? 'var(--accent)' : aiAnalysis.scheduleStatus === 'error' ? '#dc2626' : 'var(--border)'}`,
                  borderRadius: '0.75rem',
                  padding: '1.25rem',
                  background: aiAnalysis.scheduleStatus === 'done' ? '#f0fdf4' : 'white',
                  transition: 'all 0.3s ease',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: aiAnalysis.scheduleData ? '1rem' : '0' }}>
                    <Calendar size={24} color={aiAnalysis.scheduleStatus === 'done' ? 'var(--accent)' : '#9ca3af'} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: '1rem' }}>Project Schedule</p>
                      <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {aiAnalysis.scheduleStatus === 'loading' && 'Building Gantt-ready timeline...'}
                        {aiAnalysis.scheduleStatus === 'done' && 'Complete'}
                        {aiAnalysis.scheduleStatus === 'error' && 'Failed — will retry on dashboard'}
                      </p>
                    </div>
                    {aiAnalysis.scheduleStatus === 'loading' && (
                      <div style={{ width: 24, height: 24, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    )}
                    {aiAnalysis.scheduleStatus === 'done' && <CheckCircle size={24} color="var(--accent)" />}
                  </div>
                  {aiAnalysis.scheduleData && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.85rem' }}>
                      <div style={{ background: 'white', borderRadius: '0.5rem', padding: '0.75rem', textAlign: 'center', border: '1px solid var(--border)' }}>
                        <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>Duration</p>
                        <p style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--fg)' }}>
                          {aiAnalysis.scheduleData.totalDurationWeeks}w
                        </p>
                      </div>
                      <div style={{ background: 'white', borderRadius: '0.5rem', padding: '0.75rem', textAlign: 'center', border: '1px solid var(--border)' }}>
                        <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>Phases</p>
                        <p style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--fg)' }}>
                          {aiAnalysis.scheduleData.phases?.length || 0}
                        </p>
                      </div>
                      <div style={{ background: 'white', borderRadius: '0.5rem', padding: '0.75rem', textAlign: 'center', border: '1px solid var(--border)' }}>
                        <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>Hold Points</p>
                        <p style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--fg)' }}>
                          {aiAnalysis.scheduleData.jurisdictionHoldPoints?.length || 0}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Compliance Card */}
                <div style={{
                  border: `2px solid ${aiAnalysis.complianceStatus === 'done' ? 'var(--accent)' : aiAnalysis.complianceStatus === 'error' ? '#dc2626' : 'var(--border)'}`,
                  borderRadius: '0.75rem',
                  padding: '1.25rem',
                  background: aiAnalysis.complianceStatus === 'done' ? '#f0fdf4' : 'white',
                  transition: 'all 0.3s ease',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: aiAnalysis.complianceData ? '1rem' : '0' }}>
                    <FileText size={24} color={aiAnalysis.complianceStatus === 'done' ? 'var(--accent)' : '#9ca3af'} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: '1rem' }}>Compliance Check</p>
                      <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {aiAnalysis.complianceStatus === 'loading' && 'Scanning building codes...'}
                        {aiAnalysis.complianceStatus === 'done' && 'Complete'}
                        {aiAnalysis.complianceStatus === 'error' && 'Failed — will retry on dashboard'}
                      </p>
                    </div>
                    {aiAnalysis.complianceStatus === 'loading' && (
                      <div style={{ width: 24, height: 24, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    )}
                    {aiAnalysis.complianceStatus === 'done' && <CheckCircle size={24} color="var(--accent)" />}
                  </div>
                  {aiAnalysis.complianceData && (
                    <div style={{ fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                        {aiAnalysis.complianceData.flags?.slice(0, 4).map((flag: any, i: number) => (
                          <span key={i} style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '1rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: flag.severity === 'critical' ? '#fef2f2' : flag.severity === 'warning' ? '#fffbeb' : '#f0fdf4',
                            color: flag.severity === 'critical' ? '#dc2626' : flag.severity === 'warning' ? '#d97706' : '#16a34a',
                            border: `1px solid ${flag.severity === 'critical' ? '#fecaca' : flag.severity === 'warning' ? '#fde68a' : '#bbf7d0'}`,
                          }}>
                            {flag.title}
                          </span>
                        ))}
                      </div>
                      <p style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                        Permit timeline: {aiAnalysis.complianceData.estimatedPermitTimeline} · {aiAnalysis.complianceData.flags?.length || 0} code flags found
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Go to dashboard button once done */}
              {allAIDone && projectId && (
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                  <button
                    onClick={() => router.push(`/projects/${projectId}`)}
                    style={{
                      padding: '0.75rem 2rem',
                      background: 'var(--accent)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'opacity 0.2s',
                    }}
                  >
                    Go to Project Dashboard →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 5 removed — Step 4 now handles completion + redirect */}

          {/* Navigation Buttons */}
          {currentStep < 4 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '1rem',
              marginTop: '3rem',
              paddingTop: '2rem',
              borderTop: '1px solid var(--border)',
            }}>
              <button
                onClick={handleBack}
                disabled={currentStep === 1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  border: `1px solid ${currentStep === 1 ? 'var(--border)' : 'var(--border)'}`,
                  borderRadius: '0.5rem',
                  background: 'white',
                  color: currentStep === 1 ? 'var(--fg)' : 'var(--fg)',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentStep === 1 ? 0.5 : 1,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (currentStep > 1) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-secondary)';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'white';
                }}
              >
                <ArrowLeft size={18} />
                Back
              </button>

              <button
                onClick={handleNext}
                disabled={isLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderRadius: '0.5rem',
                  background: 'var(--accent)',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    (e.currentTarget as HTMLButtonElement).style.opacity = '0.9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                  }
                }}
              >
                {currentStep === 3 ? 'Create Project' : 'Next'}
                <ArrowRight size={18} />
              </button>
            </div>
          )}

          {errors.submit && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '0.5rem',
              color: '#dc2626',
              fontSize: '0.875rem',
            }}>
              {errors.submit}
            </div>
          )}
        </div>

        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          @media (max-width: 768px) {
            div {
              font-size: 0.95rem;
            }
          }
        `}</style>
      </div>
    </BuildGate>
  );
}

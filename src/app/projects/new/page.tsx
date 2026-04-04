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

  const filteredJurisdictions = JURISDICTIONS.filter((j) =>
    j.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      if (currentStep === 4) {
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
    try {
      const projectPayload = {
        name: wizardData.projectName,
        client: wizardData.clientName,
        buildingType: wizardData.buildingType,
        jurisdiction: wizardData.jurisdiction,
        location: wizardData.location,
        estimatedBudget: parseFloat(wizardData.budget),
        targetStartDate: wizardData.startDate,
        notes: wizardData.notes,
      };

      const createResponse = await fetch('/api/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectPayload),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create project');
      }

      const project = await createResponse.json();

      await fetch('/api/v1/projects/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          ...projectPayload,
        }),
      });

      setCurrentStep(5);
      setTimeout(() => {
        router.push(`/projects/${project.id}`);
      }, 2000);
    } catch (error) {
      console.error('Error creating project:', error);
      setErrors({ submit: 'Failed to create project. Please try again.' });
      setIsLoading(false);
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
              {[1, 2, 3, 4, 5].map((step) => (
                <div
                  key={step}
                  style={{
                    flex: 1,
                    height: '4px',
                    background: step <= currentStep ? 'var(--accent)' : 'var(--border)',
                    marginRight: step < 5 ? '0.5rem' : '0',
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
              <span>Analysis</span>
              <span>Complete</span>
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
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

          {/* Step 4: AI Analysis */}
          {currentStep === 4 && (
            <div style={{
              animation: 'fadeIn 0.3s ease',
              animationFillMode: 'forwards',
              textAlign: 'center',
              padding: '3rem 1rem',
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '80px',
                height: '80px',
                background: 'var(--bg-secondary)',
                borderRadius: '50%',
                marginBottom: '1.5rem',
                animation: 'spin 2s linear infinite',
              }}>
                <Sparkles size={40} color="var(--accent)" />
              </div>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: '700',
                marginBottom: '0.5rem',
              }}>
                AI Analyzing Your Project
              </h1>
              <p style={{
                fontSize: '1rem',
                opacity: 0.7,
                marginBottom: '1rem',
              }}>
                Creating initial estimates and analyzing project requirements...
              </p>
              <div style={{
                fontSize: '0.875rem',
                opacity: 0.6,
              }}>
                This may take a few moments
              </div>
            </div>
          )}

          {/* Step 5: Success */}
          {currentStep === 5 && (
            <div style={{
              animation: 'fadeIn 0.3s ease',
              animationFillMode: 'forwards',
              textAlign: 'center',
              padding: '3rem 1rem',
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '80px',
                height: '80px',
                background: 'var(--bg-secondary)',
                borderRadius: '50%',
                marginBottom: '1.5rem',
              }}>
                <CheckCircle size={40} color="var(--accent)" />
              </div>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: '700',
                marginBottom: '0.5rem',
              }}>
                Project Created Successfully
              </h1>
              <p style={{
                fontSize: '1rem',
                opacity: 0.7,
                marginBottom: '2rem',
              }}>
                Redirecting to your project dashboard...
              </p>
            </div>
          )}

          {/* Navigation Buttons */}
          {currentStep < 5 && (
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
                {currentStep === 4 ? 'Create Project' : 'Next'}
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

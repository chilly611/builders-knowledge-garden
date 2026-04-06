'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

// Type definitions
interface Dream {
  id: string;
  name: string;
  description: string;
  stage: 'seed' | 'sprout' | 'bloom' | 'harvest';
  createdAt: Date;
  ingredients: string[];
  visionStatement: string;
  timeSpent: number; // hours
}

interface Project {
  id: string;
  name: string;
  description: string;
  stage: 'design' | 'build' | 'complete';
  createdAt: Date;
  designStartDate?: Date;
  buildStartDate?: Date;
  completionDate?: Date;
  completionPercentage: number;
  keyMilestones: string[];
  dailyOverhead: number;
  timeSpent: number; // hours
}

interface DreamProjectLink {
  id: string;
  dreamId: string;
  projectId: string;
  linkedAt: Date;
  matchPercentage: number;
}

interface TimelineEvent {
  id: string;
  type: 'dream_created' | 'dream_progressed' | 'project_created' | 'project_milestone' | 'linked';
  title: string;
  date: Date;
  description: string;
  relatedTo: 'dream' | 'project';
  entityId: string;
}

interface SearchResult {
  id: string;
  name: string;
  type: 'dream' | 'project';
}

const stageColors = {
  seed: '#D85A30',
  sprout: '#7F77DD',
  bloom: '#378ADD',
  harvest: '#1D9E75',
  design: '#D85A30',
  build: '#378ADD',
  complete: '#1D9E75',
};

const stageLabels = {
  seed: '🌱 Seed',
  sprout: '🌿 Sprout',
  bloom: '🌸 Bloom',
  harvest: '🌾 Harvest',
  design: 'Design',
  build: 'Build',
  complete: 'Complete',
};

const BuildToDreamLinkage: React.FC = () => {
  // State management
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [links, setLinks] = useState<DreamProjectLink[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<'pipeline' | 'timeline' | 'comparison' | 'search'>('pipeline');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [linkingMode, setLinkingMode] = useState<{ type: 'dream' | 'project'; entityId: string } | null>(null);
  const [showMakeRealModal, setShowMakeRealModal] = useState<boolean>(false);
  const [showContinueModal, setShowContinueModal] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Generate mock dreams
  const generateMockDreams = (): Dream[] => {
    return [
      {
        id: 'dream-1',
        name: 'Urban Community Garden',
        description: 'Transform vacant lot into thriving community garden with native plants',
        stage: 'harvest',
        createdAt: new Date('2024-08-15'),
        ingredients: ['community', 'sustainability', 'public space', 'green building'],
        visionStatement: 'A shared green space bringing neighbors together',
        timeSpent: 120,
      },
      {
        id: 'dream-2',
        name: 'Smart Office Building',
        description: 'Design energy-efficient office tower with IoT integration',
        stage: 'bloom',
        createdAt: new Date('2024-10-01'),
        ingredients: ['technology', 'sustainability', 'commercial', 'innovation'],
        visionStatement: 'Workplace of the future powered by intelligent systems',
        timeSpent: 85,
      },
      {
        id: 'dream-3',
        name: 'Affordable Housing Initiative',
        description: 'Create mixed-income residential community',
        stage: 'sprout',
        createdAt: new Date('2024-12-10'),
        ingredients: ['social impact', 'housing', 'community', 'equity'],
        visionStatement: 'Homes for all income levels in walkable neighborhoods',
        timeSpent: 32,
      },
      {
        id: 'dream-4',
        name: 'Wellness Center Expansion',
        description: 'Multi-use facility combining fitness, health, and community services',
        stage: 'seed',
        createdAt: new Date('2025-03-20'),
        ingredients: ['health', 'wellness', 'community', 'fitness'],
        visionStatement: 'Holistic wellness hub for neighborhood',
        timeSpent: 8,
      },
    ];
  };

  // Generate mock projects
  const generateMockProjects = (): Project[] => {
    return [
      {
        id: 'proj-1',
        name: 'Community Garden Phase 1',
        description: 'Site preparation and initial plantings for urban garden',
        stage: 'complete',
        createdAt: new Date('2024-09-01'),
        designStartDate: new Date('2024-09-01'),
        buildStartDate: new Date('2024-10-15'),
        completionDate: new Date('2025-02-28'),
        completionPercentage: 100,
        keyMilestones: ['Site cleared', 'Soil prepared', 'First plantings', 'Community event held'],
        dailyOverhead: 4500,
        timeSpent: 240,
      },
      {
        id: 'proj-2',
        name: 'Smart Building Control Systems',
        description: 'Install and configure IoT sensors and building management system',
        stage: 'build',
        createdAt: new Date('2024-11-15'),
        designStartDate: new Date('2024-11-15'),
        buildStartDate: new Date('2025-01-10'),
        completionPercentage: 65,
        keyMilestones: ['Architecture designed', 'Hardware ordered', 'Installation started', 'Testing phase'],
        dailyOverhead: 6500,
        timeSpent: 156,
      },
      {
        id: 'proj-3',
        name: 'Residential Complex Foundation',
        description: 'Foundation and structural work for mixed-income housing',
        stage: 'build',
        createdAt: new Date('2025-01-05'),
        designStartDate: new Date('2025-01-05'),
        buildStartDate: new Date('2025-02-10'),
        completionPercentage: 40,
        keyMilestones: ['Plans approved', 'Permits obtained', 'Excavation complete', 'Foundation poured'],
        dailyOverhead: 8000,
        timeSpent: 92,
      },
    ];
  };

  // Generate mock links
  const generateMockLinks = (): DreamProjectLink[] => {
    return [
      {
        id: 'link-1',
        dreamId: 'dream-1',
        projectId: 'proj-1',
        linkedAt: new Date('2024-09-01'),
        matchPercentage: 98,
      },
      {
        id: 'link-2',
        dreamId: 'dream-2',
        projectId: 'proj-2',
        linkedAt: new Date('2024-11-20'),
        matchPercentage: 92,
      },
      {
        id: 'link-3',
        dreamId: 'dream-3',
        projectId: 'proj-3',
        linkedAt: new Date('2025-01-10'),
        matchPercentage: 85,
      },
    ];
  };

  // Generate mock timeline events
  const generateMockTimeline = (dreamsData: Dream[], projectsData: Project[]): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    dreamsData.forEach(dream => {
      events.push({
        id: `event-dream-created-${dream.id}`,
        type: 'dream_created',
        title: `${dream.name} imagined`,
        date: dream.createdAt,
        description: dream.description,
        relatedTo: 'dream',
        entityId: dream.id,
      });
    });

    projectsData.forEach(project => {
      events.push({
        id: `event-proj-created-${project.id}`,
        type: 'project_created',
        title: `${project.name} started`,
        date: project.createdAt,
        description: 'Design phase initiated',
        relatedTo: 'project',
        entityId: project.id,
      });

      if (project.buildStartDate) {
        events.push({
          id: `event-proj-build-${project.id}`,
          type: 'project_milestone',
          title: `${project.name} entered Build phase`,
          date: project.buildStartDate,
          description: 'Construction began',
          relatedTo: 'project',
          entityId: project.id,
        });
      }

      project.keyMilestones.forEach((milestone, idx) => {
        events.push({
          id: `event-milestone-${project.id}-${idx}`,
          type: 'project_milestone',
          title: `${project.name}: ${milestone}`,
          date: new Date(project.buildStartDate!.getTime() + (idx + 1) * 30 * 24 * 60 * 60 * 1000),
          description: `Milestone completed in ${project.name}`,
          relatedTo: 'project',
          entityId: project.id,
        });
      });
    });

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  // Initialize data
  useEffect(() => {
    setIsLoading(true);
    const dreamsData = generateMockDreams();
    const projectsData = generateMockProjects();
    const linksData = generateMockLinks();
    const timelineData = generateMockTimeline(dreamsData, projectsData);

    setDreams(dreamsData);
    setProjects(projectsData);
    setLinks(linksData);
    setTimelineEvents(timelineData);
    setIsLoading(false);
  }, []);

  // Get linked dreams for a project
  const getLinkedDreams = (projectId: string): Dream[] => {
    const dreamIds = links.filter(l => l.projectId === projectId).map(l => l.dreamId);
    return dreams.filter(d => dreamIds.includes(d.id));
  };

  // Get linked projects for a dream
  const getLinkedProjects = (dreamId: string): Project[] => {
    const projectIds = links.filter(l => l.dreamId === dreamId).map(l => l.projectId);
    return projects.filter(p => projectIds.includes(p.id));
  };

  // Calculate match percentage
  const calculateMatch = (dream: Dream, project: Project): number => {
    let match = 50; // Base match

    const dreamIngredients = dream.ingredients.map(i => i.toLowerCase());
    const projectName = project.name.toLowerCase();
    const projectDescription = project.description.toLowerCase();

    dreamIngredients.forEach(ingredient => {
      if (projectName.includes(ingredient) || projectDescription.includes(ingredient)) {
        match += 12;
      }
    });

    return Math.min(100, match);
  };

  // Search handler
  useEffect(() => {
    if (searchQuery.length === 0) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    dreams.forEach(dream => {
      if (dream.name.toLowerCase().includes(query) || dream.description.toLowerCase().includes(query)) {
        results.push({ id: dream.id, name: dream.name, type: 'dream' });
      }
    });

    projects.forEach(project => {
      if (project.name.toLowerCase().includes(query) || project.description.toLowerCase().includes(query)) {
        results.push({ id: project.id, name: project.name, type: 'project' });
      }
    });

    setSearchResults(results);
  }, [searchQuery, dreams, projects]);

  // Handle linking
  const handleLink = (entity: SearchResult) => {
    if (!linkingMode) return;

    const newLink: DreamProjectLink = {
      id: `link-${Date.now()}`,
      dreamId: linkingMode.type === 'dream' ? linkingMode.entityId : entity.id,
      projectId: linkingMode.type === 'project' ? linkingMode.entityId : entity.id,
      linkedAt: new Date(),
      matchPercentage: calculateMatch(
        dreams.find(d => d.id === (linkingMode.type === 'dream' ? linkingMode.entityId : entity.id))!,
        projects.find(p => p.id === (linkingMode.type === 'project' ? linkingMode.entityId : entity.id))!
      ),
    };

    setLinks([...links, newLink]);
    setLinkingMode(null);
    setSearchQuery('');
  };

  // Handle unlinking
  const handleUnlink = (linkId: string) => {
    setLinks(links.filter(l => l.id !== linkId));
  };

  // Render pipeline view
  const renderPipelineView = () => {
    const dream = selectedDream;
    if (!dream) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999', fontFamily: 'Archivo' }}>
          Select a dream to view its pipeline
        </div>
      );
    }

    const linkedProjects = getLinkedProjects(dream.id);

    return (
      <div style={{ display: 'grid', gap: '32px' }}>
        {/* Origin Dream Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            backgroundColor: `${stageColors[dream.stage]}20`,
            border: `2px solid ${stageColors[dream.stage]}`,
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
            <div>
              <div
                style={{
                  display: 'inline-block',
                  backgroundColor: stageColors[dream.stage],
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  fontFamily: 'Archivo',
                  marginBottom: '8px',
                }}
              >
                {stageLabels[dream.stage]}
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 8px 0', fontFamily: 'Archivo Black' }}>
                Origin: {dream.name}
              </h3>
              <p style={{ fontSize: '14px', color: '#666', margin: 0, fontFamily: 'Archivo' }}>
                {dream.description}
              </p>
            </div>
            <button
              onClick={() => setShowMakeRealModal(true)}
              style={{
                backgroundColor: '#1D9E75',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                fontFamily: 'Archivo',
                cursor: 'pointer',
              }}
            >
              Make Real
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginTop: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#666', fontFamily: 'Archivo', marginBottom: '4px' }}>
                Time Invested
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', fontFamily: 'Archivo Black' }}>
                {dream.timeSpent}h
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#666', fontFamily: 'Archivo', marginBottom: '4px' }}>
                Created
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'Archivo' }}>
                {dream.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#666', fontFamily: 'Archivo', marginBottom: '4px' }}>
                Vision
              </div>
              <div style={{ fontSize: '13px', color: '#333', fontFamily: 'Archivo' }}>
                "{dream.visionStatement}"
              </div>
            </div>
          </div>

          {dream.ingredients.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '11px', color: '#666', fontFamily: 'Archivo', marginBottom: '8px', fontWeight: 'bold' }}>
                Key Ingredients
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {dream.ingredients.map((ing, idx) => (
                  <span
                    key={idx}
                    style={{
                      backgroundColor: '#ffffff',
                      border: `1px solid ${stageColors[dream.stage]}`,
                      color: stageColors[dream.stage],
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontFamily: 'Archivo',
                    }}
                  >
                    {ing}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Pipeline Visualization */}
        <div style={{ display: 'grid', gap: '16px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'Archivo Black', margin: 0 }}>
            Derived Projects ({linkedProjects.length})
          </h4>

          {linkedProjects.length === 0 ? (
            <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', textAlign: 'center', color: '#999', fontFamily: 'Archivo' }}>
              No projects yet. Create one to bring this dream to life.
            </div>
          ) : (
            linkedProjects.map((project, idx) => {
              const link = links.find(l => l.projectId === project.id && l.dreamId === dream.id);
              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  style={{
                    backgroundColor: `${stageColors[project.stage]}20`,
                    border: `2px solid ${stageColors[project.stage]}`,
                    borderRadius: '12px',
                    padding: '20px',
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px' }}>
                    <div>
                      <div
                        style={{
                          display: 'inline-block',
                          backgroundColor: stageColors[project.stage],
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          fontFamily: 'Archivo',
                          marginBottom: '8px',
                        }}
                      >
                        {stageLabels[project.stage]}
                      </div>
                      <h5 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 8px 0', fontFamily: 'Archivo Black' }}>
                        {project.name}
                      </h5>
                      <p style={{ fontSize: '13px', color: '#666', margin: '0 0 12px 0', fontFamily: 'Archivo' }}>
                        {project.description}
                      </p>

                      {/* Progress bar */}
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px', fontFamily: 'Archivo' }}>
                          Progress: {project.completionPercentage}%
                        </div>
                        <div
                          style={{
                            width: '100%',
                            height: '8px',
                            backgroundColor: '#e0e0e0',
                            borderRadius: '4px',
                            overflow: 'hidden',
                          }}
                        >
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${project.completionPercentage}%` }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            style={{
                              height: '100%',
                              backgroundColor: stageColors[project.stage],
                            }}
                          />
                        </div>
                      </div>

                      {/* Timeline */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '11px', fontFamily: 'Archivo' }}>
                        <div>
                          <div style={{ color: '#999' }}>Design Started</div>
                          <div style={{ fontWeight: 'bold' }}>
                            {project.designStartDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#999' }}>Build Started</div>
                          <div style={{ fontWeight: 'bold' }}>
                            {project.buildStartDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#999' }}>Completed</div>
                          <div style={{ fontWeight: 'bold' }}>
                            {project.completionDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || 'In Progress'}
                          </div>
                        </div>
                      </div>

                      {/* Milestones */}
                      {project.keyMilestones.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                          <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px', fontWeight: 'bold' }}>
                            Key Milestones
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {project.keyMilestones.map((milestone, i) => (
                              <span
                                key={i}
                                style={{
                                  backgroundColor: '#ffffff',
                                  border: `1px solid ${stageColors[project.stage]}`,
                                  color: stageColors[project.stage],
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '10px',
                                  fontFamily: 'Archivo',
                                }}
                              >
                                ✓ {milestone}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      {link && (
                        <div style={{ backgroundColor: '#1D9E75', color: 'white', padding: '8px 12px', borderRadius: '6px', textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', fontFamily: 'Archivo' }}>Match Score</div>
                          <div style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'Archivo Black' }}>
                            {link.matchPercentage}%
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => handleUnlink(link?.id || '')}
                        style={{
                          backgroundColor: '#fff5f5',
                          color: '#E8443A',
                          border: '1px solid #E8443A',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          fontFamily: 'Archivo',
                          cursor: 'pointer',
                          marginTop: '8px',
                        }}
                      >
                        Unlink
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // Render timeline view
  const renderTimelineView = () => {
    const sortedEvents = [...timelineEvents].sort((a, b) => b.date.getTime() - a.date.getTime());

    return (
      <div style={{ position: 'relative', paddingLeft: '40px' }}>
        {sortedEvents.map((event, idx) => {
          const entity = event.relatedTo === 'dream'
            ? dreams.find(d => d.id === event.entityId)
            : projects.find(p => p.id === event.entityId);

          if (!entity) return null;

          const color = event.relatedTo === 'dream'
            ? stageColors[(entity as Dream).stage]
            : stageColors[(entity as Project).stage];

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              style={{
                position: 'relative',
                marginBottom: '24px',
                paddingBottom: '24px',
              }}
            >
              {/* Timeline dot */}
              <div
                style={{
                  position: 'absolute',
                  left: '-44px',
                  top: '0px',
                  width: '16px',
                  height: '16px',
                  backgroundColor: color,
                  border: '3px solid white',
                  borderRadius: '50%',
                  boxShadow: '0 0 0 2px ' + color,
                }}
              />

              {/* Timeline connector */}
              {idx < sortedEvents.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    left: '-37px',
                    top: '16px',
                    width: '2px',
                    height: '24px',
                    backgroundColor: '#e0e0e0',
                  }}
                />
              )}

              {/* Event card */}
              <div
                style={{
                  backgroundColor: 'white',
                  border: `2px solid ${color}`,
                  borderRadius: '8px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <div>
                    <div
                      style={{
                        display: 'inline-block',
                        backgroundColor: color,
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        fontFamily: 'Archivo',
                        marginBottom: '6px',
                      }}
                    >
                      {event.relatedTo === 'dream' ? 'Dream' : 'Project'}
                    </div>
                    <h5 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 4px 0', fontFamily: 'Archivo Black' }}>
                      {event.title}
                    </h5>
                    <p style={{ fontSize: '12px', color: '#666', margin: 0, fontFamily: 'Archivo' }}>
                      {event.description}
                    </p>
                  </div>
                  <div style={{ fontSize: '12px', color: '#999', fontFamily: 'Archivo', whiteSpace: 'nowrap' }}>
                    {event.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  // Render comparison view
  const renderComparisonView = () => {
    if (!selectedDream || !selectedProject) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999', fontFamily: 'Archivo' }}>
          Select both a dream and project to compare
        </div>
      );
    }

    const match = calculateMatch(selectedDream, selectedProject);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
        }}
      >
        {/* Dream Side */}
        <div
          style={{
            backgroundColor: `${stageColors[selectedDream.stage]}20`,
            border: `2px solid ${stageColors[selectedDream.stage]}`,
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'Archivo Black', marginBottom: '16px' }}>
            Original Dream
          </h3>

          <div style={{ display: 'grid', gap: '12px', fontSize: '13px', fontFamily: 'Archivo' }}>
            <div>
              <div style={{ color: '#666', marginBottom: '4px' }}>Name</div>
              <div style={{ fontWeight: 'bold' }}>{selectedDream.name}</div>
            </div>

            <div>
              <div style={{ color: '#666', marginBottom: '4px' }}>Vision</div>
              <div>"{selectedDream.visionStatement}"</div>
            </div>

            <div>
              <div style={{ color: '#666', marginBottom: '4px' }}>Description</div>
              <div>{selectedDream.description}</div>
            </div>

            <div>
              <div style={{ color: '#666', marginBottom: '4px' }}>Growth Stage</div>
              <div
                style={{
                  display: 'inline-block',
                  backgroundColor: stageColors[selectedDream.stage],
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                {stageLabels[selectedDream.stage]}
              </div>
            </div>

            <div>
              <div style={{ color: '#666', marginBottom: '4px' }}>Key Ingredients</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {selectedDream.ingredients.map((ing, idx) => (
                  <span
                    key={idx}
                    style={{
                      backgroundColor: '#ffffff',
                      border: `1px solid ${stageColors[selectedDream.stage]}`,
                      color: stageColors[selectedDream.stage],
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                    }}
                  >
                    {ing}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Project Side */}
        <div
          style={{
            backgroundColor: `${stageColors[selectedProject.stage]}20`,
            border: `2px solid ${stageColors[selectedProject.stage]}`,
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'Archivo Black', marginBottom: '16px' }}>
            Current Reality
          </h3>

          <div style={{ display: 'grid', gap: '12px', fontSize: '13px', fontFamily: 'Archivo' }}>
            <div>
              <div style={{ color: '#666', marginBottom: '4px' }}>Name</div>
              <div style={{ fontWeight: 'bold' }}>{selectedProject.name}</div>
            </div>

            <div>
              <div style={{ color: '#666', marginBottom: '4px' }}>Description</div>
              <div>{selectedProject.description}</div>
            </div>

            <div>
              <div style={{ color: '#666', marginBottom: '4px' }}>Build Stage</div>
              <div
                style={{
                  display: 'inline-block',
                  backgroundColor: stageColors[selectedProject.stage],
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                {stageLabels[selectedProject.stage]}
              </div>
            </div>

            <div>
              <div style={{ color: '#666', marginBottom: '4px' }}>Completion</div>
              <div style={{ fontWeight: 'bold' }}>{selectedProject.completionPercentage}%</div>
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: '#e0e0e0',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  marginTop: '4px',
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${selectedProject.completionPercentage}%` }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  style={{
                    height: '100%',
                    backgroundColor: stageColors[selectedProject.stage],
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ color: '#666', marginBottom: '4px' }}>Key Milestones</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {selectedProject.keyMilestones.map((milestone, idx) => (
                  <span
                    key={idx}
                    style={{
                      backgroundColor: '#ffffff',
                      border: `1px solid ${stageColors[selectedProject.stage]}`,
                      color: stageColors[selectedProject.stage],
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                    }}
                  >
                    ✓ {milestone}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Match Score */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            gridColumn: '1 / -1',
            backgroundColor: match > 80 ? '#f0fff4' : match > 60 ? '#fffaf0' : '#fff5f5',
            border: `2px solid ${match > 80 ? '#1D9E75' : match > 60 ? '#D85A30' : '#E8443A'}`,
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px', fontFamily: 'Archivo' }}>
            Dream-to-Project Match Score
          </div>
          <div
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: match > 80 ? '#1D9E75' : match > 60 ? '#D85A30' : '#E8443A',
              fontFamily: 'Archivo Black',
              marginBottom: '12px',
            }}
          >
            {match}%
          </div>
          <div style={{ fontSize: '13px', color: '#666', fontFamily: 'Archivo' }}>
            {match > 80
              ? 'Excellent alignment - dream is being realized very closely'
              : match > 60
              ? 'Good alignment - project reflects dream vision'
              : 'Moderate alignment - project has diverged from dream'}
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // Render search view
  const renderSearchView = () => {
    return (
      <div>
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Search dreams and projects to create connections..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'Archivo',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {searchResults.length > 0 && (
          <div style={{ display: 'grid', gap: '12px' }}>
            {searchResults.map(result => (
              <motion.div
                key={`${result.type}-${result.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  backgroundColor: 'white',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'inline-block',
                      backgroundColor: result.type === 'dream' ? '#D85A30' : '#378ADD',
                      color: 'white',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      fontFamily: 'Archivo',
                      marginBottom: '6px',
                    }}
                  >
                    {result.type === 'dream' ? '✨ Dream' : '🏗️ Project'}
                  </div>
                  <h4 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, fontFamily: 'Archivo Black' }}>
                    {result.name}
                  </h4>
                </div>
                <button
                  onClick={() => {
                    setLinkingMode({ type: result.type, entityId: result.id });
                    setSearchQuery('');
                  }}
                  style={{
                    backgroundColor: '#1D9E75',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    fontFamily: 'Archivo',
                    cursor: 'pointer',
                  }}
                >
                  Link
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {linkingMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              backgroundColor: '#f0fff4',
              border: '2px solid #1D9E75',
              borderRadius: '8px',
              padding: '16px',
              marginTop: '20px',
              textAlign: 'center',
              fontFamily: 'Archivo',
            }}
          >
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
              Search for a {linkingMode.type === 'dream' ? 'project' : 'dream'} to link with this{' '}
              {linkingMode.type === 'dream' ? 'dream' : 'project'}
            </div>
            <button
              onClick={() => setLinkingMode(null)}
              style={{
                backgroundColor: '#fff5f5',
                color: '#E8443A',
                border: '1px solid #E8443A',
                padding: '6px 16px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                fontFamily: 'Archivo',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px', fontFamily: 'Archivo Black', color: '#1D1D1D' }}>
          Dream to Build Lifecycle
        </h1>
        <p style={{ fontSize: '14px', color: '#666', fontFamily: 'Archivo' }}>
          Track how dreams become projects and monitor their evolution
        </p>
      </div>

      {/* View mode selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {(['pipeline', 'timeline', 'comparison', 'search'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            style={{
              padding: '8px 16px',
              backgroundColor: viewMode === mode ? '#1D9E75' : '#e0e0e0',
              color: viewMode === mode ? 'white' : '#333',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 'bold',
              fontFamily: 'Archivo',
              cursor: 'pointer',
              textTransform: 'capitalize',
              transition: 'all 0.2s ease',
            }}
          >
            {mode === 'pipeline' && '🌱'}
            {mode === 'timeline' && '⏱️'}
            {mode === 'comparison' && '⚖️'}
            {mode === 'search' && '🔗'}
            {' '}{mode}
          </button>
        ))}
      </div>

      {/* Dream/Project selectors for pipeline mode */}
      {viewMode === 'pipeline' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#666', fontFamily: 'Archivo', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
              Select Dream
            </label>
            <select
              value={selectedDream?.id || ''}
              onChange={e => {
                const dream = dreams.find(d => d.id === e.target.value);
                setSelectedDream(dream || null);
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid #e0e0e0',
                borderRadius: '6px',
                fontSize: '13px',
                fontFamily: 'Archivo',
                boxSizing: 'border-box',
              }}
            >
              <option value="">Choose a dream...</option>
              {dreams.map(dream => (
                <option key={dream.id} value={dream.id}>
                  {dream.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#666', fontFamily: 'Archivo', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
              Comparison Project (Optional)
            </label>
            <select
              value={selectedProject?.id || ''}
              onChange={e => {
                const project = projects.find(p => p.id === e.target.value);
                setSelectedProject(project || null);
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid #e0e0e0',
                borderRadius: '6px',
                fontSize: '13px',
                fontFamily: 'Archivo',
                boxSizing: 'border-box',
              }}
            >
              <option value="">Choose a project...</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* View content */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999', fontFamily: 'Archivo' }}>
          Loading dreams and projects...
        </div>
      ) : viewMode === 'pipeline' ? (
        renderPipelineView()
      ) : viewMode === 'timeline' ? (
        renderTimelineView()
      ) : viewMode === 'comparison' ? (
        renderComparisonView()
      ) : (
        renderSearchView()
      )}

      {/* Summary stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          marginTop: '32px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '16px',
          borderTop: '1px solid #e0e0e0',
          paddingTop: '24px',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', color: '#666', fontFamily: 'Archivo', marginBottom: '6px' }}>
            Total Dreams
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: 'Archivo Black' }}>
            {dreams.length}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '12px', color: '#666', fontFamily: 'Archivo', marginBottom: '6px' }}>
            Active Projects
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: 'Archivo Black' }}>
            {projects.filter(p => p.stage !== 'complete').length}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '12px', color: '#666', fontFamily: 'Archivo', marginBottom: '6px' }}>
            Dream-Project Links
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: 'Archivo Black' }}>
            {links.length}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '12px', color: '#666', fontFamily: 'Archivo', marginBottom: '6px' }}>
            Avg Match Score
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: 'Archivo Black' }}>
            {links.length > 0
              ? Math.round(links.reduce((sum, l) => sum + l.matchPercentage, 0) / links.length)
              : '-'}
            %
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default BuildToDreamLinkage;

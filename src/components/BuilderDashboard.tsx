'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

// Lazy-loaded components
const WBSEditor = dynamic(() => import('@/components/WBSEditor'), {
  ssr: false,
  loading: () => <DashboardSkeleton />,
});

const GanttTimeline = dynamic(() => import('@/components/GanttTimeline'), {
  ssr: false,
  loading: () => <DashboardSkeleton />,
});

const BudgetModule = dynamic(() => import('@/components/BudgetModule'), {
  ssr: false,
  loading: () => <DashboardSkeleton />,
});

const ResourceManagement = dynamic(() => import('@/components/ResourceManagement'), {
  ssr: false,
  loading: () => <DashboardSkeleton />,
});

const RFITracker = dynamic(() => import('@/components/RFITracker'), {
  ssr: false,
  loading: () => <DashboardSkeleton />,
});

const InspectionCheckpoints = dynamic(() => import('@/components/InspectionCheckpoints'), {
  ssr: false,
  loading: () => <DashboardSkeleton />,
});

const PermitsCompliance = dynamic(() => import('@/components/PermitsCompliance'), {
  ssr: false,
  loading: () => <DashboardSkeleton />,
});

// Types
interface Project {
  id: string;
  name: string;
  status: 'active' | 'planning' | 'completed' | 'on-hold';
  progress: number;
  budget: number;
  spent: number;
  team_size: number;
}

interface ProjectSummary {
  id: string;
  name: string;
  client: string;
  progress: number;
  status: string;
  budget_status: string;
  risk_level: 'low' | 'medium' | 'high';
}

interface Inspection {
  id: string;
  name: string;
  date: string;
  type: string;
  status: 'scheduled' | 'completed' | 'pending';
}

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  user: string;
}

// Brand colors
const COLORS = {
  green: '#1D9E75',
  gold: '#D85A30',
  red: '#E8443A',
  purple: '#7F77DD',
  blue: '#378ADD',
  orange: '#BA7517',
  light_bg: '#FAFAF8',
  border: '#E8E8E6',
  text_dark: '#1A1A1A',
  text_light: '#666666',
};

const STATUS_COLORS: Record<string, string> = {
  active: COLORS.green,
  planning: COLORS.blue,
  completed: COLORS.green,
  'on-hold': COLORS.orange,
  low: COLORS.green,
  medium: COLORS.gold,
  high: COLORS.red,
};

// Skeleton Loading Component
const DashboardSkeleton: React.FC = () => (
  <div style={{ padding: '24px' }}>
    <motion.div
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 2, repeat: Infinity }}
      style={{
        background: COLORS.border,
        height: '300px',
        borderRadius: '8px',
      }}
    />
  </div>
);

// KPI Card Component
const KPICard: React.FC<{
  label: string;
  value: string | number;
  trend?: number;
  unit?: string;
  color?: string;
}> = ({ label, value, trend, unit, color = COLORS.green }) => {
  const isPositive = trend ? trend >= 0 : false;
  const trendColor = isPositive ? COLORS.green : COLORS.red;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background: COLORS.light_bg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '12px',
        padding: '20px',
        flex: 1,
        minWidth: '200px',
      }}
    >
      <div style={{ fontSize: '12px', fontWeight: '600', color: COLORS.text_light, marginBottom: '12px' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
        <div style={{ fontSize: '32px', fontWeight: '700', color: color }}>
          {value}
        </div>
        {unit && (
          <div style={{ fontSize: '13px', color: COLORS.text_light }}>
            {unit}
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div style={{ fontSize: '12px', color: trendColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>{isPositive ? '📈' : '📉'}</span>
          <span>{Math.abs(trend)}% vs last month</span>
        </div>
      )}
    </motion.div>
  );
};

// Quick Action Button Component
const QuickActionButton: React.FC<{
  icon: string;
  label: string;
  onClick: () => void;
  color?: string;
}> = ({ icon, label, onClick, color = COLORS.blue }) => (
  <motion.button
    whileHover={{ scale: 1.05, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 20px',
      background: color,
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontWeight: '600',
      fontSize: '14px',
      cursor: 'pointer',
      fontFamily: 'Archivo, sans-serif',
    }}
  >
    <span style={{ fontSize: '18px' }}>{icon}</span>
    {label}
  </motion.button>
);

// Project Summary Card Component
const ProjectCard: React.FC<{ project: ProjectSummary }> = ({ project }) => {
  const riskColor = STATUS_COLORS[project.risk_level];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
      style={{
        background: COLORS.light_bg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '12px',
        padding: '16px',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: COLORS.text_dark }}>
            {project.name}
          </div>
          <div style={{ fontSize: '12px', color: COLORS.text_light }}>
            {project.client}
          </div>
        </div>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: riskColor,
            opacity: 0.2,
            border: `2px solid ${riskColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '700',
            color: riskColor,
          }}
        >
          {project.risk_level[0].toUpperCase()}
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '12px', color: COLORS.text_light }}>Progress</span>
          <span style={{ fontSize: '12px', fontWeight: '600', color: COLORS.text_dark }}>
            {project.progress}%
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: '4px',
            background: COLORS.border,
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${project.progress}%` }}
            transition={{ duration: 1, delay: 0.2 }}
            style={{
              height: '100%',
              background: `linear-gradient(90deg, ${COLORS.green}, ${COLORS.gold})`,
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div style={{ fontSize: '11px', color: COLORS.text_light }}>
          Status: <span style={{ color: COLORS.text_dark, fontWeight: '600' }}>{project.status}</span>
        </div>
        <div style={{ fontSize: '11px', color: COLORS.text_light }}>
          Budget: <span style={{ color: COLORS.text_dark, fontWeight: '600' }}>{project.budget_status}</span>
        </div>
      </div>
    </motion.div>
  );
};

// Tab Button Component
const TabButton: React.FC<{
  label: string;
  isActive: boolean;
  badge?: number;
  onClick: () => void;
}> = ({ label, isActive, badge, onClick }) => (
  <motion.button
    onClick={onClick}
    style={{
      padding: '12px 16px',
      background: 'transparent',
      border: 'none',
      fontSize: '14px',
      fontWeight: isActive ? '700' : '600',
      color: isActive ? COLORS.text_dark : COLORS.text_light,
      cursor: 'pointer',
      position: 'relative',
      fontFamily: 'Archivo, sans-serif',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}
  >
    {label}
    {badge ? (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: COLORS.red,
          color: 'white',
          fontSize: '11px',
          fontWeight: '700',
        }}
      >
        {badge}
      </span>
    ) : null}
  </motion.button>
);

// Weather Impact Mini Card
const WeatherCard: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.2 }}
    style={{
      background: COLORS.light_bg,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px',
    }}
  >
    <div style={{ fontSize: '12px', fontWeight: '700', color: COLORS.text_dark, marginBottom: '12px' }}>
      ⛅ Weather Impact
    </div>
    <div style={{ fontSize: '13px', color: COLORS.text_dark, marginBottom: '8px' }}>
      72°F, Sunny
    </div>
    <div style={{ fontSize: '12px', color: COLORS.text_light }}>
      ✅ Optimal conditions for outdoor work
    </div>
  </motion.div>
);

// Upcoming Inspections Mini List
const UpcomingInspectionsWidget: React.FC<{ inspections: Inspection[] }> = ({ inspections }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.3 }}
    style={{
      background: COLORS.light_bg,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px',
    }}
  >
    <div style={{ fontSize: '12px', fontWeight: '700', color: COLORS.text_dark, marginBottom: '12px' }}>
      📋 Upcoming Inspections
    </div>
    {inspections.slice(0, 3).map((inspection, idx) => (
      <motion.div
        key={inspection.id}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: idx * 0.1 }}
        style={{
          paddingBottom: '8px',
          marginBottom: '8px',
          borderBottom: idx < 2 ? `1px solid ${COLORS.border}` : 'none',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: '600', color: COLORS.text_dark }}>
          {inspection.name}
        </div>
        <div style={{ fontSize: '11px', color: COLORS.text_light }}>
          {inspection.date} • {inspection.type}
        </div>
      </motion.div>
    ))}
  </motion.div>
);

// Recent Activity Feed
const ActivityFeedWidget: React.FC<{ activities: Activity[] }> = ({ activities }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.4 }}
    style={{
      background: COLORS.light_bg,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '12px',
      padding: '16px',
    }}
  >
    <div style={{ fontSize: '12px', fontWeight: '700', color: COLORS.text_dark, marginBottom: '12px' }}>
      📊 Recent Activity
    </div>
    {activities.slice(0, 3).map((activity, idx) => (
      <motion.div
        key={activity.id}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: idx * 0.1 }}
        style={{
          paddingBottom: '8px',
          marginBottom: '8px',
          borderBottom: idx < 2 ? `1px solid ${COLORS.border}` : 'none',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: '600', color: COLORS.text_dark }}>
          {activity.description}
        </div>
        <div style={{ fontSize: '11px', color: COLORS.text_light }}>
          by {activity.user} • {activity.timestamp}
        </div>
      </motion.div>
    ))}
  </motion.div>
);

// Overview Tab Content
const OverviewTab: React.FC<{ projects: ProjectSummary[] }> = ({ projects }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
  >
    <div style={{ marginBottom: '24px' }}>
      <div style={{ fontSize: '14px', fontWeight: '700', color: COLORS.text_dark, marginBottom: '16px' }}>
        Active Projects
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>

    <div style={{ marginBottom: '24px' }}>
      <div style={{ fontSize: '14px', fontWeight: '700', color: COLORS.text_dark, marginBottom: '16px' }}>
        Budget Snapshot
      </div>
      <motion.svg
        viewBox="0 0 400 200"
        style={{ width: '100%', height: 'auto', maxWidth: '100%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <defs>
          <linearGradient id="budgetGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={COLORS.green} stopOpacity={1} />
            <stop offset="100%" stopColor={COLORS.green} stopOpacity={0.3} />
          </linearGradient>
        </defs>
        {/* Simplified budget chart */}
        <rect x="40" y="80" width="60" height="100" fill={COLORS.green} opacity={0.3} />
        <text x="70" y="200" textAnchor="middle" fontSize="12" fill={COLORS.text_dark}>
          Project A
        </text>
        <rect x="120" y="50" width="60" height="130" fill={COLORS.gold} opacity={0.3} />
        <text x="150" y="200" textAnchor="middle" fontSize="12" fill={COLORS.text_dark}>
          Project B
        </text>
        <rect x="200" y="100" width="60" height="80" fill={COLORS.green} opacity={0.3} />
        <text x="230" y="200" textAnchor="middle" fontSize="12" fill={COLORS.text_dark}>
          Project C
        </text>
        <rect x="280" y="70" width="60" height="110" fill={COLORS.purple} opacity={0.3} />
        <text x="310" y="200" textAnchor="middle" fontSize="12" fill={COLORS.text_dark}>
          Project D
        </text>
      </motion.svg>
    </div>

    <div>
      <div style={{ fontSize: '14px', fontWeight: '700', color: COLORS.text_dark, marginBottom: '16px' }}>
        Timeline Overview
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{
          background: COLORS.light_bg,
          border: `1px solid ${COLORS.border}`,
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <div style={{ fontSize: '12px', color: COLORS.text_light, marginBottom: '16px' }}>
          Next 30 days: 4 major milestones scheduled
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {['Foundation Complete', 'Framing Start', 'MEP Rough-in', 'Drywall Complete'].map((milestone, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px',
                background: 'white',
                borderRadius: '6px',
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: COLORS.green,
                  opacity: 0.3,
                }}
              />
              <span style={{ fontSize: '13px', color: COLORS.text_dark }}>
                {milestone}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  </motion.div>
);

// Empty State Component
const EmptyState: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    style={{
      textAlign: 'center',
      padding: '60px 20px',
      background: COLORS.light_bg,
      borderRadius: '12px',
      border: `2px dashed ${COLORS.border}`,
    }}
  >
    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏗️</div>
    <div style={{ fontSize: '20px', fontWeight: '700', color: COLORS.text_dark, marginBottom: '8px' }}>
      Start Your First Project
    </div>
    <div style={{ fontSize: '14px', color: COLORS.text_light, marginBottom: '24px', maxWidth: '300px', margin: '0 auto' }}>
      Create your first project to unlock powerful tools for planning, budgeting, and team management.
    </div>
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        padding: '12px 28px',
        background: COLORS.green,
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontWeight: '700',
        fontSize: '14px',
        cursor: 'pointer',
        fontFamily: 'Archivo, sans-serif',
      }}
    >
      Create Project
    </motion.button>
  </motion.div>
);

// Main BuilderDashboard Component
export const BuilderDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('Overview');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectSummaries, setProjectSummaries] = useState<ProjectSummary[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('Sarah');

  // Initialize mock data
  useEffect(() => {
    // Mock projects
    setProjects([
      {
        id: '1',
        name: 'Downtown Plaza',
        status: 'active',
        progress: 65,
        budget: 2500000,
        spent: 1625000,
        team_size: 12,
      },
      {
        id: '2',
        name: 'Riverside Residences',
        status: 'active',
        progress: 42,
        budget: 3200000,
        spent: 1344000,
        team_size: 15,
      },
      {
        id: '3',
        name: 'Tech Hub Office',
        status: 'planning',
        progress: 15,
        budget: 1800000,
        spent: 270000,
        team_size: 8,
      },
    ]);

    setProjectSummaries([
      {
        id: '1',
        name: 'Downtown Plaza',
        client: 'Urban Developers Inc',
        progress: 65,
        status: 'On Track',
        budget_status: '65% spent',
        risk_level: 'low',
      },
      {
        id: '2',
        name: 'Riverside Residences',
        client: 'Prestige Homes LLC',
        progress: 42,
        status: 'On Track',
        budget_status: '42% spent',
        risk_level: 'medium',
      },
      {
        id: '3',
        name: 'Tech Hub Office',
        client: 'Innovation Partners',
        progress: 15,
        status: 'Planning',
        budget_status: '15% spent',
        risk_level: 'low',
      },
    ]);

    setInspections([
      {
        id: '1',
        name: 'Foundation Inspection',
        date: 'Apr 8, 2026',
        type: 'Structural',
        status: 'scheduled',
      },
      {
        id: '2',
        name: 'Electrical Inspection',
        date: 'Apr 15, 2026',
        type: 'MEP',
        status: 'scheduled',
      },
      {
        id: '3',
        name: 'Safety Walkthrough',
        date: 'Apr 12, 2026',
        type: 'Safety',
        status: 'scheduled',
      },
      {
        id: '4',
        name: 'Framing Review',
        date: 'Apr 10, 2026',
        type: 'Structural',
        status: 'pending',
      },
    ]);

    setActivities([
      {
        id: '1',
        type: 'update',
        description: 'Budget variance report uploaded',
        timestamp: '2 hours ago',
        user: 'Mike Chen',
      },
      {
        id: '2',
        type: 'milestone',
        description: 'Foundation phase marked complete',
        timestamp: '5 hours ago',
        user: 'Alex Rodriguez',
      },
      {
        id: '3',
        type: 'rfi',
        description: '3 new RFIs submitted for review',
        timestamp: 'Yesterday',
        user: 'Design Team',
      },
      {
        id: '4',
        type: 'approval',
        description: 'Change order #CC-042 approved',
        timestamp: '2 days ago',
        user: 'Jennifer Park',
      },
    ]);
  }, []);

  const tabs = [
    { name: 'Overview', badge: undefined },
    { name: 'WBS', badge: undefined },
    { name: 'Timeline', badge: undefined },
    { name: 'Budget', badge: undefined },
    { name: 'Team', badge: undefined },
    { name: 'RFIs', badge: 3 },
    { name: 'Inspections', badge: 1 },
    { name: 'Permits', badge: undefined },
  ];

  const activeProjectData = selectedProject
    ? projects.find((p) => p.id === selectedProject)
    : projects[0];

  const kpiData = {
    activeProjects: projects.length,
    activeProjectsTrend: 12,
    openRFIs: 8,
    rfIsTrend: 5,
    budgetHealth: 72,
    budgetHealthTrend: 8,
    teamUtilization: 87,
    teamUtilizationTrend: 3,
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Overview':
        return projectSummaries.length > 0 ? (
          <OverviewTab projects={projectSummaries} />
        ) : (
          <EmptyState />
        );
      case 'WBS':
        return selectedProject ? <WBSEditor projectId={selectedProject} /> : <EmptyState />;
      case 'Timeline':
        return selectedProject ? <GanttTimeline projectId={selectedProject} /> : <EmptyState />;
      case 'Budget':
        return <BudgetModule />;
      case 'Team':
        return <ResourceManagement />;
      case 'RFIs':
        return selectedProject ? <RFITracker projectId={selectedProject} /> : <EmptyState />;
      case 'Inspections':
        return selectedProject ? <InspectionCheckpoints projectId={selectedProject} /> : <EmptyState />;
      case 'Permits':
        return <PermitsCompliance />;
      default:
        return <OverviewTab projects={projectSummaries} />;
    }
  };

  return (
    <div
      style={{
        background: 'white',
        minHeight: '100vh',
        fontFamily: 'Archivo, sans-serif',
      }}
    >
      {/* Top Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          background: `linear-gradient(135deg, ${COLORS.green} 0%, ${COLORS.blue} 100%)`,
          color: 'white',
          padding: '24px',
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 4px 0' }}>
                Workflows
              </h1>
              <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>
                Welcome back, {userName} — manage your portfolio
              </p>
            </div>
            <select
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(e.target.value)}
              style={{
                padding: '10px 16px',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'Archivo, sans-serif',
                fontWeight: '600',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
              }}
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {/* KPI Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <KPICard
            label="Active Projects"
            value={kpiData.activeProjects}
            trend={kpiData.activeProjectsTrend}
            color={COLORS.green}
          />
          <KPICard
            label="Open RFIs"
            value={kpiData.openRFIs}
            trend={kpiData.rfIsTrend}
            color={COLORS.blue}
          />
          <KPICard
            label="Budget Health"
            value={`${kpiData.budgetHealth}%`}
            trend={kpiData.budgetHealthTrend}
            color={COLORS.gold}
          />
          <KPICard
            label="Team Utilization"
            value={`${kpiData.teamUtilization}%`}
            trend={kpiData.teamUtilizationTrend}
            color={COLORS.purple}
          />
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '32px',
            flexWrap: 'wrap',
          }}
        >
          <QuickActionButton icon="➕" label="New Project" onClick={() => {}} color={COLORS.green} />
          <QuickActionButton icon="📝" label="Create RFI" onClick={() => {}} color={COLORS.blue} />
          <QuickActionButton icon="📅" label="Schedule Inspection" onClick={() => {}} color={COLORS.purple} />
          <QuickActionButton icon="📊" label="Run Report" onClick={() => {}} color={COLORS.gold} />
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', alignItems: 'start' }}>
          {/* Main Content Area */}
          <div>
            {/* Tabs */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              style={{
                borderBottom: `2px solid ${COLORS.border}`,
                marginBottom: '24px',
                overflowX: 'auto',
                display: 'flex',
              }}
            >
              {tabs.map((tab, idx) => (
                <div key={tab.name} style={{ position: 'relative' }}>
                  <TabButton
                    label={tab.name}
                    isActive={activeTab === tab.name}
                    badge={tab.badge}
                    onClick={() => setActiveTab(tab.name)}
                  />
                  {activeTab === tab.name && (
                    <motion.div
                      layoutId="activeTab"
                      style={{
                        position: 'absolute',
                        bottom: '-2px',
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: COLORS.green,
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </div>
              ))}
            </motion.div>

            {/* Tab Content */}
            <div>{renderTabContent()}</div>
          </div>

          {/* Sidebar Widgets */}
          <div>
            <WeatherCard />
            <UpcomingInspectionsWidget inspections={inspections} />
            <ActivityFeedWidget activities={activities} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuilderDashboard;

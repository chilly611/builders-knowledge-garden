'use client';

import React, { useMemo } from 'react';
import { Trophy, Star, Shield, TrendingUp, Target, Award } from 'lucide-react';

interface ProjectData {
  name: string;
  phase: 'DREAM' | 'DESIGN' | 'PLAN' | 'BUILD' | 'DELIVER' | 'GROW';
  progress: number; // 0-100
  budget_amount: number;
  budget_status: 'on-track' | 'over' | 'ahead';
  risk_level: 'low' | 'medium' | 'high';
}

interface RFIData {
  total: number;
  open: number;
  overdue: number;
}

interface SubmittalData {
  total: number;
  pending: number;
  overdue: number;
}

interface ChangeOrderData {
  total: number;
  pending: number;
  totalCostImpact: number;
}

interface PunchListData {
  total: number;
  open: number;
  critical: number;
}

interface ProjectConfidenceProps {
  project: ProjectData;
  rfis?: RFIData;
  submittals?: SubmittalData;
  changeOrders?: ChangeOrderData;
  punchList?: PunchListData;
}

const phaseOrder = ['DREAM', 'DESIGN', 'PLAN', 'BUILD', 'DELIVER', 'GROW'];
const phaseLabels = {
  DREAM: 'Dream',
  DESIGN: 'Design',
  PLAN: 'Plan',
  BUILD: 'Build',
  DELIVER: 'Deliver',
  GROW: 'Grow',
};

const ProjectConfidence: React.FC<ProjectConfidenceProps> = ({
  project,
  rfis = { total: 0, open: 0, overdue: 0 },
  submittals = { total: 0, pending: 0, overdue: 0 },
  changeOrders = { total: 0, pending: 0, totalCostImpact: 0 },
  punchList = { total: 0, open: 0, critical: 0 },
}) => {
  const scores = useMemo(() => {
    // Budget health (25%)
    let budgetScore = 0;
    if (project.budget_status === 'on-track') {
      budgetScore = 100;
    } else if (project.budget_status === 'over') {
      budgetScore = 30;
    } else if (project.budget_status === 'ahead') {
      budgetScore = 80;
    }

    // Schedule (25%) - based on progress vs phase
    const expectedProgress =
      (phaseOrder.indexOf(project.phase) + 1) / phaseOrder.length * 100;
    const progressGap = Math.max(0, project.progress - (expectedProgress * 0.8));
    let scheduleScore = Math.min(100, progressGap * 1.5);
    if (project.progress < expectedProgress * 0.8) {
      scheduleScore = Math.max(20, project.progress * 0.8);
    }

    // RFI health (15%)
    const rfiScore =
      rfis.total === 0
        ? 100
        : Math.max(
            20,
            100 -
              (rfis.open / rfis.total) * 50 -
              (rfis.overdue / rfis.total) * 40
          );

    // Submittal health (15%)
    const submittalScore =
      submittals.total === 0
        ? 100
        : Math.max(
            20,
            100 -
              (submittals.pending / submittals.total) * 40 -
              (submittals.overdue / submittals.total) * 50
          );

    // Risk level (10%)
    let riskScore = 0;
    if (project.risk_level === 'low') {
      riskScore = 100;
    } else if (project.risk_level === 'medium') {
      riskScore = 60;
    } else {
      riskScore = 20;
    }

    // Punch list (10%)
    const punchScore =
      punchList.total === 0
        ? 100
        : Math.max(
            20,
            100 -
              (punchList.open / punchList.total) * 40 -
              (punchList.critical / punchList.total) * 50
          );

    const overallScore =
      (budgetScore * 0.25 +
        scheduleScore * 0.25 +
        rfiScore * 0.15 +
        submittalScore * 0.15 +
        riskScore * 0.1 +
        punchScore * 0.1) /
      1;

    return {
      overall: Math.round(overallScore),
      budget: Math.round(budgetScore),
      schedule: Math.round(scheduleScore),
      rfi: Math.round(rfiScore),
      submittal: Math.round(submittalScore),
      risk: Math.round(riskScore),
      punch: Math.round(punchScore),
    };
  }, [project, rfis, submittals, punchList]);

  const getConfidenceColor = (score: number): string => {
    if (score >= 70) return '#22c55e';
    if (score >= 40) return '#eab308';
    return '#ef4444';
  };

  const achievements = useMemo(() => {
    const badges = [];

    if (project.budget_status === 'on-track') {
      badges.push({
        icon: Trophy,
        label: 'Budget Master',
        color: '#eab308',
      });
    }

    if (rfis.overdue === 0 && rfis.open === 0) {
      badges.push({
        icon: Star,
        label: 'Zero RFI Backlog',
        color: '#06b6d4',
      });
    }

    const expectedProgress =
      (phaseOrder.indexOf(project.phase) + 1) / phaseOrder.length * 100;
    if (Math.abs(project.progress - expectedProgress) <= 10) {
      badges.push({
        icon: TrendingUp,
        label: 'On Schedule',
        color: '#22c55e',
      });
    }

    return badges;
  }, [project, rfis]);

  return (
    <div
      style={
        {
          '--bg': '#ffffff',
          '--fg': '#1f2937',
          '--border': '#e5e7eb',
          '--accent': '#3b82f6',
        } as React.CSSProperties
      }
      className="flex flex-col gap-8 p-6 bg-white rounded-lg border border-gray-200"
    >
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
          <p className="text-sm text-gray-600 mt-1">Project Confidence Dashboard</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-40 h-40 mb-6">
            <svg className="w-full h-full" viewBox="0 0 160 160">
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke={getConfidenceColor(scores.overall)}
                strokeWidth="8"
                strokeDasharray={`${(scores.overall / 100) * 440} 440`}
                strokeLinecap="round"
                style={{
                  transform: 'rotate(-90deg)',
                  transformOrigin: '80px 80px',
                  animation: 'fillRing 1s ease-out forwards',
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold text-gray-900">
                {scores.overall}
              </div>
              <div className="text-xs text-gray-600">Confidence</div>
            </div>
          </div>

          <style>{`
            @keyframes fillRing {
              from {
                stroke-dasharray: 0 440;
              }
            }
          `}</style>
        </div>

        <div className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Factor Breakdown
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <FactorRing
              label="Budget"
              score={scores.budget}
              icon={<Trophy className="w-4 h-4" />}
            />
            <FactorRing
              label="Schedule"
              score={scores.schedule}
              icon={<Target className="w-4 h-4" />}
            />
            <FactorRing
              label="RFIs"
              score={scores.rfi}
              icon={<Shield className="w-4 h-4" />}
            />
            <FactorRing
              label="Submittals"
              score={scores.submittal}
              icon={<Award className="w-4 h-4" />}
            />
            <FactorRing
              label="Risk"
              score={scores.risk}
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <FactorRing
              label="Punch List"
              score={scores.punch}
              icon={<Star className="w-4 h-4" />}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Project Phase Journey
        </h3>
        <div className="flex gap-2 items-center">
          {phaseOrder.map((phase, idx) => (
            <React.Fragment key={phase}>
              <div
                className={`flex-1 h-10 rounded-lg flex items-center justify-center text-xs font-semibold transition-all ${
                  phase === project.phase
                    ? 'bg-blue-500 text-white scale-110 shadow-lg'
                    : phaseOrder.indexOf(project.phase) > idx
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                }`}
              >
                {phaseLabels[phase as keyof typeof phaseLabels]}
              </div>
              {idx < phaseOrder.length - 1 && (
                <div className="text-gray-400 text-xl leading-none">→</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {achievements.length > 0 && (
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Achievements Unlocked
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {achievements.map((badge, idx) => {
              const IconComponent = badge.icon;
              return (
                <div
                  key={idx}
                  className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div style={{ color: badge.color }}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-gray-900 text-center">
                    {badge.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 border-t border-gray-200 pt-6">
        <StatCard
          label="Total RFIs"
          value={rfis.total}
          subtext={`${rfis.open} open, ${rfis.overdue} overdue`}
        />
        <StatCard
          label="Total Submittals"
          value={submittals.total}
          subtext={`${submittals.pending} pending, ${submittals.overdue} overdue`}
        />
        <StatCard
          label="Change Orders"
          value={changeOrders.total}
          subtext={`${changeOrders.pending} pending`}
        />
        <StatCard
          label="Punch List Items"
          value={punchList.total}
          subtext={`${punchList.open} open, ${punchList.critical} critical`}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 border-t border-gray-200 pt-6">
        <InfoCard label="Phase" value={project.phase} />
        <InfoCard label="Progress" value={`${project.progress}%`} />
        <InfoCard
          label="Risk Level"
          value={project.risk_level.charAt(0).toUpperCase() + project.risk_level.slice(1)}
        />
        <InfoCard label="Budget Status" value={project.budget_status} />
        <InfoCard
          label="Budget Amount"
          value={`$${(project.budget_amount / 1000000).toFixed(1)}M`}
        />
      </div>
    </div>
  );
};

interface FactorRingProps {
  label: string;
  score: number;
  icon: React.ReactNode;
}

const FactorRing: React.FC<FactorRingProps> = ({ label, score, icon }) => {
  const color =
    score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24 mb-2">
        <svg className="w-full h-full" viewBox="0 0 96 96">
          <circle
            cx="48"
            cy="48"
            r="42"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="6"
          />
          <circle
            cx="48"
            cy="48"
            r="42"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={`${(score / 100) * 264} 264`}
            strokeLinecap="round"
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '48px 48px',
              animation: 'fillRing 1s ease-out forwards',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div style={{ color }} className="text-lg font-bold">
            {score}
          </div>
          <div style={{ color }} className="text-xs">
            {icon}
          </div>
        </div>
      </div>
      <div className="text-xs font-semibold text-gray-700 text-center">
        {label}
      </div>
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: number;
  subtext: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subtext }) => {
  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs font-semibold text-gray-600 mt-1">{label}</div>
      <div className="text-xs text-gray-500 mt-2">{subtext}</div>
    </div>
  );
};

interface InfoCardProps {
  label: string;
  value: string;
}

const InfoCard: React.FC<InfoCardProps> = ({ label, value }) => {
  return (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="text-xs font-semibold text-gray-600">{label}</div>
      <div className="text-sm font-bold text-gray-900 mt-1">{value}</div>
    </div>
  );
};

export default ProjectConfidence;

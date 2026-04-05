'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Scale,
  Calendar,
  Package,
  Users,
  FileCheck,
  DollarSign,
  ArrowLeft,
  Settings,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

/* ─── Types ─── */
type TabId = 'overview' | 'codes' | 'schedule' | 'materials' | 'team' | 'permits' | 'estimate';
type ProjectPhase = 'DREAM' | 'DESIGN' | 'PLAN' | 'BUILD' | 'DELIVER' | 'GROW';

interface Project {
  id: string;
  name: string;
  phase: ProjectPhase;
  progress: number;
  budget_amount: number;
  buildingType?: string;
  jurisdiction?: string;
  location: string;
  totalSqFt?: number;
  created_at: string;
  updated_at: string;
}

interface AIAttentionItem {
  id: string;
  title: string;
  body: string;
  urgency: 'red' | 'yellow' | 'green';
}

interface Milestone {
  id: string;
  name: string;
  date: string;
  status: 'not_started' | 'in_progress' | 'completed';
}

interface TeamMember {
  id: string;
  name: string;
  trade: string;
  status: 'active' | 'inactive';
  contact: string;
}

interface Permit {
  id: string;
  name: string;
  status: 'not_started' | 'in_progress' | 'approved';
  deadline?: string;
}

interface EstimateData {
  total_cost: number;
  cost_per_sqft: number;
  contingency_percent: number;
  market_rate_estimate: number;
  divisions: Array<{
    code: string;
    name: string;
    estimated_qty: number;
    unit: string;
    cost: number;
  }>;
}

interface CSIDivision {
  code: string;
  name: string;
  estimated_qty: number;
  unit: string;
  cost: number;
}

/* ─── Constants ─── */
const PHASE_COLORS: Record<ProjectPhase, string> = {
  DREAM: '#D85A30',
  DESIGN: '#7F77DD',
  PLAN: '#1D9E75',
  BUILD: '#378ADD',
  DELIVER: '#BA7517',
  GROW: '#639922',
};

const TABS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { id: 'codes', label: 'Codes', icon: <Scale size={18} /> },
  { id: 'schedule', label: 'Schedule', icon: <Calendar size={18} /> },
  { id: 'materials', label: 'Materials', icon: <Package size={18} /> },
  { id: 'team', label: 'Team', icon: <Users size={18} /> },
  { id: 'permits', label: 'Permits', icon: <FileCheck size={18} /> },
  { id: 'estimate', label: 'Estimate', icon: <DollarSign size={18} /> },
];

const MOCK_MILESTONES: Milestone[] = [
  { id: '1', name: 'Permit Approval', date: '2026-05-15', status: 'in_progress' },
  { id: '2', name: 'Foundation Complete', date: '2026-07-01', status: 'not_started' },
  { id: '3', name: 'Framing', date: '2026-08-15', status: 'not_started' },
  { id: '4', name: 'MEP Rough-In', date: '2026-09-01', status: 'not_started' },
  { id: '5', name: 'Drywall & Finish', date: '2026-10-15', status: 'not_started' },
];

const MOCK_TEAM: TeamMember[] = [
  { id: '1', name: 'John Doe', trade: 'General Contractor', status: 'active', contact: 'john@example.com' },
  { id: '2', name: 'Jane Smith', trade: 'Electrician', status: 'active', contact: 'jane@example.com' },
  { id: '3', name: 'Mike Johnson', trade: 'Plumber', status: 'active', contact: 'mike@example.com' },
  { id: '4', name: 'Sarah Brown', trade: 'HVAC', status: 'inactive', contact: 'sarah@example.com' },
];

const MOCK_PERMITS: Permit[] = [
  { id: '1', name: 'Building Permit', status: 'in_progress', deadline: '2026-05-15' },
  { id: '2', name: 'Electrical Permit', status: 'not_started', deadline: '2026-06-01' },
  { id: '3', name: 'Plumbing Permit', status: 'not_started', deadline: '2026-06-01' },
  { id: '4', name: 'HVAC Permit', status: 'not_started', deadline: '2026-06-15' },
];

const CSI_DIVISIONS: Array<{
  code: string;
  name: string;
  estimated_qty: number;
  unit: string;
}> = [
  { code: '01', name: 'General Requirements', estimated_qty: 1, unit: 'lot' },
  { code: '02', name: 'Existing Conditions', estimated_qty: 1, unit: 'lot' },
  { code: '03', name: 'Concrete', estimated_qty: 125, unit: 'cy' },
  { code: '04', name: 'Masonry', estimated_qty: 8500, unit: 'sf' },
  { code: '05', name: 'Metals', estimated_qty: 2000, unit: 'lb' },
  { code: '06', name: 'Wood/Plastics', estimated_qty: 15000, unit: 'bf' },
  { code: '07', name: 'Thermal/Moisture', estimated_qty: 8500, unit: 'sf' },
  { code: '08', name: 'Openings', estimated_qty: 45, unit: 'ea' },
  { code: '09', name: 'Finishes', estimated_qty: 8500, unit: 'sf' },
  { code: '10', name: 'Specialties', estimated_qty: 1, unit: 'lot' },
  { code: '11', name: 'Equipment', estimated_qty: 1, unit: 'lot' },
  { code: '12', name: 'Furnishings', estimated_qty: 1, unit: 'lot' },
  { code: '13', name: 'Special Construction', estimated_qty: 1, unit: 'lot' },
  { code: '14', name: 'Conveying', estimated_qty: 1, unit: 'lot' },
  { code: '21', name: 'Fire Suppression', estimated_qty: 1, unit: 'lot' },
  { code: '22', name: 'Plumbing', estimated_qty: 1, unit: 'lot' },
];

/* ─── Loading Skeleton ─── */
function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-8 w-32 rounded bg-slate-200 animate-pulse" />
      <div className="space-y-3">
        <div className="h-6 w-full rounded bg-slate-200 animate-pulse" />
        <div className="h-6 w-5/6 rounded bg-slate-200 animate-pulse" />
        <div className="h-6 w-4/5 rounded bg-slate-200 animate-pulse" />
      </div>
    </div>
  );
}

/* ─── Tab Content Components ─── */

function OverviewTab({ project, milestones, aiItems }: { project: Project; milestones: Milestone[]; aiItems: AIAttentionItem[] }) {
  const completionPercent = project.progress || 0;
  const budgetHealth = completionPercent > 80 ? 'on-track' : completionPercent > 50 ? 'caution' : 'warning';
  // Confidence based on how much data we have
  const hasEstimate = (project as any).budget_amount > 0;
  const hasMilestones = milestones.length > 0;
  const baseConfidence = 40 + (hasEstimate ? 25 : 0) + (hasMilestones ? 20 : 0) + Math.min(completionPercent * 0.15, 15);
  const confidenceScore = Math.min(Math.round(baseConfidence), 99);
  const daysRemaining = 187;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 p-6">
      {/* Project Header */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[var(--fg)]">{project.name}</h2>
            <p className="mt-1 text-sm text-gray-600">{project.location}</p>
          </div>
          <div
            className="rounded-full px-4 py-2 text-white font-semibold text-sm"
            style={{ backgroundColor: PHASE_COLORS[project.phase] }}
          >
            {project.phase}
          </div>
        </div>
        <div className="mt-6 h-3 w-full rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full bg-[var(--accent)]"
            style={{ width: `${completionPercent}%`, transition: 'width 0.3s ease' }}
          />
        </div>
        <p className="mt-2 text-sm text-gray-600">{completionPercent}% Complete</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-[var(--border)] p-4 bg-[var(--bg)]">
          <p className="text-sm font-medium text-gray-600">Budget</p>
          <p className="mt-2 text-2xl font-bold text-[var(--fg)]">${(project.budget_amount / 1000).toFixed(0)}K</p>
          <p className="mt-1 text-xs text-gray-500">On Track</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-4 bg-[var(--bg)]">
          <p className="text-sm font-medium text-gray-600">Timeline</p>
          <p className="mt-2 text-2xl font-bold text-[var(--fg)]">{daysRemaining}d</p>
          <p className="mt-1 text-xs text-gray-500">Remaining</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-4 bg-[var(--bg)]">
          <p className="text-sm font-medium text-gray-600">Risk Level</p>
          <p className="mt-2 text-2xl font-bold text-orange-500">45%</p>
          <p className="mt-1 text-xs text-gray-500">Medium</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-4 bg-[var(--bg)]">
          <p className="text-sm font-medium text-gray-600">Confidence</p>
          <p className="mt-2 text-2xl font-bold text-green-600">{confidenceScore}%</p>
          <p className="mt-1 text-xs text-gray-500">High</p>
        </div>
      </div>

      {/* Milestones Timeline */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-6">
        <h3 className="text-lg font-semibold text-[var(--fg)] mb-4">Milestone Timeline</h3>
        <div className="space-y-3">
          {milestones.map((milestone) => (
            <div key={milestone.id} className="flex items-center gap-3">
              {milestone.status === 'completed' && <CheckCircle size={20} className="text-green-600" />}
              {milestone.status === 'in_progress' && <Clock size={20} className="text-blue-600 animate-spin" />}
              {milestone.status === 'not_started' && <div className="w-5 h-5 rounded-full border-2 border-gray-300" />}
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--fg)]">{milestone.name}</p>
                <p className="text-xs text-gray-500">{new Date(milestone.date).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Attention Items */}
      {aiItems.length > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-6">
          <h3 className="text-lg font-semibold text-[var(--fg)] mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-orange-600" />
            AI Attention Items
          </h3>
          <div className="space-y-3">
            {aiItems.map((item) => (
              <div key={item.id} className="rounded border border-orange-200 bg-white p-3">
                <p className="text-sm font-medium text-[var(--fg)]">{item.title}</p>
                <p className="mt-1 text-sm text-gray-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function CodesTab({ project }: { project: Project }) {
  const [codes, setCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCodes() {
      try {
        const query = `What codes apply to ${project.buildingType || 'residential'} in ${project.jurisdiction || 'California'}?`;
        const response = await fetch('/api/v1/copilot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        if (response.ok) {
          const data = await response.json();
          setCodes(Array.isArray(data) ? data : [data.result || '']);
        }
      } catch (error) {
        console.error('Failed to fetch codes:', error);
        setCodes([
          'California Title 24 - Building Energy Efficiency Standards',
          'International Building Code (IBC) 2022',
          'California Plumbing Code (CPC)',
          'California Electrical Code (CEC)',
          'California Mechanical Code (CMC)',
          'ADA Accessibility Guidelines',
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchCodes();
  }, [project.buildingType, project.jurisdiction]);

  if (loading) return <LoadingSkeleton />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-4">
      <h3 className="text-lg font-semibold text-[var(--fg)]">Jurisdiction-Specific Codes</h3>
      <div className="space-y-3">
        {codes.map((code, idx) => (
          <div key={idx} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
            <p className="text-sm font-medium text-[var(--fg)]">{typeof code === 'string' ? code : code}</p>
            <a
              href="#"
              className="mt-2 inline-block text-xs font-medium text-[var(--accent)] hover:underline"
            >
              View Details →
            </a>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ScheduleTab({ milestones }: { milestones: Milestone[] }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-6">
        <h3 className="text-lg font-semibold text-[var(--fg)] mb-4">Gantt Chart (Coming Soon)</h3>
        <div className="h-64 rounded bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center border-2 border-dashed border-slate-300">
          <p className="text-gray-500">GanttChart component will render here</p>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-6">
        <h3 className="text-lg font-semibold text-[var(--fg)] mb-4">Milestone List</h3>
        <div className="space-y-2">
          {milestones.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-3 rounded bg-[var(--bg-secondary)]">
              <div>
                <p className="font-medium text-[var(--fg)]">{m.name}</p>
                <p className="text-sm text-gray-600">{new Date(m.date).toLocaleDateString()}</p>
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 text-blue-700">
                {m.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function MaterialsTab({ divisions }: { divisions: CSIDivision[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-3">
      <h3 className="text-lg font-semibold text-[var(--fg)] mb-4">CSI Division Breakdown</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {divisions.map((div) => (
          <div
            key={div.code}
            onClick={() => setExpanded(expanded === div.code ? null : div.code)}
            className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 hover:bg-[var(--bg-secondary)] transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--fg)]">
                  {div.code} - {div.name}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {div.estimated_qty} {div.unit}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-[var(--accent)]">${(div.cost || 0).toLocaleString()}</p>
              </div>
            </div>
            {expanded === div.code && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 pt-3 border-t border-[var(--border)]">
                <p className="text-sm text-gray-600">Quantity: {div.estimated_qty} {div.unit}</p>
                <p className="text-sm text-gray-600 mt-1">Cost: ${(div.cost || 0).toLocaleString()}</p>
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function TeamTab({ team }: { team: TeamMember[] }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[var(--fg)] mb-4">Team Members</h3>
        <div className="space-y-3">
          {team.map((member) => (
            <div key={member.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[var(--fg)]">{member.name}</p>
                  <p className="text-sm text-gray-600">{member.trade}</p>
                  <p className="text-xs text-gray-500 mt-1">{member.contact}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${
                  member.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-6">
        <h3 className="text-lg font-semibold text-[var(--fg)] mb-4">Trade Assignment Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 px-3 font-semibold text-gray-600">Trade</th>
                <th className="text-center py-2 px-3 font-semibold text-gray-600">Assigned</th>
                <th className="text-center py-2 px-3 font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {team.map((member) => (
                <tr key={member.id} className="border-b border-[var(--border)]">
                  <td className="py-2 px-3">{member.trade}</td>
                  <td className="text-center py-2 px-3">{member.name}</td>
                  <td className="text-center py-2 px-3">
                    <span className="inline-block w-2 h-2 rounded-full" style={{
                      backgroundColor: member.status === 'active' ? '#22c55e' : '#d1d5db'
                    }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

function PermitsTab({ permits }: { permits: Permit[] }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-4">
      <h3 className="text-lg font-semibold text-[var(--fg)] mb-4">Required Permits</h3>
      <div className="space-y-3">
        {permits.map((permit) => (
          <div key={permit.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium text-[var(--fg)]">{permit.name}</p>
                {permit.deadline && (
                  <p className="text-sm text-gray-600 mt-1">
                    Deadline: {new Date(permit.deadline).toLocaleDateString()}
                  </p>
                )}
              </div>
              <span className={`text-xs font-semibold px-3 py-1 rounded whitespace-nowrap ml-4 ${
                permit.status === 'approved'
                  ? 'bg-green-100 text-green-700'
                  : permit.status === 'in_progress'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {permit.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function EstimateTab({ estimate }: { estimate: EstimateData }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">
      {/* Total Estimate */}
      <div className="rounded-lg border border-[var(--accent)] bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
        <p className="text-sm font-medium text-gray-600">Total Project Estimate</p>
        <p className="mt-2 text-4xl font-bold text-[var(--fg)]">${estimate.total_cost.toLocaleString()}</p>
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Cost per Sq Ft</p>
            <p className="mt-1 font-semibold text-[var(--fg)]">${estimate.cost_per_sqft.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-600">Contingency</p>
            <p className="mt-1 font-semibold text-[var(--fg)]">{estimate.contingency_percent}%</p>
          </div>
          <div>
            <p className="text-gray-600">Market Rate</p>
            <p className="mt-1 font-semibold text-[var(--fg)]">${estimate.market_rate_estimate.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* CSI Division Breakdown */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-6">
        <h3 className="text-lg font-semibold text-[var(--fg)] mb-4">CSI Division Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 px-3 font-semibold text-gray-600">Division</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-600">Qty</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-600">Cost</th>
              </tr>
            </thead>
            <tbody>
              {estimate.divisions.map((div) => (
                <tr key={div.code} className="border-b border-[var(--border)] hover:bg-[var(--bg-secondary)]">
                  <td className="py-2 px-3">
                    <p className="font-medium text-[var(--fg)]">{div.code} - {div.name}</p>
                  </td>
                  <td className="text-right py-2 px-3">{div.estimated_qty} {div.unit}</td>
                  <td className="text-right py-2 px-3 font-semibold text-[var(--accent)]">
                    ${div.cost.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main Component ─── */
export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const id = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [aiItems, setAiItems] = useState<AIAttentionItem[]>([]);
  const [budgetLines, setBudgetLines] = useState<any[]>([]);
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [complianceData, setComplianceData] = useState<any>(null);

  useEffect(() => {
    async function fetchProject() {
      try {
        const response = await fetch(`/api/v1/projects?id=${id}`);
        if (!response.ok) throw new Error('Failed to load project');
        const data = await response.json();

        // API returns enriched project with budget_lines, schedule, compliance
        const { budget_lines, schedule, compliance, ...projectData } = data;
        setProject(projectData as Project);
        setBudgetLines(budget_lines || []);
        setScheduleData(schedule || null);
        setComplianceData(compliance || null);

        // Fetch AI analysis (non-blocking)
        fetch(`/api/v1/projects/analyze?id=${id}`)
          .then(async (res) => {
            if (res.ok) {
              const analysisData = await res.json();
              setAiItems(analysisData.items || []);
            }
          })
          .catch(() => {});
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchProject();
  }, [id]);

  if (loading) return <LoadingSkeleton />;
  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg)] p-6">
        <AlertTriangle className="text-red-600 mb-4" size={48} />
        <p className="text-lg font-semibold text-[var(--fg)]">{error || 'Project not found'}</p>
        <Link href="/crm" className="mt-4 text-[var(--accent)] hover:underline">
          ← Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)] px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link
              href="/crm"
              className="inline-flex items-center gap-2 text-[var(--accent)] hover:underline"
            >
              <ArrowLeft size={20} />
              Back to CRM
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--fg)] hover:bg-gray-100 transition">
              <Download size={18} />
              Export Report
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--fg)] hover:bg-gray-100 transition">
              <Settings size={18} />
              Edit
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 transition">
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        </div>

        {/* PM Module Quick Access */}
        <div className="flex gap-2 overflow-x-auto pb-4">
          {['RFI', 'Submittals', 'Change Orders', 'Punch List', 'Budget'].map((label) => (
            <button
              key={label}
              className="whitespace-nowrap px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-sm font-medium text-[var(--fg)] hover:bg-gray-100 transition"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 p-4 sm:gap-6 sm:p-6">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Tab Bar */}
          <div className="sticky top-20 z-30 mb-6 overflow-x-auto border-b border-[var(--border)] bg-[var(--bg)]">
            <div className="flex gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-2.5 sm:gap-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition ${
                    activeTab === tab.id
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-transparent text-gray-600 hover:text-[var(--fg)]'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <OverviewTab
                key="overview"
                project={project}
                milestones={
                  scheduleData?.phases
                    ? scheduleData.phases.flatMap((phase: any) =>
                        (phase.milestones || []).map((m: any, idx: number) => ({
                          id: `${phase.name}-${idx}`,
                          name: m.name,
                          date: project.created_at
                            ? new Date(new Date(project.created_at).getTime() + (m.week || 0) * 7 * 86400000).toISOString().split('T')[0]
                            : '2026-06-01',
                          status: 'not_started' as const,
                        }))
                      ).slice(0, 6)
                    : MOCK_MILESTONES
                }
                aiItems={aiItems}
              />
            )}
            {activeTab === 'codes' && <CodesTab key="codes" project={project} />}
            {activeTab === 'schedule' && (
              <ScheduleTab
                key="schedule"
                milestones={
                  scheduleData?.phases
                    ? scheduleData.phases.flatMap((phase: any) =>
                        (phase.milestones || []).map((m: any, idx: number) => ({
                          id: `${phase.name}-${idx}`,
                          name: m.name,
                          date: project.created_at
                            ? new Date(new Date(project.created_at).getTime() + (m.week || 0) * 7 * 86400000).toISOString().split('T')[0]
                            : '2026-06-01',
                          status: 'not_started' as const,
                        }))
                      )
                    : MOCK_MILESTONES
                }
              />
            )}
            {activeTab === 'materials' && (
              <MaterialsTab
                key="materials"
                divisions={
                  budgetLines.length > 0
                    ? budgetLines.map((bl: any) => ({
                        code: bl.csi_code || bl.code || '00',
                        name: bl.csi_division || bl.name || 'Unknown',
                        estimated_qty: 1,
                        unit: 'lot',
                        cost: bl.amount || 0,
                      }))
                    : CSI_DIVISIONS.map((d) => ({ ...d, cost: 0 }))
                }
              />
            )}
            {activeTab === 'team' && <TeamTab key="team" team={MOCK_TEAM} />}
            {activeTab === 'permits' && (
              <PermitsTab
                key="permits"
                permits={
                  complianceData?.inspection_requirements
                    ? complianceData.inspection_requirements.map((req: string, idx: number) => ({
                        id: String(idx + 1),
                        name: req,
                        status: 'not_started' as const,
                        deadline: undefined,
                      }))
                    : MOCK_PERMITS
                }
              />
            )}
            {activeTab === 'estimate' && (
              <EstimateTab
                key="estimate"
                estimate={
                  budgetLines.length > 0
                    ? {
                        total_cost: budgetLines.reduce((sum: number, bl: any) => sum + (bl.amount || 0), 0),
                        cost_per_sqft: budgetLines.reduce((sum: number, bl: any) => sum + (bl.amount || 0), 0) / (project.totalSqFt || 10000),
                        contingency_percent: 15,
                        market_rate_estimate: budgetLines.reduce((sum: number, bl: any) => sum + (bl.amount || 0), 0) * 1.05,
                        divisions: budgetLines.map((bl: any) => ({
                          code: bl.csi_code || '00',
                          name: bl.csi_division || 'Unknown',
                          estimated_qty: 1,
                          unit: 'lot',
                          cost: bl.amount || 0,
                        })),
                      }
                    : {
                        total_cost: project.budget_amount || 0,
                        cost_per_sqft: (project.budget_amount || 0) / (project.totalSqFt || 10000),
                        contingency_percent: 10,
                        market_rate_estimate: (project.budget_amount || 0) * 1.05,
                        divisions: CSI_DIVISIONS.map((d) => ({ ...d, cost: 0 })),
                      }
                }
              />
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Stats */}
        <div className="hidden lg:block w-64 space-y-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4 sticky top-24">
            <h3 className="text-sm font-semibold text-gray-600 mb-4">Project Health</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-medium text-[var(--fg)]">Days to Completion</p>
                  <p className="text-sm font-bold text-[var(--accent)]">187</p>
                </div>
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full w-3/4 bg-[var(--accent)]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-medium text-[var(--fg)]">Budget Health</p>
                  <p className="text-sm font-bold text-green-600">On Track</p>
                </div>
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full w-4/5 bg-green-600" />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-medium text-[var(--fg)]">Risk Score</p>
                  <p className="text-sm font-bold text-orange-500">45%</p>
                </div>
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full w-5/12 bg-orange-500" />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-medium text-[var(--fg)]">Completion</p>
                  <p className="text-sm font-bold text-blue-600">{project.progress}%</p>
                </div>
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full bg-blue-600" style={{ width: `${project.progress}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

// ============================================================================
// Types & Constants
// ============================================================================

interface ProjectVariables {
  budget: number;
  timeline: number; // weeks
  crewSize: number;
  materialQuality: 'low' | 'standard' | 'premium';
  scopeComplexity: number; // 1-10
}

interface Metrics {
  schedule: number; // weeks
  budgetTotal: number; // dollars
  riskLevel: number; // 0-100
}

interface ImpactChain {
  id: string;
  cause: string;
  effect: string;
  impact: string;
  type: 'budget' | 'schedule' | 'risk';
}

interface Scenario {
  id: string;
  name: string;
  variables: ProjectVariables;
  metrics: Metrics;
  timestamp: number;
}

const BASELINE_VARIABLES: ProjectVariables = {
  budget: 500000,
  timeline: 16,
  crewSize: 8,
  materialQuality: 'standard',
  scopeComplexity: 5,
};

const BRAND_COLORS = {
  green: '#1D9E75',
  gold: '#D85A30',
  red: '#E8443A',
  purple: '#7F77DD',
  blue: '#378ADD',
  orange: '#BA7517',
  lightGray: '#F5F5F5',
  darkGray: '#333333',
};

// ============================================================================
// Calculation Engine
// ============================================================================

const calculateMetrics = (vars: ProjectVariables, baseline: ProjectVariables): Metrics => {
  // Base schedule: timeline weeks (user input) + crew adjustments
  const crewEfficiency = vars.crewSize / baseline.crewSize;
  const scopeImpact = (vars.scopeComplexity / baseline.scopeComplexity) * 1.5;
  const schedule = vars.timeline * (1 / crewEfficiency) * scopeImpact;

  // Budget calculation
  let budgetTotal = vars.budget;
  const laborCost = (vars.crewSize / baseline.crewSize) * (baseline.budget * 0.4);
  const materialMultiplier = {
    low: 0.7,
    standard: 1.0,
    premium: 1.3,
  }[vars.materialQuality];
  const materialCost = (baseline.budget * 0.35) * materialMultiplier;
  const carryingCosts = (schedule / baseline.timeline) * (baseline.budget * 0.15);
  const scopeAdder = ((vars.scopeComplexity - baseline.scopeComplexity) / baseline.scopeComplexity) * (baseline.budget * 0.1);

  budgetTotal = laborCost + materialCost + carryingCosts + scopeAdder;

  // Risk calculation (0-100)
  let riskLevel = 50; // baseline
  // Timeline compression increases risk
  const timelineCompressionRatio = baseline.timeline / schedule;
  riskLevel += (timelineCompressionRatio > 1 ? 15 : -10);
  // Crew size affects coordination risk
  if (vars.crewSize > 12) riskLevel += 15;
  if (vars.crewSize < 4) riskLevel += 20;
  // Material quality
  if (vars.materialQuality === 'low') riskLevel += 15;
  if (vars.materialQuality === 'premium') riskLevel -= 10;
  // Scope complexity
  riskLevel += (vars.scopeComplexity - baseline.scopeComplexity) * 3;
  // Budget constraints
  if (budgetTotal > vars.budget * 1.1) riskLevel += 20;
  if (budgetTotal < vars.budget * 0.9) riskLevel += 10;

  return {
    schedule: Math.max(4, Math.round(schedule * 10) / 10),
    budgetTotal: Math.round(budgetTotal),
    riskLevel: Math.max(0, Math.min(100, Math.round(riskLevel))),
  };
};

// ============================================================================
// Impact Chain Generator
// ============================================================================

const generateImpactChain = (current: ProjectVariables, baseline: ProjectVariables, metrics: Metrics, baselineMetrics: Metrics): ImpactChain[] => {
  const chain: ImpactChain[] = [];
  const changes: Array<{ var: string; delta: number; type: 'budget' | 'schedule' | 'risk' }> = [];

  // Detect changes
  if (current.crewSize !== baseline.crewSize) {
    const delta = current.crewSize - baseline.crewSize;
    changes.push({
      var: `crew by ${Math.abs(delta)}`,
      delta,
      type: delta > 0 ? 'budget' : 'schedule',
    });
  }
  if (current.timeline !== baseline.timeline) {
    changes.push({
      var: `timeline by ${Math.abs(current.timeline - baseline.timeline)} weeks`,
      delta: current.timeline - baseline.timeline,
      type: 'schedule',
    });
  }
  if (current.scopeComplexity !== baseline.scopeComplexity) {
    changes.push({
      var: `scope complexity by ${current.scopeComplexity - baseline.scopeComplexity}`,
      delta: current.scopeComplexity - baseline.scopeComplexity,
      type: 'schedule',
    });
  }
  if (current.materialQuality !== baseline.materialQuality) {
    const qualityDelta = {
      low: -1,
      standard: 0,
      premium: 1,
    }[current.materialQuality] - { low: -1, standard: 0, premium: 1 }[baseline.materialQuality];
    changes.push({
      var: `material quality to ${current.materialQuality}`,
      delta: qualityDelta,
      type: 'budget',
    });
  }
  if (current.budget !== baseline.budget) {
    changes.push({
      var: `budget by $${Math.abs(current.budget - baseline.budget).toLocaleString()}`,
      delta: current.budget - baseline.budget,
      type: 'budget',
    });
  }

  // Build chains (max 4 items for clarity)
  for (let i = 0; i < Math.min(changes.length, 4); i++) {
    const change = changes[i];
    const schedDelta = metrics.schedule - baselineMetrics.schedule;
    const budgDelta = metrics.budgetTotal - baselineMetrics.budgetTotal;
    const riskDelta = metrics.riskLevel - baselineMetrics.riskLevel;

    chain.push({
      id: `impact-${i}`,
      cause: change.var,
      effect:
        change.type === 'schedule'
          ? `Timeline: ${baselineMetrics.schedule}w → ${metrics.schedule}w`
          : `Budget: $${baselineMetrics.budgetTotal.toLocaleString()} → $${metrics.budgetTotal.toLocaleString()}`,
      impact: `Risk: ${baselineMetrics.riskLevel} → ${metrics.riskLevel}`,
      type: change.type,
    });
  }

  return chain;
};

// ============================================================================
// Gauge Component
// ============================================================================

interface GaugeProps {
  label: string;
  value: number;
  delta: number;
  max: number;
  unit: string;
  color: string;
  isChanging: boolean;
}

const Gauge: React.FC<GaugeProps> = ({ label, value, delta, max, unit, color, isChanging }) => {
  const percentage = (value / max) * 100;
  const getColor = () => {
    if (label === 'RISK') {
      if (value < 33) return BRAND_COLORS.green;
      if (value < 66) return BRAND_COLORS.gold;
      return BRAND_COLORS.red;
    }
    // For SCHEDULE and BUDGET, lower is generally better
    if (percentage < 50) return BRAND_COLORS.green;
    if (percentage < 75) return BRAND_COLORS.gold;
    return BRAND_COLORS.red;
  };

  const gaugeColor = getColor();
  const trendDirection = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
  const trendColor = delta > 0 ? BRAND_COLORS.red : delta < 0 ? BRAND_COLORS.green : BRAND_COLORS.gold;

  return (
    <motion.div
      className="flex flex-col items-center gap-4"
      initial={{ scale: 1 }}
      animate={{ scale: isChanging ? 1.05 : 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Gauge Circle */}
      <div className="relative w-32 h-32 rounded-full border-4" style={{ borderColor: BRAND_COLORS.lightGray }}>
        {/* Background arc */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 120 120">
          <defs>
            <linearGradient id={`grad-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: gaugeColor, stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: gaugeColor, stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          {/* Filled arc */}
          <motion.path
            d={`M 60 10 A 50 50 0 0 1 ${60 + 50 * Math.cos((percentage / 100) * Math.PI - Math.PI / 2)} ${60 + 50 * Math.sin((percentage / 100) * Math.PI - Math.PI / 2)}`}
            stroke={`url(#grad-${label})`}
            strokeWidth="4"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: percentage / 100 }}
            transition={{ type: 'spring', stiffness: 100, damping: 30 }}
            strokeLinecap="round"
          />
        </svg>

        {/* Center content */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center"
          animate={{ scale: isChanging ? 1.1 : 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <motion.div
            className="text-sm font-semibold text-gray-600"
            animate={{ opacity: isChanging ? 1 : 0.7 }}
          >
            {percentage.toFixed(0)}%
          </motion.div>
          <motion.div
            className="text-2xl font-bold"
            style={{ color: gaugeColor }}
            animate={{ scale: isChanging ? 1.15 : 1 }}
          >
            {value}
          </motion.div>
        </motion.div>
      </div>

      {/* Label and Delta */}
      <div className="text-center">
        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{label}</div>
        <div className="text-sm text-gray-700">
          {value}
          {unit}
        </div>
        <motion.div
          className="text-sm font-bold flex items-center justify-center gap-1"
          style={{ color: trendColor }}
          animate={{ scale: isChanging ? 1.1 : 1 }}
        >
          <span>{trendDirection}</span>
          <span>{Math.abs(delta).toFixed(1)}</span>
        </motion.div>
      </div>

      {/* Breathing animation when idle */}
      {!isChanging && (
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-transparent"
          style={{ borderColor: gaugeColor }}
          initial={{ opacity: 0.3, scale: 1 }}
          animate={{ opacity: 0, scale: 1.2 }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
};

// ============================================================================
// Slider Component
// ============================================================================

interface SliderProps {
  label: string;
  value: number;
  baseline: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
  isChanging: boolean;
}

const Slider: React.FC<SliderProps> = ({ label, value, baseline, min, max, step, onChange, unit = '', isChanging }) => {
  const delta = value - baseline;
  const deltaColor = delta > 0 ? BRAND_COLORS.gold : delta < 0 ? BRAND_COLORS.green : BRAND_COLORS.darkGray;

  return (
    <motion.div
      className="p-4 rounded-lg border border-gray-200 bg-white"
      animate={{ boxShadow: isChanging ? `0 4px 12px rgba(0,0,0,0.1)` : 'none' }}
    >
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-semibold text-gray-700">{label}</label>
        <motion.div
          className="text-sm font-bold"
          style={{ color: deltaColor }}
          animate={{ scale: isChanging ? 1.1 : 1 }}
        >
          {value}
          {unit}
          {delta !== 0 && ` (${delta > 0 ? '+' : ''}${delta})`}
        </motion.div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      <div className="text-xs text-gray-500 mt-2 flex justify-between">
        <span>{min}{unit}</span>
        <span>Baseline: {baseline}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </motion.div>
  );
};

// ============================================================================
// Toggle Component
// ============================================================================

interface ToggleProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  isChanging: boolean;
}

const Toggle: React.FC<ToggleProps> = ({ label, value, options, onChange, isChanging }) => {
  return (
    <motion.div
      className="p-4 rounded-lg border border-gray-200 bg-white"
      animate={{ boxShadow: isChanging ? `0 4px 12px rgba(0,0,0,0.1)` : 'none' }}
    >
      <div className="text-sm font-semibold text-gray-700 mb-3">{label}</div>
      <div className="flex gap-2">
        {options.map((opt) => (
          <motion.button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
              value === opt.value
                ? 'text-white'
                : 'text-gray-700 border border-gray-300 bg-gray-50'
            }`}
            style={{
              backgroundColor: value === opt.value ? BRAND_COLORS.blue : undefined,
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {opt.label}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

// ============================================================================
// Impact Chain Visualization
// ============================================================================

interface ImpactChainViewProps {
  chain: ImpactChain[];
}

const ImpactChainView: React.FC<ImpactChainViewProps> = ({ chain }) => {
  if (chain.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        Adjust sliders to see impact chains
      </div>
    );
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'budget':
        return BRAND_COLORS.gold;
      case 'schedule':
        return BRAND_COLORS.blue;
      case 'risk':
        return BRAND_COLORS.red;
      default:
        return BRAND_COLORS.purple;
    }
  };

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {chain.map((item, idx) => (
          <motion.div
            key={item.id}
            className="p-3 rounded-lg border-l-4 bg-white"
            style={{ borderColor: getTypeColor(item.type) }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: idx * 0.1, duration: 0.4 }}
          >
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              {item.type}
            </div>
            <div className="text-sm font-semibold text-gray-800 mt-1">
              {item.cause}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {item.effect}
            </div>
            <motion.div
              className="text-xs font-bold mt-1"
              style={{ color: getTypeColor(item.type) }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.1 + 0.2 }}
            >
              → {item.impact}
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// Scenario Card Component
// ============================================================================

interface ScenarioCardProps {
  scenario: Scenario;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, isSelected, onSelect, onDelete }) => {
  return (
    <motion.div
      onClick={onSelect}
      className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-blue-300'
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="font-semibold text-gray-800">{scenario.name}</div>
          <div className="text-xs text-gray-500">
            {new Date(scenario.timestamp).toLocaleString()}
          </div>
        </div>
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-red-500 hover:text-red-700 text-sm"
          whileHover={{ scale: 1.2 }}
        >
          ✕
        </motion.button>
      </div>
      <div className="space-y-1 text-xs text-gray-600">
        <div>Budget: ${scenario.metrics.budgetTotal.toLocaleString()}</div>
        <div>Timeline: {scenario.metrics.schedule}w</div>
        <div>Risk: {scenario.metrics.riskLevel}/100</div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export default function TradeoffVisualizer() {
  const [variables, setVariables] = useState<ProjectVariables>(BASELINE_VARIABLES);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [showScenarioSave, setShowScenarioSave] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [askClaudeInput, setAskClaudeInput] = useState('');

  const baselineMetrics = useMemo(
    () => calculateMetrics(BASELINE_VARIABLES, BASELINE_VARIABLES),
    []
  );

  const currentMetrics = useMemo(
    () => calculateMetrics(variables, BASELINE_VARIABLES),
    [variables]
  );

  const impactChain = useMemo(
    () => generateImpactChain(variables, BASELINE_VARIABLES, currentMetrics, baselineMetrics),
    [variables, currentMetrics]
  );

  // Debounced AI insight generation
  useEffect(() => {
    const timer = setTimeout(() => {
      generateAiInsight();
    }, 500);
    return () => clearTimeout(timer);
  }, [variables]);

  // Change detection
  useEffect(() => {
    setIsChanging(true);
    const timer = setTimeout(() => setIsChanging(false), 600);
    return () => clearTimeout(timer);
  }, [variables]);

  const generateAiInsight = async () => {
    setIsLoadingInsight(true);
    try {
      // Simulate Claude API call (in production, call your Claude API endpoint)
      const changes: string[] = [];
      if (variables.crewSize !== BASELINE_VARIABLES.crewSize) {
        const delta = variables.crewSize - BASELINE_VARIABLES.crewSize;
        changes.push(
          `crew from ${BASELINE_VARIABLES.crewSize} to ${variables.crewSize} (${delta > 0 ? '+' : ''}${delta})`
        );
      }
      if (variables.timeline !== BASELINE_VARIABLES.timeline) {
        changes.push(`timeline from ${BASELINE_VARIABLES.timeline} to ${variables.timeline} weeks`);
      }
      if (variables.scopeComplexity !== BASELINE_VARIABLES.scopeComplexity) {
        changes.push(`scope complexity from ${BASELINE_VARIABLES.scopeComplexity} to ${variables.scopeComplexity}`);
      }
      if (variables.materialQuality !== BASELINE_VARIABLES.materialQuality) {
        changes.push(`material quality to ${variables.materialQuality}`);
      }
      if (variables.budget !== BASELINE_VARIABLES.budget) {
        const delta = variables.budget - BASELINE_VARIABLES.budget;
        changes.push(`budget by $${Math.abs(delta).toLocaleString()}`);
      }

      let insight = '';
      if (changes.length > 0) {
        const scheduleDelta = currentMetrics.schedule - baselineMetrics.schedule;
        const budgetDelta = currentMetrics.budgetTotal - baselineMetrics.budgetTotal;
        const riskDelta = currentMetrics.riskLevel - baselineMetrics.riskLevel;

        insight = `You've adjusted ${changes.join(' and ')}. `;
        insight += `This impacts your schedule by ${scheduleDelta > 0 ? '+' : ''}${scheduleDelta.toFixed(1)} weeks, `;
        insight += `budget by $${budgetDelta > 0 ? '+' : ''}${budgetDelta.toLocaleString()}, `;
        insight += `and risk by ${riskDelta > 0 ? '+' : ''}${riskDelta} points. `;

        if (riskDelta > 15) {
          insight += 'Consider mitigation strategies to manage the increased risk.';
        } else if (budgetDelta < -50000) {
          insight += 'You\'re significantly under budget—this leaves room for quality improvements or contingencies.';
        } else if (scheduleDelta > 5) {
          insight += 'The extended timeline increases carrying costs. Monitor material prices and team availability.';
        }
      } else {
        insight = 'Adjust any variable to see how it ripples through your project metrics.';
      }

      setAiInsight(insight);
    } catch (error) {
      console.error('Error generating insight:', error);
      setAiInsight('Unable to generate insight at this time.');
    } finally {
      setIsLoadingInsight(false);
    }
  };

  const saveScenario = () => {
    if (!scenarioName.trim()) return;
    const newScenario: Scenario = {
      id: Math.random().toString(36).substr(2, 9),
      name: scenarioName,
      variables: { ...variables },
      metrics: currentMetrics,
      timestamp: Date.now(),
    };
    setScenarios([...scenarios, newScenario]);
    setScenarioName('');
    setShowScenarioSave(false);
  };

  const loadScenario = (scenario: Scenario) => {
    setVariables(scenario.variables);
    setSelectedScenarioId(scenario.id);
  };

  const deleteScenario = (id: string) => {
    setScenarios(scenarios.filter((s) => s.id !== id));
    if (selectedScenarioId === id) setSelectedScenarioId(null);
  };

  const handleAskClaude = async () => {
    if (!askClaudeInput.trim()) return;
    setIsLoadingInsight(true);
    try {
      // In production, call your Claude API with the custom question
      const customInsight = `Regarding "${askClaudeInput}": Based on current project settings (budget $${variables.budget.toLocaleString()}, ${variables.timeline} weeks, ${variables.crewSize} crew), `;
      const riskDesc =
        currentMetrics.riskLevel < 33 ? 'low risk profile' : currentMetrics.riskLevel < 66 ? 'moderate risk' : 'elevated risk';
      setAiInsight(
        customInsight +
          `you're operating in a ${riskDesc}. The current configuration balances these factors within your constraints.`
      );
    } catch (error) {
      console.error('Error asking Claude:', error);
    } finally {
      setIsLoadingInsight(false);
      setAskClaudeInput('');
    }
  };

  return (
    <div
      className="min-h-screen p-8"
      style={{ backgroundColor: BRAND_COLORS.lightGray }}
    >
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Trade-off Visualizer</h1>
        <p className="text-gray-600">
          Adjust project variables to see real-time ripple effects across schedule, budget, and risk.
        </p>
      </motion.div>

      {/* Main Layout: 3-Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Left Panel: Variable Sliders */}
        <motion.div
          className="lg:col-span-3 space-y-4"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Project Variables</h2>

            <Slider
              label="Budget Total"
              value={variables.budget}
              baseline={BASELINE_VARIABLES.budget}
              min={300000}
              max={1000000}
              step={25000}
              onChange={(v) => setVariables({ ...variables, budget: v })}
              unit="$"
              isChanging={isChanging}
            />

            <div className="mt-4">
              <Slider
                label="Timeline"
                value={variables.timeline}
                baseline={BASELINE_VARIABLES.timeline}
                min={8}
                max={32}
                step={1}
                onChange={(v) => setVariables({ ...variables, timeline: v })}
                unit="w"
                isChanging={isChanging}
              />
            </div>

            <div className="mt-4">
              <Slider
                label="Crew Size"
                value={variables.crewSize}
                baseline={BASELINE_VARIABLES.crewSize}
                min={2}
                max={20}
                step={1}
                onChange={(v) => setVariables({ ...variables, crewSize: v })}
                isChanging={isChanging}
              />
            </div>

            <div className="mt-4">
              <Toggle
                label="Material Quality"
                value={variables.materialQuality}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'standard', label: 'Standard' },
                  { value: 'premium', label: 'Premium' },
                ]}
                onChange={(v) => setVariables({ ...variables, materialQuality: v as any })}
                isChanging={isChanging}
              />
            </div>

            <div className="mt-4">
              <Slider
                label="Scope Complexity"
                value={variables.scopeComplexity}
                baseline={BASELINE_VARIABLES.scopeComplexity}
                min={1}
                max={10}
                step={1}
                onChange={(v) => setVariables({ ...variables, scopeComplexity: v })}
                isChanging={isChanging}
              />
            </div>
          </div>
        </motion.div>

        {/* Center Panel: Gauges & Impact Chain */}
        <motion.div
          className="lg:col-span-6 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Gauge Triangle */}
          <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Ripple Effect Dashboard</h2>
            <div className="flex justify-around items-center mb-8">
              <Gauge
                label="SCHEDULE"
                value={Math.round(currentMetrics.schedule)}
                delta={currentMetrics.schedule - baselineMetrics.schedule}
                max={32}
                unit="w"
                color={BRAND_COLORS.blue}
                isChanging={isChanging}
              />
              <Gauge
                label="BUDGET"
                value={Math.round(currentMetrics.budgetTotal / 50000) * 50000}
                delta={currentMetrics.budgetTotal - baselineMetrics.budgetTotal}
                max={1000000}
                unit="$"
                color={BRAND_COLORS.gold}
                isChanging={isChanging}
              />
              <Gauge
                label="RISK"
                value={currentMetrics.riskLevel}
                delta={currentMetrics.riskLevel - baselineMetrics.riskLevel}
                max={100}
                unit=""
                color={BRAND_COLORS.red}
                isChanging={isChanging}
              />
            </div>
          </div>

          {/* Impact Chain */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Impact Chain</h2>
            <ImpactChainView chain={impactChain} />
          </div>
        </motion.div>

        {/* Right Panel: Scenarios */}
        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Scenarios</h2>

            <AnimatePresence>
              {showScenarioSave ? (
                <motion.div
                  key="save-form"
                  className="space-y-3 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <input
                    type="text"
                    placeholder="Scenario name..."
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <div className="flex gap-2">
                    <motion.button
                      onClick={saveScenario}
                      className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Save
                    </motion.button>
                    <motion.button
                      onClick={() => setShowScenarioSave(false)}
                      className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-300"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Cancel
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  key="save-button"
                  onClick={() => setShowScenarioSave(true)}
                  className="w-full px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 mb-4"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  + Save Scenario
                </motion.button>
              )}
            </AnimatePresence>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {scenarios.length === 0 ? (
                <div className="text-center text-gray-400 py-6">
                  No scenarios yet. Save your first!
                </div>
              ) : (
                scenarios.map((scenario) => (
                  <ScenarioCard
                    key={scenario.id}
                    scenario={scenario}
                    isSelected={selectedScenarioId === scenario.id}
                    onSelect={() => loadScenario(scenario)}
                    onDelete={() => deleteScenario(scenario.id)}
                  />
                ))
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Panel: AI Insight */}
      <motion.div
        className="bg-white border border-gray-200 rounded-lg shadow-sm p-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-lg font-bold text-gray-900 mb-4">AI Insight</h2>

        <motion.div
          className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 mb-4"
          animate={{ boxShadow: isLoadingInsight ? '0 4px 12px rgba(0,0,0,0.1)' : 'none' }}
        >
          {isLoadingInsight ? (
            <div className="flex items-center gap-2 text-gray-600">
              <motion.div
                className="w-2 h-2 bg-purple-500 rounded-full"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="text-sm">Generating insight...</span>
            </div>
          ) : (
            <p className="text-gray-700 text-sm leading-relaxed">{aiInsight}</p>
          )}
        </motion.div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder='Ask Claude: "What if we cut the budget by 20%?"'
            value={askClaudeInput}
            onChange={(e) => setAskClaudeInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAskClaude()}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <motion.button
            onClick={handleAskClaude}
            disabled={isLoadingInsight || !askClaudeInput.trim()}
            className="px-4 py-2 bg-purple-500 text-white text-sm font-semibold rounded-lg hover:bg-purple-600 disabled:bg-gray-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Ask
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

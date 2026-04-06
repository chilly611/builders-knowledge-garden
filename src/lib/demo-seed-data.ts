/**
 * Builder's Knowledge Garden — Demo Mode Seed Data
 * Comprehensive demo data for 5-minute guided walkthrough
 * Production-quality realistic construction industry data
 */

export type Lane = 'dreamer' | 'builder' | 'specialist' | 'merchant' | 'ally' | 'crew' | 'fleet' | 'machine';
export type ProjectPhase = 'dream' | 'plan' | 'build' | 'complete';
export type NotificationUrgency = 'info' | 'warning' | 'urgent' | 'critical';
export type EntityType = 'material' | 'technique' | 'regulation' | 'standard' | 'supplier';

// ─────────────────────────────────────────────────────────────
// DEMO USERS (8, one per lane)
// ─────────────────────────────────────────────────────────────

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  lane: Lane;
  company?: string;
  avatar?: string;
  xp: number;
  level: 'Apprentice' | 'Builder' | 'Craftsman' | 'Master' | 'Architect';
  streak: number;
  joinedDate: string;
  bio: string;
}

export const DEMO_USERS: Record<Lane, DemoUser> = {
  dreamer: {
    id: 'user-dreamer',
    name: 'Sarah Chen',
    email: 'sarah.chen@example.com',
    lane: 'dreamer',
    company: 'Chen Residence',
    xp: 1500,
    level: 'Builder',
    streak: 12,
    joinedDate: '2025-08-15',
    bio: 'Planning my dream modern farmhouse renovation.',
  },
  builder: {
    id: 'user-builder',
    name: 'Marcus Rivera',
    email: 'marcus@riveraconstruction.com',
    lane: 'builder',
    company: 'Rivera Construction LLC',
    xp: 8200,
    level: 'Master',
    streak: 28,
    joinedDate: '2024-03-10',
    bio: 'General contractor managing residential and commercial projects across the Southwest.',
  },
  specialist: {
    id: 'user-specialist',
    name: 'Jake Torres',
    email: 'jake@torreselectric.com',
    lane: 'specialist',
    company: 'Torres Electric',
    xp: 3000,
    level: 'Craftsman',
    streak: 8,
    joinedDate: '2025-02-20',
    bio: 'Licensed electrician focusing on energy-efficient system upgrades.',
  },
  merchant: {
    id: 'user-merchant',
    name: 'Elena Rodriguez',
    email: 'elena@nordicsupply.com',
    lane: 'merchant',
    company: 'Nordic Supply Co.',
    xp: 2100,
    level: 'Builder',
    streak: 5,
    joinedDate: '2025-11-05',
    bio: 'Building materials supplier serving contractors across three states.',
  },
  ally: {
    id: 'user-ally',
    name: 'David Park',
    email: 'david@crescendodevelopment.com',
    lane: 'ally',
    company: 'Crescendo Development',
    xp: 5400,
    level: 'Craftsman',
    streak: 18,
    joinedDate: '2024-09-12',
    bio: 'Real estate developer focusing on mixed-use and multi-family projects.',
  },
  crew: {
    id: 'user-crew',
    name: 'Miguel Santos',
    email: 'miguel.s@example.com',
    lane: 'crew',
    company: 'Rivera Construction',
    xp: 800,
    level: 'Apprentice',
    streak: 3,
    joinedDate: '2026-01-20',
    bio: 'Construction worker coordinating daily on-site activities.',
  },
  fleet: {
    id: 'user-fleet',
    name: 'Jennifer Walsh',
    email: 'jwalsh@nationalbuilders.com',
    lane: 'fleet',
    company: 'National Builders Group',
    xp: 6900,
    level: 'Master',
    streak: 22,
    joinedDate: '2024-06-08',
    bio: 'Regional director managing 15 concurrent projects and 40+ team members.',
  },
  machine: {
    id: 'user-machine',
    email: 'api@builderskg.io',
    name: 'API Integration Bot',
    lane: 'machine',
    xp: 12000,
    level: 'Architect',
    streak: 365,
    joinedDate: '2023-01-01',
    bio: 'Automated system for data syncing and workflow orchestration.',
  },
};

// ─────────────────────────────────────────────────────────────
// DEMO PROJECTS (5 across different phases & lanes)
// ─────────────────────────────────────────────────────────────

export interface DemoProject {
  id: string;
  title: string;
  description: string;
  lane: Lane;
  phase: ProjectPhase;
  owner: string;
  location: string;
  budget: number;
  timeline: string;
  participants: string[];
  progress: number; // 0-100
  createdDate: string;
}

export const DEMO_PROJECTS: DemoProject[] = [
  {
    id: 'proj-chen-farmhouse',
    title: 'Modern Farmhouse - Chen Residence',
    description: 'Complete residential renovation with open concept kitchen, master suite addition, and outdoor living space.',
    lane: 'dreamer',
    phase: 'dream',
    owner: 'Sarah Chen',
    location: 'Austin, TX',
    budget: 285000,
    timeline: '6 months (Q3-Q4 2026)',
    participants: ['Sarah Chen', 'Marcus Rivera'],
    progress: 15,
    createdDate: '2026-01-10',
  },
  {
    id: 'proj-downtown-office',
    title: 'Downtown Office Renovation',
    description: 'Commercial office space modernization including HVAC upgrade, LED conversion, and ADA compliance updates.',
    lane: 'builder',
    phase: 'build',
    owner: 'Marcus Rivera',
    location: 'Phoenix, AZ',
    budget: 150000,
    timeline: '10 weeks',
    participants: ['Marcus Rivera', 'Jake Torres', 'Elena Rodriguez'],
    progress: 65,
    createdDate: '2025-10-15',
  },
  {
    id: 'proj-oak-mall-electrical',
    title: 'Electrical System Upgrade - Oak Mall',
    description: 'Complete electrical panel replacement, new backup generator installation, and LED lighting retrofit.',
    lane: 'specialist',
    phase: 'build',
    owner: 'Jake Torres',
    location: 'Tucson, AZ',
    budget: 45000,
    timeline: '4 weeks',
    participants: ['Jake Torres', 'Marcus Rivera', 'Elena Rodriguez'],
    progress: 52,
    createdDate: '2026-02-01',
  },
  {
    id: 'proj-material-supply-q2',
    title: 'Material Supply: Northeast Region Q2',
    description: 'Quarterly material fulfillment and logistics coordination for contractor network across Northeast.',
    lane: 'merchant',
    phase: 'plan',
    owner: 'Elena Rodriguez',
    location: 'Regional',
    budget: 225000,
    timeline: 'Q2 2026',
    participants: ['Elena Rodriguez', 'Marcus Rivera', 'Jake Torres'],
    progress: 35,
    createdDate: '2026-01-02',
  },
  {
    id: 'proj-harbor-view-development',
    title: 'Multi-Family Development - Harbor View',
    description: 'Mixed-use waterfront development: 120 residential units, 15K sqft commercial space, parking structure.',
    lane: 'fleet',
    phase: 'plan',
    owner: 'Jennifer Walsh',
    location: 'San Diego, CA',
    budget: 42000000,
    timeline: '24 months (Phase 1-3)',
    participants: ['Jennifer Walsh', 'David Park', 'Marcus Rivera', 'Jake Torres', 'Elena Rodriguez'],
    progress: 8,
    createdDate: '2025-11-20',
  },
];

// ─────────────────────────────────────────────────────────────
// DEMO KNOWLEDGE ENTITIES (20 realistic construction items)
// ─────────────────────────────────────────────────────────────

export interface DemoKnowledgeEntity {
  id: string;
  title: string;
  type: EntityType;
  description: string;
  relatedLanes: Lane[];
  relevantProjects: string[];
  cost?: string;
  lifespan?: string;
  compliance?: string[];
  tags: string[];
}

export const DEMO_KNOWLEDGE_ENTITIES: DemoKnowledgeEntity[] = [
  {
    id: 'know-engineered-hardwood',
    title: 'Engineered Hardwood Flooring',
    type: 'material',
    description: 'Multi-layered wood flooring with a plywood base. More stable than solid hardwood, resistant to humidity and temperature changes.',
    relatedLanes: ['dreamer', 'builder', 'specialist'],
    relevantProjects: ['proj-chen-farmhouse', 'proj-downtown-office'],
    cost: '$4-12 per sq ft',
    lifespan: '15-25 years',
    tags: ['flooring', 'residential', 'luxury', 'eco-friendly-option'],
  },
  {
    id: 'know-spray-foam',
    title: 'Spray Foam Insulation',
    type: 'material',
    description: 'Closed-cell polyurethane foam provides air sealing and R-value of 6-7 per inch. Superior to fiberglass for energy efficiency.',
    relatedLanes: ['builder', 'specialist', 'ally'],
    relevantProjects: ['proj-chen-farmhouse', 'proj-downtown-office'],
    cost: '$1.50-2.50 per sq ft',
    lifespan: '80+ years',
    compliance: ['IRC 2021', 'IECC'],
    tags: ['insulation', 'energy-efficient', 'air-seal', 'premium'],
  },
  {
    id: 'know-standing-seam-roof',
    title: 'Standing Seam Metal Roof',
    type: 'material',
    description: 'Vertical seams provide excellent water shedding and durability. Popular for both residential and commercial applications.',
    relatedLanes: ['builder', 'specialist'],
    relevantProjects: ['proj-chen-farmhouse'],
    cost: '$10-15 per sq ft',
    lifespan: '40-70 years',
    tags: ['roofing', 'metal', 'energy-efficient', 'residential', 'commercial'],
  },
  {
    id: 'know-quartz-countertops',
    title: 'Engineered Quartz Countertops',
    type: 'material',
    description: 'Non-porous engineered stone combining 90% quartz with resin. Requires no sealing, extremely durable and stain-resistant.',
    relatedLanes: ['dreamer', 'builder'],
    relevantProjects: ['proj-chen-farmhouse'],
    cost: '$50-100 per linear foot',
    lifespan: '20-25 years',
    tags: ['kitchen', 'countertops', 'luxury', 'low-maintenance'],
  },
  {
    id: 'know-raised-heel-truss',
    title: 'Raised Heel Truss Design',
    type: 'technique',
    description: 'Roof truss design allowing insulation above exterior wall top plate. Improves thermal performance at the thermal boundary.',
    relatedLanes: ['builder', 'specialist', 'ally'],
    relevantProjects: ['proj-chen-farmhouse'],
    tags: ['framing', 'energy-efficiency', 'building-science', 'code-compliant'],
  },
  {
    id: 'know-continuous-insulation',
    title: 'Continuous Insulation (CI) Strategy',
    type: 'technique',
    description: 'Insulation layer placed continuously on the exterior of structural elements without thermal breaks.',
    relatedLanes: ['builder', 'specialist'],
    relevantProjects: ['proj-downtown-office', 'proj-chen-farmhouse'],
    compliance: ['IECC 2021', 'Energy Star'],
    tags: ['energy-efficient', 'building-science', 'thermal-envelope'],
  },
  {
    id: 'know-blower-door-test',
    title: 'Blower Door Pressure Test',
    type: 'technique',
    description: 'ASTM E779 standard test measuring air tightness. Critical for passive house and high-performance construction.',
    relatedLanes: ['builder', 'specialist'],
    relevantProjects: ['proj-chen-farmhouse'],
    tags: ['testing', 'quality-assurance', 'air-sealing', 'energy-audit'],
  },
  {
    id: 'know-irc-2021-rvalue',
    title: 'IRC 2021 R-Value Requirements',
    type: 'regulation',
    description: 'International Residential Code 2021 minimum insulation requirements by climate zone. Zone 6: R-38 roof, R-20 walls.',
    relatedLanes: ['builder', 'specialist', 'ally'],
    relevantProjects: ['proj-chen-farmhouse', 'proj-downtown-office'],
    compliance: ['IRC 2021'],
    tags: ['code', 'insulation', 'energy', 'mandatory'],
  },
  {
    id: 'know-osha-fall-protection',
    title: 'OSHA Fall Protection Standards',
    type: 'regulation',
    description: 'OSHA 1926.500 requirements for fall protection at heights exceeding 6 feet. Mandates guardrails, safety nets, or harnesses.',
    relatedLanes: ['builder', 'specialist', 'crew', 'fleet'],
    relevantProjects: ['proj-downtown-office', 'proj-oak-mall-electrical'],
    tags: ['safety', 'osha', 'mandatory', 'worker-protection'],
  },
  {
    id: 'know-ada-compliance',
    title: 'ADA Accessibility Compliance',
    type: 'regulation',
    description: 'Americans with Disabilities Act requirements for commercial spaces. Includes accessible parking, restrooms, entryways, and pathways.',
    relatedLanes: ['builder', 'specialist', 'ally'],
    relevantProjects: ['proj-downtown-office', 'proj-harbor-view-development'],
    compliance: ['ADA'],
    tags: ['accessibility', 'commercial', 'mandatory', 'compliance'],
  },
  {
    id: 'know-astm-c518',
    title: 'ASTM C518 - Thermal Conductivity Test',
    type: 'standard',
    description: 'Standard test method for steady-state thermal transmission properties of homogeneous and non-homogeneous insulation.',
    relatedLanes: ['builder', 'specialist', 'ally'],
    relevantProjects: ['proj-chen-farmhouse'],
    tags: ['testing', 'standards', 'insulation', 'performance'],
  },
  {
    id: 'know-nfpa-70',
    title: 'NFPA 70 - National Electrical Code',
    type: 'standard',
    description: 'NEC standards for electrical installation to protect property from fire and hazards. Updated tri-annually.',
    relatedLanes: ['specialist', 'builder', 'crew'],
    relevantProjects: ['proj-oak-mall-electrical', 'proj-downtown-office'],
    tags: ['electrical', 'safety', 'code', 'mandatory'],
  },
  {
    id: 'know-buildpro-supply',
    title: 'BuildPro Supply - Wholesale Lumber & Materials',
    type: 'supplier',
    description: 'Regional wholesale supplier of lumber, fasteners, and framing materials. 12 locations across Southwest. Volume discounts available.',
    relatedLanes: ['builder', 'specialist', 'merchant'],
    relevantProjects: ['proj-downtown-office', 'proj-chen-farmhouse'],
    tags: ['supplier', 'materials', 'wholesale', 'southwest'],
  },
  {
    id: 'know-metro-lumber',
    title: 'Metro Lumber - Specialty Wood & Millwork',
    type: 'supplier',
    description: 'Premium hardwood and custom millwork supplier. Specializes in architectural woodwork and specialty lumber.',
    relatedLanes: ['dreamer', 'builder', 'merchant'],
    relevantProjects: ['proj-chen-farmhouse'],
    tags: ['supplier', 'hardwood', 'premium', 'millwork'],
  },
  {
    id: 'know-pacific-electrical',
    title: 'Pacific Electrical Supply - Wire & Equipment',
    type: 'supplier',
    description: 'Distributor of electrical wire, panels, breakers, and renewable energy equipment. Same-day delivery in metro areas.',
    relatedLanes: ['specialist', 'builder', 'merchant'],
    relevantProjects: ['proj-oak-mall-electrical', 'proj-downtown-office'],
    tags: ['supplier', 'electrical', 'solar', 'fast-delivery'],
  },
  {
    id: 'know-thermal-bridge',
    title: 'Thermal Bridge Mitigation',
    type: 'technique',
    description: 'Design strategies to minimize heat flow through conductive materials. Includes cavity-back furring and insulated fasteners.',
    relatedLanes: ['builder', 'specialist', 'ally'],
    relevantProjects: ['proj-chen-farmhouse'],
    tags: ['building-science', 'energy-efficient', 'advanced'],
  },
  {
    id: 'know-passive-house',
    title: 'Passive House Standard (PHI)',
    type: 'standard',
    description: 'Ultra-low energy building standard requiring ≤15 kWh/m²/year. Rigorous construction and testing protocols.',
    relatedLanes: ['ally', 'builder', 'specialist'],
    relevantProjects: [],
    tags: ['standard', 'energy-efficient', 'premium', 'certification'],
  },
  {
    id: 'know-sustainable-concrete',
    title: 'Low-Carbon Concrete & Alternatives',
    type: 'material',
    description: 'Concrete with recycled content, fly ash replacement, or geopolymer binders. Reduces embodied carbon 20-60%.',
    relatedLanes: ['builder', 'ally', 'merchant'],
    relevantProjects: ['proj-harbor-view-development'],
    cost: '$120-150 per cubic yard',
    tags: ['sustainable', 'eco-friendly', 'material', 'embodied-carbon'],
  },
  {
    id: 'know-rebar-corrosion',
    title: 'Rebar Corrosion Prevention in Concrete',
    type: 'technique',
    description: 'Proper concrete cover depth and coating to protect reinforcement. Critical for durability in marine/freeze-thaw environments.',
    relatedLanes: ['builder', 'specialist'],
    relevantProjects: ['proj-harbor-view-development'],
    tags: ['concrete', 'durability', 'maintenance', 'design'],
  },
];

// ─────────────────────────────────────────────────────────────
// DEMO NOTIFICATIONS (10, spanning all urgency tiers)
// ─────────────────────────────────────────────────────────────

export interface DemoNotification {
  id: string;
  title: string;
  message: string;
  urgency: NotificationUrgency;
  relatedTo: string; // project or entity id
  timestamp: string;
  actionUrl?: string;
  actionLabel?: string;
  read: boolean;
}

export const DEMO_NOTIFICATIONS: DemoNotification[] = [
  {
    id: 'notif-1',
    title: 'Material Delivery Confirmed',
    message: 'Your quartz countertop shipment (Order #QZ-2806) arrived at the job site.',
    urgency: 'info',
    relatedTo: 'proj-chen-farmhouse',
    timestamp: '2026-04-05T08:30:00Z',
    actionLabel: 'View Receipt',
    read: false,
  },
  {
    id: 'notif-2',
    title: 'Weather Alert - Project Site',
    message: 'Heavy rain forecast for next 2 days at Chen Residence location. Consider scheduling outdoor work accordingly.',
    urgency: 'warning',
    relatedTo: 'proj-chen-farmhouse',
    timestamp: '2026-04-05T07:15:00Z',
    read: false,
  },
  {
    id: 'notif-3',
    title: 'Crew Schedule Updated',
    message: 'Marcus Rivera updated the schedule for Downtown Office project. Check for changes to your assigned days.',
    urgency: 'info',
    relatedTo: 'proj-downtown-office',
    timestamp: '2026-04-04T16:45:00Z',
    read: true,
  },
  {
    id: 'notif-4',
    title: 'Supplier Price Increase',
    message: 'Standing seam roofing materials increased 8% due to steel market volatility. Lock in pricing now.',
    urgency: 'warning',
    relatedTo: 'know-standing-seam-roof',
    timestamp: '2026-04-04T14:20:00Z',
    actionLabel: 'Request Quote',
    read: false,
  },
  {
    id: 'notif-5',
    title: 'Budget Alert',
    message: 'Downtown Office Renovation project expenses exceeded plan by $12,400 (9.3% over). Review cost report.',
    urgency: 'urgent',
    relatedTo: 'proj-downtown-office',
    timestamp: '2026-04-04T09:30:00Z',
    actionLabel: 'View Report',
    read: false,
  },
  {
    id: 'notif-6',
    title: 'Code Violation Notice',
    message: 'Inspector flagged missing blower door test for Chen Residence. Required before final inspection.',
    urgency: 'critical',
    relatedTo: 'proj-chen-farmhouse',
    timestamp: '2026-04-03T13:00:00Z',
    actionLabel: 'Schedule Test',
    read: false,
  },
  {
    id: 'notif-7',
    title: 'Quest Completed: Energy Audit',
    message: 'You earned 250 XP for completing the "Energy Efficiency Deep Dive" quest. Next: Passive House Mastery.',
    urgency: 'info',
    relatedTo: 'user-builder',
    timestamp: '2026-04-03T10:15:00Z',
    read: true,
  },
  {
    id: 'notif-8',
    title: 'Safety Report Due',
    message: 'OSHA safety incident report for Oak Mall electrical work is due by April 8th.',
    urgency: 'urgent',
    relatedTo: 'proj-oak-mall-electrical',
    timestamp: '2026-04-02T15:40:00Z',
    actionLabel: 'File Report',
    read: true,
  },
  {
    id: 'notif-9',
    title: 'New Team Member',
    message: 'Miguel Santos joined your Harbor View project as crew lead. Review his profile and assign tasks.',
    urgency: 'info',
    relatedTo: 'proj-harbor-view-development',
    timestamp: '2026-04-02T11:22:00Z',
    read: true,
  },
  {
    id: 'notif-10',
    title: 'Performance Insight',
    message: 'Your electrical estimates are 22% more accurate than peer average. Keep maintaining detailed site logs!',
    urgency: 'info',
    relatedTo: 'user-specialist',
    timestamp: '2026-04-01T08:00:00Z',
    read: true,
  },
];

// ─────────────────────────────────────────────────────────────
// DEMO ACHIEVEMENTS (5 per user, 40 total)
// ─────────────────────────────────────────────────────────────

export interface DemoAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedDate: string;
  xpReward: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  lane: Lane;
}

export const DEMO_ACHIEVEMENTS: Record<Lane, DemoAchievement[]> = {
  dreamer: [
    {
      id: 'ach-dreamer-first-vision',
      title: 'First Vision',
      description: 'Create your first dream project.',
      icon: '💭',
      unlockedDate: '2026-01-15',
      xpReward: 100,
      rarity: 'common',
      lane: 'dreamer',
    },
    {
      id: 'ach-dreamer-mood-board',
      title: 'Aesthetic Explorer',
      description: 'Save 10 inspirational images to your mood board.',
      icon: '🎨',
      unlockedDate: '2026-02-01',
      xpReward: 150,
      rarity: 'common',
      lane: 'dreamer',
    },
    {
      id: 'ach-dreamer-estimate-collector',
      title: 'Smart Estimator',
      description: 'Collect quotes from 5 different builders.',
      icon: '📋',
      unlockedDate: '2026-02-20',
      xpReward: 250,
      rarity: 'rare',
      lane: 'dreamer',
    },
    {
      id: 'ach-dreamer-budget-master',
      title: 'Budget Savvy',
      description: 'Break down your project budget across 8+ categories.',
      icon: '💰',
      unlockedDate: '2026-03-10',
      xpReward: 300,
      rarity: 'rare',
      lane: 'dreamer',
    },
    {
      id: 'ach-dreamer-energy-guru',
      title: 'Energy Conscious Dreamer',
      description: 'Include energy efficiency in all 3 design options.',
      icon: '⚡',
      unlockedDate: '2026-03-25',
      xpReward: 200,
      rarity: 'rare',
      lane: 'dreamer',
    },
  ],
  builder: [
    {
      id: 'ach-builder-first-project',
      title: 'Project Kickoff',
      description: 'Launch your first Builder project.',
      icon: '🏗️',
      unlockedDate: '2024-03-20',
      xpReward: 100,
      rarity: 'common',
      lane: 'builder',
    },
    {
      id: 'ach-builder-on-schedule',
      title: 'Timeline Ace',
      description: 'Complete 3 consecutive project phases on schedule.',
      icon: '📅',
      unlockedDate: '2024-08-15',
      xpReward: 350,
      rarity: 'epic',
      lane: 'builder',
    },
    {
      id: 'ach-builder-budget-match',
      title: 'Budget Precision',
      description: 'Finish a project within 2% of original budget.',
      icon: '💯',
      unlockedDate: '2025-02-10',
      xpReward: 400,
      rarity: 'epic',
      lane: 'builder',
    },
    {
      id: 'ach-builder-team-leader',
      title: 'Team Builder',
      description: 'Manage a project team of 10+ people.',
      icon: '👥',
      unlockedDate: '2025-06-22',
      xpReward: 500,
      rarity: 'epic',
      lane: 'builder',
    },
    {
      id: 'ach-builder-master-builder',
      title: 'Master Builder',
      description: 'Achieve Master level (5000+ XP).',
      icon: '👑',
      unlockedDate: '2025-12-05',
      xpReward: 800,
      rarity: 'legendary',
      lane: 'builder',
    },
  ],
  specialist: [
    {
      id: 'ach-specialist-first-estimate',
      title: 'First Bid',
      description: 'Submit your first specialist estimate.',
      icon: '📝',
      unlockedDate: '2025-02-28',
      xpReward: 100,
      rarity: 'common',
      lane: 'specialist',
    },
    {
      id: 'ach-specialist-accuracy',
      title: 'Estimating Accuracy',
      description: 'Win 5 bids in a row with accurate estimates.',
      icon: '🎯',
      unlockedDate: '2025-04-10',
      xpReward: 300,
      rarity: 'rare',
      lane: 'specialist',
    },
    {
      id: 'ach-specialist-code-master',
      title: 'Code Compliance Expert',
      description: 'Pass 10 inspections without violations.',
      icon: '✓',
      unlockedDate: '2025-06-15',
      xpReward: 350,
      rarity: 'rare',
      lane: 'specialist',
    },
    {
      id: 'ach-specialist-safety-first',
      title: 'Safety Champion',
      description: 'Complete 500 hours on-site with zero incidents.',
      icon: '🛡️',
      unlockedDate: '2025-09-02',
      xpReward: 400,
      rarity: 'epic',
      lane: 'specialist',
    },
    {
      id: 'ach-specialist-craftsman',
      title: 'Craftsman Level',
      description: 'Reach Craftsman level (2000+ XP).',
      icon: '⚙️',
      unlockedDate: '2026-01-30',
      xpReward: 500,
      rarity: 'epic',
      lane: 'specialist',
    },
  ],
  merchant: [
    {
      id: 'ach-merchant-first-sale',
      title: 'First Order',
      description: 'Process your first material order.',
      icon: '📦',
      unlockedDate: '2025-11-10',
      xpReward: 100,
      rarity: 'common',
      lane: 'merchant',
    },
    {
      id: 'ach-merchant-high-volume',
      title: 'Volume Leader',
      description: 'Process $100K in orders in a single month.',
      icon: '📊',
      unlockedDate: '2026-01-15',
      xpReward: 350,
      rarity: 'rare',
      lane: 'merchant',
    },
    {
      id: 'ach-merchant-network',
      title: 'Network Connector',
      description: 'Establish supply relationships with 20+ contractors.',
      icon: '🌐',
      unlockedDate: '2026-02-20',
      xpReward: 300,
      rarity: 'rare',
      lane: 'merchant',
    },
    {
      id: 'ach-merchant-speed-delivery',
      title: 'Fast Fulfillment',
      description: 'Achieve 98% on-time delivery rate.',
      icon: '⚡',
      unlockedDate: '2026-03-05',
      xpReward: 250,
      rarity: 'rare',
      lane: 'merchant',
    },
    {
      id: 'ach-merchant-satisfaction',
      title: 'Customer Champion',
      description: 'Earn 4.8+ star rating from 50+ customers.',
      icon: '⭐',
      unlockedDate: '2026-03-18',
      xpReward: 400,
      rarity: 'epic',
      lane: 'merchant',
    },
  ],
  ally: [
    {
      id: 'ach-ally-first-deal',
      title: 'First Deal',
      description: 'Fund or develop your first project.',
      icon: '🤝',
      unlockedDate: '2024-09-25',
      xpReward: 150,
      rarity: 'common',
      lane: 'ally',
    },
    {
      id: 'ach-ally-portfolio',
      title: 'Portfolio Builder',
      description: 'Manage 5 concurrent projects.',
      icon: '📂',
      unlockedDate: '2025-03-15',
      xpReward: 300,
      rarity: 'rare',
      lane: 'ally',
    },
    {
      id: 'ach-ally-roi-master',
      title: 'ROI Master',
      description: 'Achieve 18%+ annualized return on a project.',
      icon: '💹',
      unlockedDate: '2025-08-30',
      xpReward: 450,
      rarity: 'epic',
      lane: 'ally',
    },
    {
      id: 'ach-ally-finance-guru',
      title: 'Financial Expert',
      description: 'Maintain detailed financial tracking on all projects.',
      icon: '💰',
      unlockedDate: '2025-11-12',
      xpReward: 400,
      rarity: 'rare',
      lane: 'ally',
    },
    {
      id: 'ach-ally-craftsman',
      title: 'Craftsman Developer',
      description: 'Reach Craftsman level (2000+ XP).',
      icon: '🏢',
      unlockedDate: '2026-02-08',
      xpReward: 500,
      rarity: 'epic',
      lane: 'ally',
    },
  ],
  crew: [
    {
      id: 'ach-crew-first-day',
      title: 'On the Job',
      description: 'Complete your first shift using the app.',
      icon: '👷',
      unlockedDate: '2026-01-25',
      xpReward: 50,
      rarity: 'common',
      lane: 'crew',
    },
    {
      id: 'ach-crew-communication',
      title: 'Team Player',
      description: 'Send 50 messages in crew coordination.',
      icon: '💬',
      unlockedDate: '2026-02-10',
      xpReward: 100,
      rarity: 'common',
      lane: 'crew',
    },
    {
      id: 'ach-crew-safety',
      title: 'Safety Conscious',
      description: 'Complete safety training modules.',
      icon: '🛡️',
      unlockedDate: '2026-03-01',
      xpReward: 150,
      rarity: 'rare',
      lane: 'crew',
    },
    {
      id: 'ach-crew-reliability',
      title: 'Reliable Worker',
      description: 'Maintain 95% attendance over 2 months.',
      icon: '⏰',
      unlockedDate: '2026-03-15',
      xpReward: 200,
      rarity: 'rare',
      lane: 'crew',
    },
    {
      id: 'ach-crew-veteran',
      title: 'Veteran Crew Member',
      description: 'Complete 500 hours of work.',
      icon: '🎖️',
      unlockedDate: '2026-04-01',
      xpReward: 350,
      rarity: 'epic',
      lane: 'crew',
    },
  ],
  fleet: [
    {
      id: 'ach-fleet-operations',
      title: 'Operations Commander',
      description: 'Manage your first multi-project operation.',
      icon: '🛠️',
      unlockedDate: '2024-06-20',
      xpReward: 200,
      rarity: 'rare',
      lane: 'fleet',
    },
    {
      id: 'ach-fleet-scale',
      title: 'Scaling Up',
      description: 'Manage 10+ concurrent projects.',
      icon: '📈',
      unlockedDate: '2024-12-15',
      xpReward: 400,
      rarity: 'epic',
      lane: 'fleet',
    },
    {
      id: 'ach-fleet-team',
      title: 'Team Orchestrator',
      description: 'Coordinate 30+ team members across projects.',
      icon: '🎼',
      unlockedDate: '2025-05-10',
      xpReward: 500,
      rarity: 'epic',
      lane: 'fleet',
    },
    {
      id: 'ach-fleet-efficiency',
      title: 'Efficiency Expert',
      description: 'Reduce operational costs by 15% across portfolio.',
      icon: '⚙️',
      unlockedDate: '2025-09-25',
      xpReward: 600,
      rarity: 'epic',
      lane: 'fleet',
    },
    {
      id: 'ach-fleet-master',
      title: 'Master Fleet Director',
      description: 'Achieve Master level (5000+ XP).',
      icon: '👑',
      unlockedDate: '2026-02-28',
      xpReward: 800,
      rarity: 'legendary',
      lane: 'fleet',
    },
  ],
  machine: [
    {
      id: 'ach-machine-sync',
      title: 'Data Sync',
      description: 'Successfully sync 1000+ records.',
      icon: '🔄',
      unlockedDate: '2023-06-01',
      xpReward: 500,
      rarity: 'rare',
      lane: 'machine',
    },
    {
      id: 'ach-machine-uptime',
      title: 'Reliability',
      description: 'Maintain 99.9% uptime for 30 days.',
      icon: '✓',
      unlockedDate: '2024-01-15',
      xpReward: 1000,
      rarity: 'epic',
      lane: 'machine',
    },
    {
      id: 'ach-machine-integration',
      title: 'Integrations',
      description: 'Successfully connect 5+ external systems.',
      icon: '🔗',
      unlockedDate: '2024-06-10',
      xpReward: 800,
      rarity: 'epic',
      lane: 'machine',
    },
    {
      id: 'ach-machine-scale',
      title: 'Scalability',
      description: 'Process 100K+ transactions per day.',
      icon: '📊',
      unlockedDate: '2025-03-20',
      xpReward: 1200,
      rarity: 'epic',
      lane: 'machine',
    },
    {
      id: 'ach-machine-architect',
      title: 'Architect',
      description: 'Achieve Architect level (15000+ XP).',
      icon: '🏛️',
      unlockedDate: '2025-12-01',
      xpReward: 2000,
      rarity: 'legendary',
      lane: 'machine',
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// DEMO MORNING BRIEFINGS (lane-specific)
// ─────────────────────────────────────────────────────────────

export interface DemoBriefing {
  lane: Lane;
  greeting: string;
  highlights: string[];
  keyMetric: { label: string; value: string; trend: string };
  nextSteps: string[];
  focusQuest: string;
}

export const DEMO_BRIEFINGS: Record<Lane, DemoBriefing> = {
  dreamer: {
    lane: 'dreamer',
    greeting: "Good morning, Sarah! Let's build your dream home.",
    highlights: [
      'Quartz countertops available at 12% discount this week',
      'Energy efficiency calculator updated with 2026 tax credits',
      'Builder reviews: 3 new 5-star reviews from similar projects',
    ],
    keyMetric: {
      label: 'Budget Confidence',
      value: '87%',
      trend: '+12% this week',
    },
    nextSteps: [
      'Review final design options (3 pending)',
      'Compare builder quotes',
      'Lock in material pricing',
    ],
    focusQuest: 'Energy Efficiency Deep Dive - Save $15K on utility bills',
  },
  builder: {
    lane: 'builder',
    greeting: 'Good morning, Marcus! Your portfolio is thriving.',
    highlights: [
      'Downtown Office project at 65% completion',
      'All crews on schedule with no safety incidents',
      'Supply chain alert: Lumber prices stable this week',
    ],
    keyMetric: {
      label: 'Project Health',
      value: '9.2/10',
      trend: '+0.5 this week',
    },
    nextSteps: [
      'Review budget variance report ($12.4K over)',
      'Schedule final inspections',
      'Plan crew schedule for next phase',
    ],
    focusQuest: 'Budget Mastery - Control project costs like a pro',
  },
  specialist: {
    lane: 'specialist',
    greeting: 'Good morning, Jake! 5 new bid requests waiting.',
    highlights: [
      'Your electrical estimates are 22% more accurate than peers',
      'Oak Mall project: 52% complete, ahead of schedule',
      'New NFPA 70 updates released - review recommended',
    ],
    keyMetric: {
      label: 'Win Rate',
      value: '68%',
      trend: '+8% this month',
    },
    nextSteps: [
      'Review 5 new bids (avg value: $12K)',
      'Complete safety certifications',
      'Update equipment inventory',
    ],
    focusQuest: 'Safety Mastery - 500 hours zero incidents',
  },
  merchant: {
    lane: 'merchant',
    greeting: 'Good morning, Elena! Supply chain running smooth.',
    highlights: [
      'Q2 material orders: $185K in pipeline',
      'Steel market up 3% - lock in pricing today',
      'New contractor relationships: 4 pending',
    ],
    keyMetric: {
      label: 'On-Time Delivery',
      value: '98.2%',
      trend: 'Steady',
    },
    nextSteps: [
      'Process 8 pending orders',
      'Negotiate Q3 volume discounts',
      'Follow up with 3 inactive accounts',
    ],
    focusQuest: 'Customer Champion - 4.8+ stars from 50 customers',
  },
  ally: {
    lane: 'ally',
    greeting: 'Good morning, David! Your portfolio is strong.',
    highlights: [
      'Harbor View development: financing secured at 4.8%',
      'Market analysis: Construction demand +22% YoY',
      'Portfolio ROI: averaging 16.8% across all deals',
    ],
    keyMetric: {
      label: 'Portfolio Value',
      value: '$42M',
      trend: '+$1.2M this month',
    },
    nextSteps: [
      'Review financial statements for 3 active projects',
      'Schedule quarterly review with financing partner',
      'Analyze new opportunity pipeline',
    ],
    focusQuest: 'ROI Master - 18%+ return on a project',
  },
  crew: {
    lane: 'crew',
    greeting: 'Good morning, Miguel! You have 2 shifts this week.',
    highlights: [
      'Your team has maintained 100% safety record',
      'Weather forecast: Clear skies for outdoor work',
      'New tool training available: Advanced finishing',
    ],
    keyMetric: {
      label: 'Attendance',
      value: '95%',
      trend: '+2% this month',
    },
    nextSteps: [
      'Check today\'s shift assignment',
      'Review crew messages (2 new)',
      'Complete safety training module',
    ],
    focusQuest: 'Team Player - Send 50 coordination messages',
  },
  fleet: {
    lane: 'fleet',
    greeting: 'Good morning, Jennifer! 15 projects under your management.',
    highlights: [
      'All projects at or ahead of schedule',
      'Team utilization: 94% (healthy)',
      'Safety: Zero incidents across all sites',
    ],
    keyMetric: {
      label: 'Portfolio Health',
      value: '9.1/10',
      trend: '+0.3 this week',
    },
    nextSteps: [
      'Review resource allocation for Q2 expansion',
      'Schedule leadership team sync',
      'Analyze operational cost reduction opportunities',
    ],
    focusQuest: 'Efficiency Expert - Cut operational costs by 15%',
  },
  machine: {
    lane: 'machine',
    greeting: 'System status: All green. Ready for integration.',
    highlights: [
      'Data sync success rate: 99.98%',
      'Active integrations: 12 systems',
      'Processing: 87.3K transactions/day',
    ],
    keyMetric: {
      label: 'Uptime',
      value: '99.96%',
      trend: '+0.04% this week',
    },
    nextSteps: [
      'Process pending sync batches',
      'Monitor API performance metrics',
      'Queue scheduled maintenance',
    ],
    focusQuest: 'Scalability - Process 100K transactions/day',
  },
};

// ─────────────────────────────────────────────────────────────
// DEMO QUESTS (3 active per user)
// ─────────────────────────────────────────────────────────────

export interface DemoQuest {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  difficulty: 'easy' | 'medium' | 'hard';
  completedAt?: string;
  lane: Lane;
  progress: number; // 0-100
}

export const DEMO_QUESTS: Record<Lane, DemoQuest[]> = {
  dreamer: [
    {
      id: 'quest-dreamer-1',
      title: 'Energy Efficiency Deep Dive',
      description: 'Learn about insulation R-values, air sealing, and passive design. Estimate potential utility savings.',
      xpReward: 250,
      difficulty: 'medium',
      lane: 'dreamer',
      progress: 65,
    },
    {
      id: 'quest-dreamer-2',
      title: 'Material Selection Master',
      description: 'Research and compare 3 finishing options for kitchen, bathrooms, and flooring.',
      xpReward: 200,
      difficulty: 'easy',
      lane: 'dreamer',
      progress: 45,
    },
    {
      id: 'quest-dreamer-3',
      title: 'Timeline & Budget Reality Check',
      description: 'Break down your project timeline by phase and create a detailed budget by category.',
      xpReward: 300,
      difficulty: 'hard',
      lane: 'dreamer',
      progress: 28,
    },
  ],
  builder: [
    {
      id: 'quest-builder-1',
      title: 'Crew Coordination Master',
      description: 'Coordinate all trades for a major phase. Ensure no schedule conflicts or material delays.',
      xpReward: 350,
      difficulty: 'hard',
      lane: 'builder',
      progress: 80,
    },
    {
      id: 'quest-builder-2',
      title: 'Budget Control',
      description: 'Maintain project spending within 2% of plan. Track all invoices and change orders.',
      xpReward: 300,
      difficulty: 'medium',
      lane: 'builder',
      progress: 55,
    },
    {
      id: 'quest-builder-3',
      title: 'Quality Assurance',
      description: 'Pass all inspections on first attempt. Document deficiencies and corrections.',
      xpReward: 250,
      difficulty: 'medium',
      lane: 'builder',
      progress: 40,
    },
  ],
  specialist: [
    {
      id: 'quest-specialist-1',
      title: 'Bid Accuracy Challenge',
      description: 'Win 3 consecutive bids with final costs within 5% of estimate.',
      xpReward: 300,
      difficulty: 'hard',
      lane: 'specialist',
      progress: 67,
    },
    {
      id: 'quest-specialist-2',
      title: 'Code Compliance Expert',
      description: 'Review latest code updates and apply to 5 project estimates.',
      xpReward: 200,
      difficulty: 'medium',
      lane: 'specialist',
      progress: 50,
    },
    {
      id: 'quest-specialist-3',
      title: 'Safety Champion',
      description: 'Complete all safety certifications and train 2 apprentices.',
      xpReward: 250,
      difficulty: 'medium',
      lane: 'specialist',
      progress: 33,
    },
  ],
  merchant: [
    {
      id: 'quest-merchant-1',
      title: 'Network Expansion',
      description: 'Establish relationships with 5 new contractors or builders.',
      xpReward: 250,
      difficulty: 'medium',
      lane: 'merchant',
      progress: 60,
    },
    {
      id: 'quest-merchant-2',
      title: 'Volume Leadership',
      description: 'Process $100K in orders within a single calendar month.',
      xpReward: 350,
      difficulty: 'hard',
      lane: 'merchant',
      progress: 45,
    },
    {
      id: 'quest-merchant-3',
      title: 'Customer Satisfaction',
      description: 'Maintain 98%+ on-time delivery and collect 10 customer reviews.',
      xpReward: 200,
      difficulty: 'easy',
      lane: 'merchant',
      progress: 70,
    },
  ],
  ally: [
    {
      id: 'quest-ally-1',
      title: 'Portfolio Analytics',
      description: 'Create detailed financial reports for all 5 active projects.',
      xpReward: 300,
      difficulty: 'medium',
      lane: 'ally',
      progress: 55,
    },
    {
      id: 'quest-ally-2',
      title: 'Market Analysis',
      description: 'Analyze market trends and identify 3 new high-potential deal opportunities.',
      xpReward: 250,
      difficulty: 'hard',
      lane: 'ally',
      progress: 40,
    },
    {
      id: 'quest-ally-3',
      title: 'Team Development',
      description: 'Conduct 1-on-1 reviews with all 5 project managers and create development plans.',
      xpReward: 200,
      difficulty: 'medium',
      lane: 'ally',
      progress: 30,
    },
  ],
  crew: [
    {
      id: 'quest-crew-1',
      title: 'Safety Training',
      description: 'Complete all available safety training modules.',
      xpReward: 150,
      difficulty: 'easy',
      lane: 'crew',
      progress: 75,
    },
    {
      id: 'quest-crew-2',
      title: 'Team Communication',
      description: 'Actively participate in crew coordination. Send 20 messages this week.',
      xpReward: 100,
      difficulty: 'easy',
      lane: 'crew',
      progress: 60,
    },
    {
      id: 'quest-crew-3',
      title: 'Skill Development',
      description: 'Complete 2 advanced skill training modules specific to your trade.',
      xpReward: 200,
      difficulty: 'medium',
      lane: 'crew',
      progress: 25,
    },
  ],
  fleet: [
    {
      id: 'quest-fleet-1',
      title: 'Operations Optimization',
      description: 'Reduce operational costs by 10% across portfolio without sacrificing quality.',
      xpReward: 400,
      difficulty: 'hard',
      lane: 'fleet',
      progress: 62,
    },
    {
      id: 'quest-fleet-2',
      title: 'Team Scaling',
      description: 'Onboard and integrate 5 new team members. Ensure all complete training.',
      xpReward: 300,
      difficulty: 'medium',
      lane: 'fleet',
      progress: 48,
    },
    {
      id: 'quest-fleet-3',
      title: 'Strategic Planning',
      description: 'Create a 12-month strategic plan including risk assessment and growth targets.',
      xpReward: 350,
      difficulty: 'hard',
      lane: 'fleet',
      progress: 35,
    },
  ],
  machine: [
    {
      id: 'quest-machine-1',
      title: 'Integration Expansion',
      description: 'Successfully integrate with 3 new third-party systems.',
      xpReward: 500,
      difficulty: 'hard',
      lane: 'machine',
      progress: 55,
    },
    {
      id: 'quest-machine-2',
      title: 'Performance Optimization',
      description: 'Reduce average API response time by 20%. Maintain 99.9% uptime.',
      xpReward: 450,
      difficulty: 'hard',
      lane: 'machine',
      progress: 72,
    },
    {
      id: 'quest-machine-3',
      title: 'Scalability Benchmark',
      description: 'Process 100K+ transactions per day with <100ms average latency.',
      xpReward: 600,
      difficulty: 'hard',
      lane: 'machine',
      progress: 40,
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// EXPORT HELPER: Get demo data by lane
// ─────────────────────────────────────────────────────────────

export const getDemoDataForLane = (lane: Lane) => {
  return {
    user: DEMO_USERS[lane],
    briefing: DEMO_BRIEFINGS[lane],
    quests: DEMO_QUESTS[lane],
    achievements: DEMO_ACHIEVEMENTS[lane],
  };
};

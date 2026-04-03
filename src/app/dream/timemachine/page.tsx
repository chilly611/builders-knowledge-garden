'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

type BuildingType = 'SingleFamily' | 'Commercial' | 'Restaurant' | 'DataCenter';

interface Phase {
  id: number;
  name: string;
  description: string;
  duration: string;
  costPercentage: string;
  inspections: string[];
  knowledgeDrops: string[];
  trades: string[];
  color: string;
}

type BuildingTypeConfig = {
  [key in BuildingType]: {
    label: string;
    phases: Phase[];
  };
};

// ============================================================================
// PHASE CONFIGURATIONS FOR EACH BUILDING TYPE
// ============================================================================

const buildingConfigs: BuildingTypeConfig = {
  SingleFamily: {
    label: 'Single Family Home',
    phases: [
      {
        id: 1,
        name: 'Site Prep',
        description: 'Clearing, grading, and preparing the land for construction to begin.',
        duration: '2-4 weeks',
        costPercentage: '3-5%',
        inspections: ['Site grading inspection', 'Soil compaction test'],
        knowledgeDrops: [
          'Proper grading prevents water pooling around the foundation.',
          'Site surveys ensure accurate property lines and building placement.',
        ],
        trades: ['Excavation contractor', 'Land surveyor'],
        color: '#8B6F47',
      },
      {
        id: 2,
        name: 'Foundation',
        description: 'Building footings and concrete foundation/basement installation.',
        duration: '3-6 weeks',
        costPercentage: '8-12%',
        inspections: ['Footer inspection', 'Foundation inspection', 'Waterproofing check'],
        knowledgeDrops: [
          'A strong foundation is critical—it supports your entire house for decades.',
          'Waterproofing now prevents costly basement repairs later.',
        ],
        trades: ['Foundation contractor', 'Concrete finisher'],
        color: '#9CA3AF',
      },
      {
        id: 3,
        name: 'Framing',
        description: 'Wooden frame structure for walls, floors, and roof skeleton.',
        duration: '4-8 weeks',
        costPercentage: '10-15%',
        inspections: ['Framing inspection', 'Roof truss inspection'],
        knowledgeDrops: [
          'Framing is the "skeleton" of your home—it determines layout and strength.',
          'Proper bracing prevents future settling and squeaky floors.',
        ],
        trades: ['Framing carpenter', 'Roofer'],
        color: '#D4A574',
      },
      {
        id: 4,
        name: 'Envelope',
        description: 'Exterior walls, windows, doors, and roofing installation.',
        duration: '3-5 weeks',
        costPercentage: '12-18%',
        inspections: ['Window installation check', 'Roof inspection'],
        knowledgeDrops: [
          'A tight envelope means better insulation and lower energy bills.',
          'Quality windows reduce heating/cooling costs by 15-20%.',
        ],
        trades: ['Window installer', 'Roofer', 'Siding installer'],
        color: '#E8443A',
      },
      {
        id: 5,
        name: 'Rough-In',
        description: 'Plumbing, electrical wiring, and HVAC ductwork installation.',
        duration: '3-4 weeks',
        costPercentage: '15-20%',
        inspections: ['Plumbing rough-in', 'Electrical rough-in', 'HVAC rough-in'],
        knowledgeDrops: [
          'Rough-in is hidden but crucial—mistakes here are expensive to fix later.',
          'Plan outlet locations carefully; moving them later is very costly.',
        ],
        trades: ['Electrician', 'Plumber', 'HVAC technician'],
        color: '#3B82F6',
      },
      {
        id: 6,
        name: 'Insulation & Drywall',
        description: 'Insulation installation and interior wall finishing with drywall.',
        duration: '2-4 weeks',
        costPercentage: '8-12%',
        inspections: ['Insulation inspection', 'Drywall inspection'],
        knowledgeDrops: [
          'R-value determines insulation effectiveness—higher is colder climates.',
          'Proper air sealing reduces HVAC workload by up to 30%.',
        ],
        trades: ['Insulation installer', 'Drywall hanger', 'Taper/finisher'],
        color: '#FBBF24',
      },
      {
        id: 7,
        name: 'Finishes',
        description: 'Flooring, paint, fixtures, cabinets, and trim installation.',
        duration: '4-6 weeks',
        costPercentage: '15-25%',
        inspections: ['Final mechanical inspection', 'Final electrical inspection'],
        knowledgeDrops: [
          'Finish materials have the biggest visual impact on your home.',
          'Quality paint protects the structure and lasts 10+ years.',
        ],
        trades: ['Painter', 'Flooring installer', 'Cabinet maker', 'Trim carpenter'],
        color: '#D85A30',
      },
      {
        id: 8,
        name: 'Landscaping & Completion',
        description: 'Final landscaping, walkways, and project completion.',
        duration: '2-4 weeks',
        costPercentage: '5-8%',
        inspections: ['Final walkthrough', 'Certificate of occupancy'],
        knowledgeDrops: [
          'Landscaping increases curb appeal and home value by 5-10%.',
          'Native plants require less water and maintenance.',
        ],
        trades: ['Landscaper', 'Hardscape installer'],
        color: '#1D9E75',
      },
    ],
  },
  Commercial: {
    label: 'Commercial Office',
    phases: [
      {
        id: 1,
        name: 'Site Prep',
        description: 'Land clearing, grading, and utility location mapping.',
        duration: '3-6 weeks',
        costPercentage: '2-4%',
        inspections: ['Utility survey', 'Site grading'],
        knowledgeDrops: [
          'Commercial sites require detailed environmental assessments.',
          'Utility coordination prevents costly service disruptions.',
        ],
        trades: ['Excavation', 'Survey crew'],
        color: '#8B6F47',
      },
      {
        id: 2,
        name: 'Foundation',
        description: 'Engineered foundation for commercial load requirements.',
        duration: '4-8 weeks',
        costPercentage: '10-15%',
        inspections: ['Soils test', 'Foundation pour inspection'],
        knowledgeDrops: [
          'Commercial foundations handle higher loads and equipment weight.',
          'Proper drainage is essential in multi-story buildings.',
        ],
        trades: ['Foundation engineer', 'Concrete contractor'],
        color: '#9CA3AF',
      },
      {
        id: 3,
        name: 'Framing',
        description: 'Steel or concrete frame structure for multiple stories.',
        duration: '6-10 weeks',
        costPercentage: '12-18%',
        inspections: ['Steel inspection', 'Structural integrity check'],
        knowledgeDrops: [
          'Steel framing allows open floor plans with minimal interior support.',
          'Building codes require fireproofing on structural steel.',
        ],
        trades: ['Structural steel contractor', 'Ironworker'],
        color: '#D4A574',
      },
      {
        id: 4,
        name: 'Envelope',
        description: 'Curtain walls, commercial windows, and roof system.',
        duration: '4-7 weeks',
        costPercentage: '15-22%',
        inspections: ['Curtain wall inspection', 'Waterproofing test'],
        knowledgeDrops: [
          'Commercial curtain walls provide weather protection and aesthetics.',
          'Modern glass coatings reduce solar heat gain by 50%+.',
        ],
        trades: ['Curtain wall installer', 'Commercial roofer'],
        color: '#E8443A',
      },
      {
        id: 5,
        name: 'Rough-In',
        description: 'Complex MEP systems, fire suppression, and automation.',
        duration: '4-6 weeks',
        costPercentage: '18-25%',
        inspections: ['MEP rough-in', 'Fire suppression system test'],
        knowledgeDrops: [
          'Commercial HVAC systems use zone controls for energy efficiency.',
          'Smart building systems can reduce utility costs by 20-30%.',
        ],
        trades: ['Licensed electrician', 'Master plumber', 'HVAC engineer'],
        color: '#3B82F6',
      },
      {
        id: 6,
        name: 'Insulation & Drywall',
        description: 'Acoustic panels, insulation, and fire-rated drywall.',
        duration: '3-5 weeks',
        costPercentage: '8-12%',
        inspections: ['Fire rating inspection', 'Acoustic test'],
        knowledgeDrops: [
          'Acoustic ceiling reduces noise between floors significantly.',
          'Fire-rated walls are required between tenant spaces.',
        ],
        trades: ['Insulation crew', 'Drywall specialist'],
        color: '#FBBF24',
      },
      {
        id: 7,
        name: 'Finishes',
        description: 'Tenant fit-out, paint, flooring, cabinetry, and fixtures.',
        duration: '5-8 weeks',
        costPercentage: '16-28%',
        inspections: ['Final compliance inspection', 'Safety verification'],
        knowledgeDrops: [
          'Commercial finishes must meet ADA accessibility standards.',
          'Durable flooring systems last 20+ years with minimal maintenance.',
        ],
        trades: ['Commercial painter', 'Flooring specialist', 'Trim carpenter'],
        color: '#D85A30',
      },
      {
        id: 8,
        name: 'Landscaping & Completion',
        description: 'Site landscaping, parking, and final approval.',
        duration: '2-4 weeks',
        costPercentage: '3-6%',
        inspections: ['Certificate of occupancy', 'Parking inspection'],
        knowledgeDrops: [
          'Parking lot design affects traffic flow and customer satisfaction.',
          'Green infrastructure reduces stormwater runoff by 70%.',
        ],
        trades: ['Landscape architect', 'Paving contractor'],
        color: '#1D9E75',
      },
    ],
  },
  Restaurant: {
    label: 'Restaurant',
    phases: [
      {
        id: 1,
        name: 'Site Prep',
        description: 'Clearing and preparing commercial kitchen space.',
        duration: '1-2 weeks',
        costPercentage: '2-3%',
        inspections: ['Site survey'],
        knowledgeDrops: [
          'Kitchen exhaust systems require dedicated exterior venting.',
          'Grease trap access is critical for restaurant operations.',
        ],
        trades: ['General contractor'],
        color: '#8B6F47',
      },
      {
        id: 2,
        name: 'Foundation',
        description: 'Reinforced foundation for heavy kitchen equipment.',
        duration: '2-4 weeks',
        costPercentage: '8-10%',
        inspections: ['Slab inspection'],
        knowledgeDrops: [
          'Restaurant slabs must handle 5-10x residential loads.',
          'Proper slope prevents water pooling in kitchens.',
        ],
        trades: ['Foundation contractor'],
        color: '#9CA3AF',
      },
      {
        id: 3,
        name: 'Framing',
        description: 'Interior walls and framing for open kitchen concept.',
        duration: '2-3 weeks',
        costPercentage: '6-10%',
        inspections: ['Framing inspection'],
        knowledgeDrops: [
          'Open kitchens require commercial exhaust hoods.',
          'Soundproofing improves diner experience.',
        ],
        trades: ['Carpenter', 'Framer'],
        color: '#D4A574',
      },
      {
        id: 4,
        name: 'Envelope',
        description: 'Windows, doors, and exterior finish.',
        duration: '1-2 weeks',
        costPercentage: '5-8%',
        inspections: ['Door sealing inspection'],
        knowledgeDrops: [
          'Restaurant doors need automatic closers for code compliance.',
          'Glazing protects against UV fading of décor.',
        ],
        trades: ['Window installer'],
        color: '#E8443A',
      },
      {
        id: 5,
        name: 'Rough-In',
        description: 'Specialized MEP for commercial kitchen—gas, water, drains.',
        duration: '2-3 weeks',
        costPercentage: '15-20%',
        inspections: ['Gas line pressure test', 'Drain line inspection'],
        knowledgeDrops: [
          'Commercial kitchens use 3-phase electrical power.',
          'Hot water demand is much higher in restaurants.',
        ],
        trades: ['Master electrician', 'Gas fitter', 'Plumber'],
        color: '#3B82F6',
      },
      {
        id: 6,
        name: 'Insulation & Drywall',
        description: 'Sound-dampening drywall, grease-resistant finishes.',
        duration: '1-2 weeks',
        costPercentage: '5-8%',
        inspections: ['Moisture barrier test'],
        knowledgeDrops: [
          'Grease-resistant drywall extends wall life in kitchens.',
          'Sound absorption improves dining ambiance.',
        ],
        trades: ['Drywall specialist'],
        color: '#FBBF24',
      },
      {
        id: 7,
        name: 'Finishes',
        description: 'Kitchen equipment install, flooring, wall finish, décor.',
        duration: '3-4 weeks',
        costPercentage: '35-45%',
        inspections: ['Kitchen equipment test', 'Health department approval'],
        knowledgeDrops: [
          'Commercial kitchen equipment selection drives efficiency.',
          'Slip-resistant flooring is mandatory for food prep areas.',
        ],
        trades: ['Equipment installer', 'Tile installer', 'Painter'],
        color: '#D85A30',
      },
      {
        id: 8,
        name: 'Landscaping & Completion',
        description: 'Signage, landscaping, and opening preparations.',
        duration: '2-3 weeks',
        costPercentage: '5-10%',
        inspections: ['Final health inspection', 'Certificate of occupancy'],
        knowledgeDrops: [
          'Outdoor seating increases revenue by 15-25%.',
          'Good lighting attracts customers and improves safety.',
        ],
        trades: ['Landscaper', 'Electrician'],
        color: '#1D9E75',
      },
    ],
  },
  DataCenter: {
    label: 'Data Center',
    phases: [
      {
        id: 1,
        name: 'Site Prep',
        description: 'Seismic assessment and high-security perimeter preparation.',
        duration: '4-8 weeks',
        costPercentage: '2-4%',
        inspections: ['Seismic survey', 'Security perimeter'],
        knowledgeDrops: [
          'Data centers require seismic resilience in earthquake zones.',
          'High-security perimeters prevent unauthorized access.',
        ],
        trades: ['Seismic engineer', 'Security specialist'],
        color: '#8B6F47',
      },
      {
        id: 2,
        name: 'Foundation',
        description: 'Seismic-designed foundation for massive equipment loads.',
        duration: '6-10 weeks',
        costPercentage: '12-18%',
        inspections: ['Seismic testing', 'Load bearing verification'],
        knowledgeDrops: [
          'Data center floors handle 500+ psf loads from servers.',
          'Vibration isolation prevents equipment damage.',
        ],
        trades: ['Seismic structural engineer', 'Foundation specialist'],
        color: '#9CA3AF',
      },
      {
        id: 3,
        name: 'Framing',
        description: 'Raised floor systems and structural support for massive loads.',
        duration: '6-8 weeks',
        costPercentage: '10-15%',
        inspections: ['Structural load test'],
        knowledgeDrops: [
          'Raised floors allow cooling air circulation below servers.',
          'Modular design allows future expansion.',
        ],
        trades: ['Structural engineer', 'Raised floor installer'],
        color: '#D4A574',
      },
      {
        id: 4,
        name: 'Envelope',
        description: 'Reinforced walls, blast-resistant windows, secure entry.',
        duration: '4-6 weeks',
        costPercentage: '15-22%',
        inspections: ['Blast resistance test', 'Seal integrity check'],
        knowledgeDrops: [
          'Blast-resistant construction protects critical infrastructure.',
          'Redundant HVAC penetrations prevent single points of failure.',
        ],
        trades: ['Blast-resistant contractor', 'HVAC penetration specialist'],
        color: '#E8443A',
      },
      {
        id: 5,
        name: 'Rough-In',
        description: 'Redundant electrical, cooling, and network infrastructure.',
        duration: '5-8 weeks',
        costPercentage: '25-35%',
        inspections: ['Electrical redundancy test', 'Cooling capacity test'],
        knowledgeDrops: [
          'N+1 and N+2 redundancy ensure 99.99% uptime.',
          'Precision cooling prevents equipment failure.',
        ],
        trades: ['Electrical engineer', 'Mechanical engineer', 'Network specialist'],
        color: '#3B82F6',
      },
      {
        id: 6,
        name: 'Insulation & Drywall',
        description: 'Fire-rated walls, thermal insulation, cable management.',
        duration: '3-5 weeks',
        costPercentage: '8-12%',
        inspections: ['Fire rating inspection', 'Cable routing verification'],
        knowledgeDrops: [
          'Fire-rated materials protect equipment and data.',
          'Proper cable management improves cooling efficiency.',
        ],
        trades: ['Fire protection specialist', 'Cable installer'],
        color: '#FBBF24',
      },
      {
        id: 7,
        name: 'Finishes',
        description: 'Server installation, monitoring systems, and security.',
        duration: '6-10 weeks',
        costPercentage: '25-40%',
        inspections: ['Equipment certification', 'Security system test'],
        knowledgeDrops: [
          'Server installation requires precision and redundancy.',
          'Monitoring systems track temperature, power, and security 24/7.',
        ],
        trades: ['Server technician', 'Security systems installer'],
        color: '#D85A30',
      },
      {
        id: 8,
        name: 'Landscaping & Completion',
        description: 'Exterior security, final testing, and operational handoff.',
        duration: '3-4 weeks',
        costPercentage: '2-4%',
        inspections: ['Final security audit', 'Operational acceptance test'],
        knowledgeDrops: [
          'Security monitoring runs continuously, 24/7/365.',
          'Operational documentation ensures smooth handoff.',
        ],
        trades: ['Security specialist', 'Operations team'],
        color: '#1D9E75',
      },
    ],
  },
};

// ============================================================================
// BUILDING VISUALIZATION COMPONENT
// ============================================================================

interface BuildingVisualizerProps {
  phase: number;
}

const BuildingVisualizer: React.FC<BuildingVisualizerProps> = ({ phase }) => {
  // Create a stylized building that evolves through construction phases
  // Using CSS layers to represent progressive construction

  const getPhaseStyles = () => {
    switch (phase) {
      case 1:
        // Site prep: just ground
        return {
          ground: { opacity: 1, height: '100px' },
          foundation: { opacity: 0, height: 0 },
          framing: { opacity: 0, height: 0 },
          envelope: { opacity: 0, height: 0 },
          roughIn: { opacity: 0, height: 0 },
          insulation: { opacity: 0, height: 0 },
          finishes: { opacity: 0, height: 0 },
          landscaping: { opacity: 0, height: 0 },
        };
      case 2:
        // Foundation
        return {
          ground: { opacity: 1, height: '100px' },
          foundation: { opacity: 1, height: '80px' },
          framing: { opacity: 0, height: 0 },
          envelope: { opacity: 0, height: 0 },
          roughIn: { opacity: 0, height: 0 },
          insulation: { opacity: 0, height: 0 },
          finishes: { opacity: 0, height: 0 },
          landscaping: { opacity: 0, height: 0 },
        };
      case 3:
        // Framing
        return {
          ground: { opacity: 1, height: '100px' },
          foundation: { opacity: 1, height: '80px' },
          framing: { opacity: 1, height: '160px' },
          envelope: { opacity: 0, height: 0 },
          roughIn: { opacity: 0, height: 0 },
          insulation: { opacity: 0, height: 0 },
          finishes: { opacity: 0, height: 0 },
          landscaping: { opacity: 0, height: 0 },
        };
      case 4:
        // Envelope
        return {
          ground: { opacity: 1, height: '100px' },
          foundation: { opacity: 1, height: '80px' },
          framing: { opacity: 0.3, height: '160px' },
          envelope: { opacity: 1, height: '160px' },
          roughIn: { opacity: 0, height: 0 },
          insulation: { opacity: 0, height: 0 },
          finishes: { opacity: 0, height: 0 },
          landscaping: { opacity: 0, height: 0 },
        };
      case 5:
        // Rough-In
        return {
          ground: { opacity: 1, height: '100px' },
          foundation: { opacity: 1, height: '80px' },
          framing: { opacity: 0.2, height: '160px' },
          envelope: { opacity: 1, height: '160px' },
          roughIn: { opacity: 1, height: '160px' },
          insulation: { opacity: 0, height: 0 },
          finishes: { opacity: 0, height: 0 },
          landscaping: { opacity: 0, height: 0 },
        };
      case 6:
        // Insulation & Drywall
        return {
          ground: { opacity: 1, height: '100px' },
          foundation: { opacity: 1, height: '80px' },
          framing: { opacity: 0, height: '0' },
          envelope: { opacity: 1, height: '160px' },
          roughIn: { opacity: 0.3, height: '160px' },
          insulation: { opacity: 1, height: '160px' },
          finishes: { opacity: 0, height: 0 },
          landscaping: { opacity: 0, height: 0 },
        };
      case 7:
        // Finishes
        return {
          ground: { opacity: 1, height: '100px' },
          foundation: { opacity: 1, height: '80px' },
          framing: { opacity: 0, height: '0' },
          envelope: { opacity: 1, height: '160px' },
          roughIn: { opacity: 0, height: '0' },
          insulation: { opacity: 0.5, height: '160px' },
          finishes: { opacity: 1, height: '160px' },
          landscaping: { opacity: 0, height: 0 },
        };
      case 8:
        // Complete with landscaping
        return {
          ground: { opacity: 1, height: '100px' },
          foundation: { opacity: 1, height: '80px' },
          framing: { opacity: 0, height: '0' },
          envelope: { opacity: 1, height: '160px' },
          roughIn: { opacity: 0, height: '0' },
          insulation: { opacity: 0, height: '0' },
          finishes: { opacity: 1, height: '160px' },
          landscaping: { opacity: 1, height: '120px' },
        };
      default:
        return {
          ground: { opacity: 1, height: '100px' },
          foundation: { opacity: 0, height: 0 },
          framing: { opacity: 0, height: 0 },
          envelope: { opacity: 0, height: 0 },
          roughIn: { opacity: 0, height: 0 },
          insulation: { opacity: 0, height: 0 },
          finishes: { opacity: 0, height: 0 },
          landscaping: { opacity: 0, height: 0 },
        };
    }
  };

  const styles = getPhaseStyles();

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-b from-blue-50 to-white p-8">
      <div className="relative w-full max-w-md h-96 bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col justify-end">
        {/* Landscaping & Trees (Phase 8) */}
        <motion.div
          animate={{
            opacity: styles.landscaping.opacity,
            height: styles.landscaping.height,
          }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="w-full bg-gradient-to-b from-green-200 to-green-300 relative overflow-hidden"
        >
          <div className="flex justify-around px-4 pt-2">
            <div className="w-8 h-16 bg-amber-700 rounded-t-lg relative">
              <div className="absolute -top-4 -left-4 w-16 h-16 bg-green-600 rounded-full opacity-80"></div>
            </div>
            <div className="w-6 h-12 bg-amber-700 rounded-t-lg relative">
              <div className="absolute -top-3 -left-3 w-12 h-12 bg-green-500 rounded-full opacity-70"></div>
            </div>
            <div className="w-8 h-14 bg-amber-700 rounded-t-lg relative">
              <div className="absolute -top-4 -left-4 w-14 h-14 bg-green-600 rounded-full opacity-75"></div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-amber-600 opacity-60"></div>
        </motion.div>

        {/* Finishes (Phase 7) */}
        <motion.div
          animate={{
            opacity: styles.finishes.opacity,
            height: styles.finishes.height,
          }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="w-full bg-gradient-to-b from-amber-100 via-amber-50 to-orange-100 relative border-t-2 border-orange-300"
        >
          <div className="flex justify-around h-full items-center px-4">
            <div className="w-12 h-20 bg-yellow-600 rounded opacity-70"></div>
            <div className="w-12 h-24 bg-yellow-700 rounded opacity-70"></div>
            <div className="w-12 h-20 bg-yellow-600 rounded opacity-70"></div>
          </div>
        </motion.div>

        {/* Insulation & Drywall (Phase 6) */}
        <motion.div
          animate={{
            opacity: styles.insulation.opacity,
            height: styles.insulation.height,
          }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="w-full bg-gradient-to-b from-orange-100 to-orange-50 border-t-2 border-orange-200"
        >
          <div className="w-full h-full flex flex-col justify-between p-2">
            <div className="flex gap-2 justify-around h-1/3">
              <div className="flex-1 bg-orange-200 rounded opacity-50"></div>
              <div className="flex-1 bg-orange-200 rounded opacity-50"></div>
            </div>
            <div className="h-px bg-orange-300 opacity-50"></div>
            <div className="flex gap-2 justify-around h-1/3">
              <div className="flex-1 bg-orange-200 rounded opacity-50"></div>
              <div className="flex-1 bg-orange-200 rounded opacity-50"></div>
            </div>
          </div>
        </motion.div>

        {/* Rough-In (Phase 5) */}
        <motion.div
          animate={{
            opacity: styles.roughIn.opacity,
            height: styles.roughIn.height,
          }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="w-full bg-transparent border-t-2 border-dashed border-blue-300 relative"
        >
          <div className="w-full h-full">
            {/* Electrical lines */}
            <div className="absolute left-4 top-2 bottom-2 w-1 bg-gradient-to-b from-yellow-400 to-yellow-300"></div>
            {/* Plumbing lines */}
            <div className="absolute left-1/2 top-2 bottom-2 w-1.5 bg-gradient-to-b from-blue-400 to-blue-300 rounded-full"></div>
            {/* HVAC ducts */}
            <div className="absolute right-4 top-4 bottom-4 w-2 bg-gradient-to-b from-gray-300 to-gray-200 rounded"></div>
          </div>
        </motion.div>

        {/* Envelope/Exterior (Phase 4) */}
        <motion.div
          animate={{
            opacity: styles.envelope.opacity,
            height: styles.envelope.height,
          }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="w-full bg-gradient-to-b from-red-200 to-orange-100 border-2 border-red-400"
        >
          <div className="flex justify-around px-3 py-2 h-full items-start gap-1">
            <div className="flex-1 bg-blue-300 rounded-sm opacity-70 flex-shrink-0 w-12 h-24"></div>
            <div className="flex-1 bg-blue-300 rounded-sm opacity-70 flex-shrink-0 w-12 h-24"></div>
            <div className="flex-1 bg-blue-300 rounded-sm opacity-70 flex-shrink-0 w-12 h-24"></div>
          </div>
        </motion.div>

        {/* Framing (Phase 3) */}
        <motion.div
          animate={{
            opacity: styles.framing.opacity,
            height: styles.framing.height,
          }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="w-full bg-white border-t-4 border-b-4 border-amber-700 relative"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-amber-50 to-transparent opacity-30"></div>
          <svg className="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
            <line x1="50" y1="0" x2="50" y2="100" stroke="#8B6F47" strokeWidth="2" />
            <line x1="100" y1="0" x2="100" y2="100" stroke="#8B6F47" strokeWidth="2" />
            <line x1="150" y1="0" x2="150" y2="100" stroke="#8B6F47" strokeWidth="2" />
            <line x1="0" y1="50" x2="200" y2="50" stroke="#8B6F47" strokeWidth="1" strokeDasharray="4" />
            {/* Roof triangle */}
            <polygon points="20,0 100,40 180,0" fill="none" stroke="#8B6F47" strokeWidth="2" />
          </svg>
        </motion.div>

        {/* Foundation (Phase 2) */}
        <motion.div
          animate={{
            opacity: styles.foundation.opacity,
            height: styles.foundation.height,
          }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="w-full bg-gradient-to-b from-gray-400 to-gray-600 border-t-2 border-gray-700"
        >
          <div className="flex flex-col gap-1 p-2 h-full justify-around">
            <div className="h-2 bg-gray-500 opacity-70 rounded"></div>
            <div className="h-2 bg-gray-500 opacity-70 rounded"></div>
            <div className="h-2 bg-gray-500 opacity-70 rounded"></div>
          </div>
        </motion.div>

        {/* Ground/Site (Phase 1) */}
        <motion.div
          animate={{
            opacity: styles.ground.opacity,
            height: styles.ground.height,
          }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="w-full bg-gradient-to-b from-amber-700 to-amber-900"
        >
          <div className="w-full h-full opacity-50">
            <svg className="w-full h-full" viewBox="0 0 200 50" preserveAspectRatio="none">
              <circle cx="30" cy="25" r="3" fill="none" stroke="#D2B48C" strokeWidth="1" strokeDasharray="2" />
              <circle cx="70" cy="25" r="3" fill="none" stroke="#D2B48C" strokeWidth="1" strokeDasharray="2" />
              <circle cx="110" cy="25" r="3" fill="none" stroke="#D2B48C" strokeWidth="1" strokeDasharray="2" />
              <circle cx="150" cy="25" r="3" fill="none" stroke="#D2B48C" strokeWidth="1" strokeDasharray="2" />
            </svg>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// ============================================================================
// TIMELINE SCRUBBER COMPONENT
// ============================================================================

interface TimelineScrubberProps {
  currentPhase: number;
  totalPhases: number;
  onPhaseChange: (phase: number) => void;
  phases: Phase[];
  isAutoPlay: boolean;
}

const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  currentPhase,
  totalPhases,
  onPhaseChange,
  phases,
  isAutoPlay,
}) => {
  const handleClick = (phaseIndex: number) => {
    onPhaseChange(phaseIndex + 1);
  };

  const phaseGradients = [
    '#8B6F47', // Brown - Site Prep
    '#9CA3AF', // Gray - Foundation
    '#D4A574', // Tan - Framing
    '#E8443A', // Red - Envelope
    '#3B82F6', // Blue - Rough-In
    '#FBBF24', // Gold - Insulation
    '#D85A30', // Warm - Finishes
    '#1D9E75', // Green - Landscaping
  ];

  return (
    <div className="w-full px-4 py-6 bg-gradient-to-r from-slate-50 to-stone-50">
      <div className="max-w-4xl mx-auto">
        {/* Timeline Title */}
        <h3 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wider">
          Construction Timeline
        </h3>

        {/* Main Timeline Track */}
        <div className="relative">
          {/* Background gradient bar */}
          <div className="absolute inset-0 h-2 bg-gradient-to-r from-amber-700 via-blue-400 to-green-600 rounded-full opacity-20"></div>

          {/* Interactive phase dots */}
          <div className="flex justify-between items-center relative z-10">
            {phases.map((phase, index) => (
              <motion.button
                key={phase.id}
                onClick={() => handleClick(index)}
                className="group relative flex flex-col items-center"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Phase dot */}
                <motion.div
                  className={`
                    w-4 h-4 rounded-full transition-all duration-300
                    ${
                      index + 1 === currentPhase
                        ? 'ring-4 ring-offset-2 shadow-lg'
                        : 'ring-2 ring-offset-1'
                    }
                    ${index + 1 <= currentPhase ? 'ring-green-500' : 'ring-gray-300'}
                  `}
                  style={{
                    backgroundColor: phaseGradients[index],
                  }}
                  animate={{
                    boxShadow:
                      index + 1 === currentPhase
                        ? `0 0 12px ${phaseGradients[index]}`
                        : 'none',
                  }}
                />

                {/* Phase label */}
                <span className="text-xs font-medium mt-2 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  {phase.name}
                </span>

                {/* Tooltip on hover */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  whileHover={{ opacity: 1, y: -20 }}
                  className="absolute -top-8 whitespace-nowrap bg-slate-900 text-white text-xs py-1 px-2 rounded pointer-events-none"
                >
                  {phase.name}
                </motion.div>
              </motion.button>
            ))}
          </div>

          {/* Progress line under completed phases */}
          <motion.div
            className="absolute h-1 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full top-1.5"
            initial={{ width: 0 }}
            animate={{
              width: `${((currentPhase - 1) / (totalPhases - 1)) * 100}%`,
            }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        {/* Phase counter */}
        <div className="flex justify-between items-center mt-6 px-2">
          <span className="text-xs text-slate-500">Phase 1</span>
          <span className="text-sm font-semibold text-slate-700">
            Phase {currentPhase} of {totalPhases}
          </span>
          <span className="text-xs text-slate-500">Phase {totalPhases}</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PHASE INFO PANEL COMPONENT
// ============================================================================

interface PhaseInfoPanelProps {
  phase: Phase;
  xpEarned: boolean;
  buildingType: BuildingType;
}

const PhaseInfoPanel: React.FC<PhaseInfoPanelProps> = ({
  phase,
  xpEarned,
  buildingType,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
    >
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left column: Phase title and description */}
        <div>
          <div className="flex items-baseline gap-3 mb-3">
            <h2 className="text-2xl font-bold text-slate-900">{phase.name}</h2>
            <span
              className="px-3 py-1 rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: phase.color }}
            >
              Phase {phase.id}
            </span>
          </div>

          <p className="text-slate-600 leading-relaxed mb-4">{phase.description}</p>

          {/* XP Badge */}
          {xpEarned && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-400 to-green-400 text-white px-4 py-2 rounded-lg font-semibold mb-4"
            >
              <span className="text-lg">✨</span>
              <span>{phase.name} Knowledge +25 XP</span>
            </motion.div>
          )}

          {/* Key metrics */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Typical Duration:</span>
              <span className="font-semibold text-slate-900">{phase.duration}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Cost Range:</span>
              <span className="font-semibold text-slate-900">{phase.costPercentage}</span>
            </div>
          </div>
        </div>

        {/* Right column: Inspections, trades, and knowledge drops */}
        <div className="space-y-4">
          {/* Inspections */}
          <div>
            <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wide mb-2">
              Required Inspections
            </h3>
            <ul className="space-y-1 text-sm text-slate-700">
              {phase.inspections.map((inspection, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>{inspection}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Trades */}
          <div>
            <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wide mb-2">
              Required Trades
            </h3>
            <div className="flex flex-wrap gap-2">
              {phase.trades.map((trade, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full"
                >
                  {trade}
                </span>
              ))}
            </div>
          </div>

          {/* Knowledge Drops */}
          <div>
            <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wide mb-2">
              Knowledge Drops 💡
            </h3>
            <div className="space-y-2">
              {phase.knowledgeDrops.map((drop, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-gradient-to-r from-purple-100 to-green-100 text-slate-800 text-sm p-3 rounded-lg border border-purple-200 italic"
                >
                  "{drop}"
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function TimeMachinePage() {
  // State management
  const [buildingType, setBuildingType] = useState<BuildingType>('SingleFamily');
  const [currentPhase, setCurrentPhase] = useState(1);
  const [autoPlay, setAutoPlay] = useState(false);
  const [viewedPhases, setViewedPhases] = useState<Set<number>>(new Set([1]));

  const config = buildingConfigs[buildingType];
  const currentPhaseData = config.phases[currentPhase - 1];
  const isNewPhase = !viewedPhases.has(currentPhase);

  // Auto-play timer effect
  useEffect(() => {
    if (!autoPlay) return;

    const interval = setInterval(() => {
      setCurrentPhase((prev) => {
        if (prev >= config.phases.length) {
          setAutoPlay(false);
          return config.phases.length;
        }
        return prev + 1;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [autoPlay, config.phases.length]);

  // Track viewed phases for XP rewards
  useEffect(() => {
    if (!viewedPhases.has(currentPhase)) {
      setViewedPhases((prev) => new Set([...prev, currentPhase]));
    }
  }, [currentPhase, viewedPhases]);

  const handlePhaseChange = (phase: number) => {
    setCurrentPhase(phase);
    setAutoPlay(false);
  };

  const handleBuildingTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setBuildingType(e.target.value as BuildingType);
    setCurrentPhase(1);
    setViewedPhases(new Set([1]));
    setAutoPlay(false);
  };

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-archivo)' }}>
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-50 to-stone-50 border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">🏗️ The Time Machine</h1>
              <p className="text-slate-600 mt-1">
                4D Construction Visualization — Watch your dream building rise
              </p>
            </div>

            {/* Building Type Selector */}
            <div className="flex items-center gap-3">
              <label htmlFor="building-type" className="text-sm font-semibold text-slate-700">
                Building Type:
              </label>
              <select
                id="building-type"
                value={buildingType}
                onChange={handleBuildingTypeChange}
                className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                {(Object.keys(buildingConfigs) as BuildingType[]).map((type) => (
                  <option key={type} value={type}>
                    {buildingConfigs[type].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Building Visualizer */}
        <section className="mb-8 rounded-2xl overflow-hidden shadow-lg bg-white border border-slate-200">
          <BuildingVisualizer phase={currentPhase} />
        </section>

        {/* Timeline Scrubber */}
        <section className="mb-8">
          <TimelineScrubber
            currentPhase={currentPhase}
            totalPhases={config.phases.length}
            onPhaseChange={handlePhaseChange}
            phases={config.phases}
            isAutoPlay={autoPlay}
          />
        </section>

        {/* Auto-Play Controls */}
        <section className="mb-8 flex justify-center gap-4">
          <motion.button
            onClick={() => setAutoPlay(!autoPlay)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              px-6 py-3 rounded-lg font-semibold transition-all
              ${
                autoPlay
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }
            `}
          >
            {autoPlay ? '⏸️ Pause' : '▶️ Play'}
          </motion.button>

          <motion.button
            onClick={() => {
              setCurrentPhase(1);
              setAutoPlay(false);
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 rounded-lg font-semibold bg-slate-500 hover:bg-slate-600 text-white transition-all"
          >
            ↻ Reset
          </motion.button>
        </section>

        {/* Phase Info Panel */}
        <section className="mb-8">
          <AnimatePresence mode="wait">
            <PhaseInfoPanel
              key={currentPhase}
              phase={currentPhaseData}
              xpEarned={isNewPhase}
              buildingType={buildingType}
            />
          </AnimatePresence>
        </section>

        {/* Footer Info */}
        <footer className="text-center py-8 text-slate-500 text-sm border-t border-slate-100 mt-12">
          <p>
            Explore construction phases from site prep to completion. Each phase reveals new details about the building
            process.
          </p>
          <p className="mt-2">
            Total XP Earned: <span className="font-semibold text-slate-900">{viewedPhases.size * 25} XP</span>
          </p>
        </footer>
      </div>
    </main>
  );
}

'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface GridCell {
  roomType: string | null;
  id: string;
}

interface Achievement {
  id: string;
  title: string;
  xp: number;
  timestamp: number;
}

type RoomType = 'living' | 'kitchen' | 'bedroom' | 'bathroom' | 'garage' | 'office' | 'garden' | 'pool';

interface RoomDefinition {
  type: RoomType;
  label: string;
  emoji: string;
  cost: number;
  energyImpact: number;
  complianceBoost: number;
  color: string;
}

// ============================================================================
// ROOM DEFINITIONS & CONSTANTS
// ============================================================================

const ROOM_DEFINITIONS: Record<RoomType, RoomDefinition> = {
  living: { type: 'living', label: 'Living Room', emoji: '🛋️', cost: 25000, energyImpact: -5, complianceBoost: 5, color: '#3B82F6' },
  kitchen: { type: 'kitchen', label: 'Kitchen', emoji: '👨‍🍳', cost: 35000, energyImpact: -10, complianceBoost: 10, color: '#10B981' },
  bedroom: { type: 'bedroom', label: 'Bedroom', emoji: '🛏️', cost: 20000, energyImpact: -3, complianceBoost: 5, color: '#8B5CF6' },
  bathroom: { type: 'bathroom', label: 'Bathroom', emoji: '🚿', cost: 15000, energyImpact: -8, complianceBoost: 8, color: '#06B6D4' },
  garage: { type: 'garage', label: 'Garage', emoji: '🚗', cost: 30000, energyImpact: 5, complianceBoost: 3, color: '#9CA3AF' },
  office: { type: 'office', label: 'Office', emoji: '💼', cost: 28000, energyImpact: -4, complianceBoost: 12, color: '#F97316' },
  garden: { type: 'garden', label: 'Garden', emoji: '🌱', cost: 12000, energyImpact: 15, complianceBoost: 15, color: '#84CC16' },
  pool: { type: 'pool', label: 'Pool', emoji: '🏊', cost: 50000, energyImpact: -20, complianceBoost: 5, color: '#06B6D4' },
};

const GRID_SIZE = 8;
const CELL_SIZE = 60;
const MAX_BUDGET = 500000;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DreamBuilderSim() {
  // State Management
  const [grid, setGrid] = useState<GridCell[]>(
    Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({
      roomType: null,
      id: `cell-${i}`,
    }))
  );

  const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);
  const [budget, setBudget] = useState(250000);
  const [codeCompliance, setCodeCompliance] = useState(50);
  const [energyEfficiency, setEnergyEfficiency] = useState(50);
  const [timeline, setTimeline] = useState(12);
  const [xp, setXp] = useState(0);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [aiDescription, setAiDescription] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<GridCell[][]>([]);

  // Calculations
  const totalRooms = grid.filter((cell) => cell.roomType !== null).length;
  const totalSqFt = totalRooms * 200;
  const estimatedCost = grid.reduce((sum, cell) => {
    if (cell.roomType && cell.roomType in ROOM_DEFINITIONS) {
      return sum + ROOM_DEFINITIONS[cell.roomType as RoomType].cost;
    }
    return sum;
  }, 0);

  const stories = Math.ceil(totalRooms / 8) || 1;

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const triggerAchievement = useCallback(
    (title: string, xpReward: number) => {
      const achievement: Achievement = {
        id: `achievement-${Date.now()}`,
        title,
        xp: xpReward,
        timestamp: Date.now(),
      };

      setAchievements((prev) => [...prev, achievement]);
      setXp((prev) => prev + xpReward);

      // Auto-remove achievement toast after 3 seconds
      setTimeout(() => {
        setAchievements((prev) => prev.filter((a) => a.id !== achievement.id));
      }, 3000);
    },
    []
  );

  const placeBuildingAtIndex = useCallback(
    (index: number) => {
      if (!selectedRoom) return;

      const room = ROOM_DEFINITIONS[selectedRoom];
      const newGrid = [...grid];

      // Check if cell is empty
      if (newGrid[index].roomType !== null) {
        triggerAchievement('Cell Occupied!', 0);
        return;
      }

      // Check budget
      if (estimatedCost + room.cost > MAX_BUDGET) {
        triggerAchievement('Over Budget!', 0);
        return;
      }

      // Save to history for undo
      setHistory((prev) => [...prev, [...grid]]);

      // Place building
      newGrid[index].roomType = selectedRoom;
      setGrid(newGrid);

      // Update resources
      setCodeCompliance((prev) => Math.min(100, prev + room.complianceBoost));
      setEnergyEfficiency((prev) => Math.max(0, Math.min(100, prev + room.energyImpact + 5)));

      // Trigger achievements
      if (totalRooms === 0) {
        triggerAchievement('First Room Placed! +25 XP', 25);
      }

      if (selectedRoom === 'garden') {
        triggerAchievement('Green Living! +40 XP', 40);
      }

      if (selectedRoom === 'office') {
        triggerAchievement('Work From Home! +30 XP', 30);
      }

      triggerAchievement(`${room.label} Added! +10 XP`, 10);
    },
    [selectedRoom, grid, estimatedCost, totalRooms, triggerAchievement]
  );

  const clearGrid = useCallback(() => {
    setHistory((prev) => [...prev, [...grid]]);
    setGrid(Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({ roomType: null, id: `cell-${i}` })));
    setCodeCompliance(50);
    setEnergyEfficiency(50);
    setXp(0);
  }, [grid]);

  const undoLastPlacement = useCallback(() => {
    if (history.length === 0) return;

    const previousState = history[history.length - 1];
    setGrid(previousState);
    setHistory((prev) => prev.slice(0, -1));
    setXp(Math.max(0, xp - 10));
  }, [history, xp]);

  const generateArchitecture = useCallback(() => {
    if (totalRooms === 0) {
      triggerAchievement('Add rooms first!', 0);
      return;
    }

    setIsGenerating(true);

    // Simulate API call
    setTimeout(() => {
      const descriptions = [
        `Your dream home spans ${stories} stories with ${totalRooms} rooms and ${totalSqFt} sq ft. A modern sanctuary optimized for sustainable living with ${energyEfficiency}% energy efficiency.`,
        `Innovative design featuring ${totalRooms} thoughtfully placed rooms. The layout maximizes natural light and airflow, achieving ${codeCompliance}% code compliance with contemporary aesthetics.`,
        `A ${stories}-story residence combining functionality and elegance. With ${totalRooms} specialized spaces totaling ${totalSqFt} sq ft, your home achieves peak efficiency at $${estimatedCost.toLocaleString()}.`,
      ];

      const description = descriptions[Math.floor(Math.random() * descriptions.length)];
      setAiDescription(description);
      setIsGenerating(false);
      triggerAchievement('Architecture Generated! +75 XP', 75);
    }, 2000);
  }, [totalRooms, stories, totalSqFt, energyEfficiency, codeCompliance, estimatedCost, triggerAchievement]);

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderGrid = () => {
    return (
      <div
        style={{
          perspective: '1200px',
          width: 'fit-content',
          margin: '20px auto',
          padding: '20px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
            gap: '0px',
            transform: 'rotateX(60deg) rotateZ(-45deg) scale(0.8)',
            transformStyle: 'preserve-3d',
            width: 'fit-content',
          }}
        >
          {grid.map((cell, index) => (
            <motion.button
              key={cell.id}
              onClick={() => placeBuildingAtIndex(index)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                border: '2px solid #E5E7EB',
                backgroundColor: cell.roomType ? '#F5F5F0' : '#FFFFFF',
                cursor: selectedRoom ? 'pointer' : 'default',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                fontWeight: 'bold',
                transition: 'background-color 0.2s ease',
                position: 'relative',
              }}
            >
              <AnimatePresence>
                {cell.roomType && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                  >
                    {ROOM_DEFINITIONS[cell.roomType as RoomType]?.emoji || '🏠'}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>
      </div>
    );
  };

  const renderPalette = () => {
    return (
      <div style={{ padding: '16px', backgroundColor: '#FAFAF8', borderRadius: '8px', marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#374151', textTransform: 'uppercase' }}>
          Room Palette
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {Object.values(ROOM_DEFINITIONS).map((room) => (
            <motion.button
              key={room.type}
              onClick={() => setSelectedRoom(selectedRoom === room.type ? null : room.type)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '8px 12px',
                backgroundColor: selectedRoom === room.type ? room.color : '#FFFFFF',
                color: selectedRoom === room.type ? '#FFFFFF' : '#1F2937',
                border: `2px solid ${room.color}`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                fontFamily: 'var(--font-archivo, sans-serif)',
                transition: 'all 0.2s ease',
              }}
            >
              {room.emoji} {room.label}
            </motion.button>
          ))}
        </div>
      </div>
    );
  };

  const renderResourceBars = () => {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        {/* Budget */}
        <div style={{ backgroundColor: '#FAFAF8', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '8px', textTransform: 'uppercase' }}>
            Budget: ${budget.toLocaleString()} / $500K
          </div>
          <input
            type="range"
            min="0"
            max="500000"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            style={{
              width: '100%',
              cursor: 'pointer',
              accentColor: '#D85A30',
            }}
          />
        </div>

        {/* Code Compliance */}
        <div style={{ backgroundColor: '#FAFAF8', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '8px', textTransform: 'uppercase' }}>
            Code Compliance: {codeCompliance}%
          </div>
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#E5E7EB',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <motion.div
              animate={{ width: `${codeCompliance}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 15 }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #1D9E75, #10B981)',
              }}
            />
          </div>
        </div>

        {/* Energy Efficiency */}
        <div style={{ backgroundColor: '#FAFAF8', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '8px', textTransform: 'uppercase' }}>
            Energy: {energyEfficiency}%
          </div>
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#E5E7EB',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <motion.div
              animate={{ width: `${energyEfficiency}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 15 }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #D85A30, #F97316)',
              }}
            />
          </div>
        </div>

        {/* Timeline */}
        <div style={{ backgroundColor: '#FAFAF8', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '8px', textTransform: 'uppercase' }}>
            Timeline: {timeline} months
          </div>
          <input
            type="range"
            min="1"
            max="24"
            value={timeline}
            onChange={(e) => setTimeline(Number(e.target.value))}
            style={{
              width: '100%',
              cursor: 'pointer',
              accentColor: '#1D9E75',
            }}
          />
        </div>
      </div>
    );
  };

  const renderStatsPanel = () => {
    return (
      <div style={{ backgroundColor: '#FAFAF8', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#374151', textTransform: 'uppercase' }}>
          Build Stats
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '500', marginBottom: '4px' }}>Total Rooms</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#1D9E75' }}>{totalRooms}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '500', marginBottom: '4px' }}>Total Sq Ft</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#D85A30' }}>{totalSqFt}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '500', marginBottom: '4px' }}>Estimated Cost</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#E8443A' }}>${(estimatedCost / 1000).toFixed(0)}K</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '500', marginBottom: '4px' }}>Stories</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#8B5CF6' }}>{stories}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderActionButtons = () => {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
        <motion.button
          onClick={undoLastPlacement}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            padding: '10px',
            backgroundColor: '#F5F5F0',
            color: '#6B7280',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            cursor: history.length > 0 ? 'pointer' : 'not-allowed',
            fontSize: '12px',
            fontWeight: '600',
            fontFamily: 'var(--font-archivo, sans-serif)',
            opacity: history.length > 0 ? 1 : 0.5,
          }}
          disabled={history.length === 0}
        >
          ↶ Undo
        </motion.button>

        <motion.button
          onClick={clearGrid}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            padding: '10px',
            backgroundColor: '#F5F5F0',
            color: '#6B7280',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            fontFamily: 'var(--font-archivo, sans-serif)',
          }}
        >
          🗑️ Clear
        </motion.button>
      </div>
    );
  };

  const renderGenerateButton = () => {
    return (
      <motion.button
        onClick={generateArchitecture}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={totalRooms === 0 || isGenerating}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: totalRooms === 0 || isGenerating ? '#D1D5DB' : '#D85A30',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '6px',
          cursor: totalRooms === 0 || isGenerating ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '700',
          fontFamily: 'var(--font-archivo, sans-serif)',
          marginBottom: '16px',
          opacity: totalRooms === 0 ? 0.5 : 1,
        }}
      >
        {isGenerating ? '✨ Generating...' : '✨ Generate Architecture'}
      </motion.button>
    );
  };

  const renderAiDescription = () => {
    if (!aiDescription) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          backgroundColor: '#FFFBEB',
          border: '2px solid #FCD34D',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '13px',
          lineHeight: '1.6',
          color: '#78350F',
          fontFamily: 'var(--font-archivo, sans-serif)',
        }}
      >
        <strong>AI Architecture:</strong> {aiDescription}
      </motion.div>
    );
  };

  const renderSideQuests = () => {
    const quests = [
      { title: 'Add a rainwater system', xp: 50, emoji: '💧' },
      { title: 'Include solar panels', xp: 75, emoji: '☀️' },
      { title: 'Create a smart home setup', xp: 60, emoji: '🏠' },
    ];

    return (
      <div style={{ backgroundColor: '#FAFAF8', padding: '16px', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#374151', textTransform: 'uppercase' }}>
          Side Quests
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {quests.map((quest, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.02 }}
              style={{
                padding: '10px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                fontSize: '12px',
                fontFamily: 'var(--font-archivo, sans-serif)',
                cursor: 'pointer',
              }}
            >
              {quest.emoji} {quest.title} <span style={{ color: '#1D9E75', fontWeight: '700' }}>+{quest.xp} XP</span>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div style={{ backgroundColor: '#FFFFFF', minHeight: '100vh', fontFamily: 'var(--font-archivo, sans-serif)' }}>
      {/* Header */}
      <div
        style={{
          padding: '20px',
          backgroundColor: '#FFFFFF',
          borderBottom: '2px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h1 style={{ margin: '0', fontSize: '28px', fontWeight: '800', color: '#1F2937' }}>🏗️ The Sim</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>SimCity meets your dream home</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#D85A30' }}>{xp} XP</div>
          <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '500', marginTop: '4px' }}>EXPERIENCE POINTS</div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '0', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Left: Grid */}
        <div style={{ padding: '20px' }}>
          {renderGrid()}
          {renderAiDescription()}
        </div>

        {/* Right Sidebar */}
        <div style={{ padding: '20px', backgroundColor: '#F9FAFB', borderLeft: '1px solid #E5E7EB', maxHeight: '100vh', overflowY: 'auto' }}>
          {renderResourceBars()}
          {renderPalette()}
          {renderGenerateButton()}
          {renderActionButtons()}
          {renderStatsPanel()}
          {renderSideQuests()}
        </div>
      </div>

      {/* Achievement Toasts */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 50 }}>
        <AnimatePresence>
          {achievements.map((achievement) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, x: 100, y: 0 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 100, y: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{
                backgroundColor: '#1D9E75',
                color: '#FFFFFF',
                padding: '12px 16px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                fontFamily: 'var(--font-archivo, sans-serif)',
              }}
            >
              ✨ {achievement.title}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Mobile Responsive Adjustments */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 300px"] {
            grid-template-columns: 1fr !important;
          }

          div[style*="borderLeft"] {
            border-left: none !important;
            border-top: 1px solid #E5E7EB !important;
          }
        }
      `}</style>
    </div>
  );
}

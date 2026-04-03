'use client';

import React, { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

// Dynamic import of Canvas to avoid SSR issues with Three.js/R3F
const Canvas = dynamic(
  () => import('@react-three/fiber').then(mod => ({ default: mod.Canvas })),
  { ssr: false }
);

// Import R3F hooks and drei components dynamically
const DynamicScene = dynamic(() => Promise.resolve(RoomScene), { ssr: false });

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Room {
  id: string;
  name: string;
  width: number;
  depth: number;
  height: number;
  wallColor: string;
  floorColor: string;
  ceilingColor: string;
  cost: string;
  materials: string[];
  adjacent: string[];
  description: string;
}

interface Style {
  name: string;
  id: string;
  modifier: (room: Room) => Room;
}

type Toast = {
  id: string;
  message: string;
  type: 'success' | 'info';
};

// ============================================================================
// ROOM DATA
// ============================================================================

const ROOMS: Record<string, Room> = {
  livingRoom: {
    id: 'livingRoom',
    name: 'Living Room',
    width: 16,
    depth: 18,
    height: 10,
    wallColor: '#E8D5C4',
    floorColor: '#A0826D',
    ceilingColor: '#FAFAF8',
    cost: '$8,500',
    materials: ['Drywall', 'Hardwood Flooring', 'Paint', 'Baseboards'],
    adjacent: ['kitchen', 'bedroom'],
    description: 'Spacious living area with warm tones and natural light',
  },
  kitchen: {
    id: 'kitchen',
    name: 'Kitchen',
    width: 14,
    depth: 16,
    height: 10,
    wallColor: '#FFFFFF',
    floorColor: '#CCCCCC',
    ceilingColor: '#FAFAF8',
    cost: '$12,000',
    materials: ['Tile Flooring', 'Cabinets', 'Countertops', 'Backsplash'],
    adjacent: ['livingRoom', 'bathroom'],
    description: 'Modern kitchen with clean lines and efficient layout',
  },
  bedroom: {
    id: 'bedroom',
    name: 'Bedroom',
    width: 14,
    depth: 15,
    height: 9,
    wallColor: '#D4E8F0',
    floorColor: '#C4B5A0',
    ceilingColor: '#FAFAF8',
    cost: '$6,200',
    materials: ['Carpet', 'Drywall', 'Paint', 'Trim'],
    adjacent: ['livingRoom', 'bathroom'],
    description: 'Comfortable bedroom with soft, calming colors',
  },
  bathroom: {
    id: 'bathroom',
    name: 'Bathroom',
    width: 8,
    depth: 10,
    height: 9,
    wallColor: '#FFFFFF',
    floorColor: '#E0E0E0',
    ceilingColor: '#FAFAF8',
    cost: '$4,500',
    materials: ['Tile Flooring', 'Tile Walls', 'Fixtures', 'Lighting'],
    adjacent: ['bedroom', 'kitchen'],
    description: 'Bright, clean bathroom with modern fixtures',
  },
  garden: {
    id: 'garden',
    name: 'Garden & Patio',
    width: 20,
    depth: 24,
    height: 0,
    wallColor: '#90C090',
    floorColor: '#7CB342',
    ceilingColor: '#87CEEB',
    cost: '$5,800',
    materials: ['Pavers', 'Gravel', 'Plants', 'Outdoor Lighting'],
    adjacent: ['livingRoom'],
    description: 'Beautiful outdoor space for relaxation and entertainment',
  },
};

// Style modifiers
const STYLES: Style[] = [
  {
    name: 'Modern',
    id: 'modern',
    modifier: (room: Room): Room => ({
      ...room,
      wallColor: '#FFFFFF',
      ceilingColor: '#F5F5F0',
      floorColor: room.id === 'garden' ? room.floorColor : '#D0D0D0',
    }),
  },
  {
    name: 'Mediterranean',
    id: 'mediterranean',
    modifier: (room: Room): Room => ({
      ...room,
      wallColor: '#F4E4C1',
      floorColor: '#C87137',
      ceilingColor: '#FFFAF0',
    }),
  },
  {
    name: 'Industrial',
    id: 'industrial',
    modifier: (room: Room): Room => ({
      ...room,
      wallColor: '#808080',
      floorColor: '#696969',
      ceilingColor: '#555555',
    }),
  },
];

// ============================================================================
// ROOM SCENE COMPONENT (3D Renderer)
// ============================================================================

interface RoomSceneProps {
  room: Room;
  style: Style;
  onRoomExplored?: () => void;
}

function RoomScene({ room, style }: RoomSceneProps) {
  const styledRoom = style.modifier(room);
  const width = styledRoom.width;
  const depth = styledRoom.depth;
  const height = styledRoom.height;

  return (
    <>
      {/* Lighting setup for warm, atmospheric feel */}
      <ambientLight intensity={0.6} color="#FFFFFF" />
      <directionalLight
        position={[10, 8, 5]}
        intensity={0.8}
        color="#FFE4B5"
        castShadow
      />
      <pointLight position={[-5, 5, -5]} intensity={0.3} color="#D85A30" />

      {/* Floor */}
      <mesh position={[0, -height / 2, 0]} receiveShadow>
        <boxGeometry args={[width, 0.5, depth]} />
        <meshStandardMaterial color={styledRoom.floorColor} />
      </mesh>

      {/* Ceiling */}
      {height > 0 && (
        <mesh position={[0, height / 2, 0]} castShadow>
          <boxGeometry args={[width, 0.3, depth]} />
          <meshStandardMaterial color={styledRoom.ceilingColor} />
        </mesh>
      )}

      {/* Front Wall */}
      <mesh position={[0, 0, -depth / 2]} castShadow receiveShadow>
        <boxGeometry args={[width, height, 0.4]} />
        <meshStandardMaterial color={styledRoom.wallColor} />
      </mesh>

      {/* Back Wall */}
      <mesh position={[0, 0, depth / 2]} castShadow receiveShadow>
        <boxGeometry args={[width, height, 0.4]} />
        <meshStandardMaterial color={styledRoom.wallColor} />
      </mesh>

      {/* Left Wall */}
      <mesh position={[-width / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.4, height, depth]} />
        <meshStandardMaterial color={styledRoom.wallColor} />
      </mesh>

      {/* Right Wall */}
      <mesh position={[width / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.4, height, depth]} />
        <meshStandardMaterial color={styledRoom.wallColor} />
      </mesh>

      {/* Decorative accent: floating cube representing a focal point */}
      <mesh position={[0, height / 3, depth / 3]} castShadow>
        <boxGeometry args={[3, 3, 3]} />
        <meshStandardMaterial
          color="#1D9E75"
          emissive="#1D9E75"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Subtle background for depth perception */}
      <fog attach="fog" args={['#FFFFFF', 5, 100]} />
    </>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function Worldwalker() {
  const [currentRoomId, setCurrentRoomId] = useState('livingRoom');
  const [styleId, setStyleId] = useState('modern');
  const [exploredRooms, setExploredRooms] = useState(new Set(['livingRoom']));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const toastIdRef = useRef(0);

  // Get current room object and style object
  const currentRoom = ROOMS[currentRoomId];
  const currentStyle = STYLES.find(s => s.id === styleId) || STYLES[0];

  // Show XP toast when exploring new room
  const showToast = useCallback((message: string, type: 'success' | 'info' = 'info') => {
    const id = String(toastIdRef.current++);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  // Handle room navigation
  const handleRoomChange = useCallback((roomId: string) => {
    setCurrentRoomId(roomId);

    // Award XP for exploring new room
    if (!exploredRooms.has(roomId)) {
      setExploredRooms(prev => new Set([...prev, roomId]));
      showToast(`Room Explored +15 XP`, 'success');
    }
  }, [exploredRooms, showToast]);

  // Calculate total XP earned
  const totalXP = exploredRooms.size * 15;

  return (
    <div className="w-full h-screen bg-white flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-white via-[#FAFAF8] to-white border-b border-gray-100 px-6 py-4 shadow-sm"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">The Worldwalker</h1>
            <p className="text-sm text-gray-600 mt-1">
              Immersive 3D Building Explorer • Walk through your dream project
            </p>
          </div>
          <motion.div
            className="bg-[#1D9E75] text-white px-4 py-2 rounded-lg font-semibold"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
          >
            XP: {totalXP}
          </motion.div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* 3D Canvas Area */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden border border-gray-100"
        >
          <Canvas
            camera={{
              position: [0, 5, 12],
              fov: 75,
              near: 0.1,
              far: 1000,
            }}
            style={{ width: '100%', height: '100%' }}
          >
            <RoomScene room={currentRoom} style={currentStyle} />
          </Canvas>

          {/* Measurement Mode Indicator */}
          {showMeasurements && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute bottom-4 left-4 bg-[#D85A30] text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Measurement Mode Active
            </motion.div>
          )}
        </motion.div>

        {/* Right Sidebar: Controls & Info */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-80 flex flex-col gap-4 overflow-y-auto"
        >
          {/* Room Details Card */}
          <motion.div
            key={currentRoomId}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-[#FAFAF8] rounded-lg p-6 border border-gray-200"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {currentRoom.name}
            </h2>
            <p className="text-gray-600 text-sm mb-4">{currentRoom.description}</p>

            {/* Dimensions */}
            <div className="bg-white rounded p-3 mb-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Room Dimensions
              </p>
              <p className="text-lg font-bold text-gray-900">
                {currentRoom.width}ft × {currentRoom.depth}ft
              </p>
              <p className="text-sm text-gray-600">Height: {currentRoom.height}ft</p>
            </div>

            {/* Cost */}
            <div className="bg-gradient-to-r from-[#1D9E75]/10 to-[#D85A30]/10 rounded p-3 mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                Estimated Cost
              </p>
              <p className="text-2xl font-bold text-[#1D9E75]">
                {currentRoom.cost}
              </p>
            </div>

            {/* Materials */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Materials
              </p>
              <div className="flex flex-wrap gap-2">
                {currentRoom.materials.map((material, idx) => (
                  <motion.span
                    key={idx}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-[#F5F5F0] text-gray-700 text-xs px-3 py-1 rounded-full border border-gray-200"
                  >
                    {material}
                  </motion.span>
                ))}
              </div>
            </div>

            {/* Room Status */}
            <div className="bg-white rounded p-3 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                Status
              </p>
              <p className="text-sm text-gray-700">
                {exploredRooms.has(currentRoomId) ? '✓ Explored' : 'New Room'}
              </p>
            </div>
          </motion.div>

          {/* Navigation to Adjacent Rooms */}
          <div className="bg-[#FAFAF8] rounded-lg p-6 border border-gray-200">
            <p className="text-sm font-semibold text-gray-700 uppercase mb-3">
              Navigate to
            </p>
            <div className="flex flex-col gap-2">
              {currentRoom.adjacent.map(roomId => {
                const adjacentRoom = ROOMS[roomId];
                const isExplored = exploredRooms.has(roomId);
                return (
                  <motion.button
                    key={roomId}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleRoomChange(roomId)}
                    className={`w-full p-3 rounded-lg font-medium transition-all text-left ${
                      isExplored
                        ? 'bg-[#1D9E75] text-white'
                        : 'bg-white text-gray-900 border-2 border-[#D85A30]'
                    }`}
                  >
                    <span className="flex items-center justify-between">
                      <span>{adjacentRoom.name}</span>
                      {isExplored && <span className="text-sm">✓</span>}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Style Selector */}
          <div className="bg-[#FAFAF8] rounded-lg p-6 border border-gray-200">
            <p className="text-sm font-semibold text-gray-700 uppercase mb-3">
              Architectural Style
            </p>
            <div className="flex flex-col gap-2">
              {STYLES.map(style => (
                <motion.button
                  key={style.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStyleId(style.id)}
                  className={`w-full p-3 rounded-lg font-medium transition-all ${
                    styleId === style.id
                      ? 'bg-[#D85A30] text-white'
                      : 'bg-white text-gray-900 border border-gray-200 hover:border-[#D85A30]'
                  }`}
                >
                  {style.name}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Measurement Mode Toggle */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowMeasurements(!showMeasurements)}
            className={`w-full p-4 rounded-lg font-semibold transition-all ${
              showMeasurements
                ? 'bg-[#E8443A] text-white'
                : 'bg-[#F5F5F0] text-gray-900 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            {showMeasurements ? '✓ Measurement Mode ON' : 'Enable Measurement Mode'}
          </motion.button>

          {/* Info Footer */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 text-sm text-blue-900">
            <p className="font-semibold mb-1">Tip:</p>
            <p>
              Use your mouse to rotate the view. Click adjacent rooms to explore and earn XP!
            </p>
          </div>
        </motion.div>
      </div>

      {/* Toast Notifications */}
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg font-semibold text-white shadow-lg ${
              toast.type === 'success' ? 'bg-[#1D9E75]' : 'bg-[#D85A30]'
            }`}
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

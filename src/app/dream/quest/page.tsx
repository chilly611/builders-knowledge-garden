'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// Type definitions
interface Choice {
  text: string;
  token: string;
  description: string;
}

interface Scene {
  id: number;
  title: string;
  narrative: string;
  choices: Choice[];
}

interface QuestResult {
  buildingName: string;
  description: string;
  features: string[];
  estimatedCost: string;
  imagePrompt: string;
}

// Scene data
const SCENES: Scene[] = [
  {
    id: 1,
    title: 'The Landscape',
    narrative: 'You stand on an empty lot. The wind carries the scent of fresh earth. The sun is setting. What landscape calls to you? The foundation is about to be laid.',
    choices: [
      { text: 'Hillside with ocean views', token: 'Ocean Dreamer', description: 'Commanding vistas shape the design' },
      { text: 'Forest clearing', token: 'Forest Keeper', description: 'Trees guide the architecture' },
      { text: 'Urban corner lot', token: 'City Builder', description: 'The grid becomes your canvas' }
    ]
  },
  {
    id: 2,
    title: 'The Light',
    narrative: 'Golden light floods the site. You close your eyes and imagine the building washed in sun throughout the day. What time of day does this home belong to?',
    choices: [
      { text: 'Golden sunrise', token: 'Dawn Seeker', description: 'East-facing windows greet the day' },
      { text: 'Bright midday sun', token: 'Sun Worshipper', description: 'Open courtyards capture light' },
      { text: 'Dramatic sunset', token: 'Twilight Lover', description: 'West terraces glow with warmth' }
    ]
  },
  {
    id: 3,
    title: 'The Approach',
    narrative: 'A visitor arrives. You see them parking, stepping out of their car. How do they first encounter this building? What journey do they take?',
    choices: [
      { text: 'Winding garden path', token: 'Secret Garden', description: 'Nature reveals the entry slowly' },
      { text: 'Grand courtyard', token: 'Grand Entrance', description: 'Arrival is an event in itself' },
      { text: 'Hidden door', token: 'Mystery Maker', description: 'Discovery is the first delight' }
    ]
  },
  {
    id: 4,
    title: 'The Heart',
    narrative: 'Inside, your family gathers. Where is the heart of this home? What space calls everyone back day after day, year after year?',
    choices: [
      { text: 'Kitchen island', token: 'Gathering Stone', description: 'Warmth, food, and connection' },
      { text: 'Library fireplace', token: 'Knowledge Keeper', description: 'Quiet wisdom and refuge' },
      { text: 'Open courtyard', token: 'Sky Beholder', description: 'Light and air become the anchor' }
    ]
  },
  {
    id: 5,
    title: 'The Sanctuary',
    narrative: 'When you need solitude—when the world feels too loud—where do you retreat? Every home needs a refuge.',
    choices: [
      { text: 'Rooftop terrace', token: 'Star Gazer', description: 'Escape skyward into contemplation' },
      { text: 'Sunken living room', token: 'Earth Dweller', description: 'Sink into stillness and depth' },
      { text: 'Walled garden', token: 'Water Whisper', description: 'Nature provides the silence' }
    ]
  },
  {
    id: 6,
    title: 'The Material',
    narrative: 'You run your hand across the walls. What does this building feel like to touch? What materials speak to your soul?',
    choices: [
      { text: 'Reclaimed wood', token: 'Wood Whisperer', description: 'History embedded in grain and knot' },
      { text: 'Polished concrete', token: 'Stone Heart', description: 'Raw, honest, ancient minimalism' },
      { text: 'Living walls', token: 'Green Soul', description: 'Breathing, growing, alive spaces' }
    ]
  },
  {
    id: 7,
    title: 'The Spirit',
    narrative: 'What energy does this space carry? Not what it looks like, but how it *feels* when you walk through the door. What mood does it set?',
    choices: [
      { text: 'Quiet reverence', token: 'Zen Master', description: 'Stillness is the highest luxury' },
      { text: 'Playful energy', token: 'Joy Spark', description: 'Delight surprises at every turn' },
      { text: 'Bold confidence', token: 'Power Tower', description: 'Strength and vision on display' }
    ]
  },
  {
    id: 8,
    title: 'The Legacy',
    narrative: 'You step back in time. One hundred years from now, what will people say about this building? What legacy does it leave?',
    choices: [
      { text: 'Exceptional craftsmanship', token: 'Timeless Craft', description: 'Details that endure and inspire' },
      { text: 'Harmony with nature', token: "Nature's Child", description: 'In balance with the earth itself' },
      { text: 'Bold innovation', token: 'Future Forward', description: 'Ahead of its time, forever' }
    ]
  }
];

const BOSS_SCENE: Scene = {
  id: 9,
  title: 'The Zoning Board',
  narrative: 'A letter arrives. The zoning board says you cannot build as high as you dreamed. The code limits your vision. How do you respond to this constraint?',
  choices: [
    { text: 'Negotiate a variance', token: 'Diplomat', description: 'Persuade through partnership' },
    { text: 'Go underground', token: 'Depth Explorer', description: 'Build below to build higher' },
    { text: 'Redesign with grace', token: 'Shape Shifter', description: 'Let constraints spark creativity' }
  ]
};

// Generate quest result from tokens
function generateQuestResult(tokens: string[]): QuestResult {
  const tokenDescriptions: { [key: string]: string } = {
    'Ocean Dreamer': 'sweeping water views',
    'Forest Keeper': 'natural forest surroundings',
    'City Builder': 'urban density and connectivity',
    'Dawn Seeker': 'eastern light and morning clarity',
    'Sun Worshipper': 'open sky and abundant daylight',
    'Twilight Lover': 'western exposure and evening warmth',
    'Secret Garden': 'winding garden paths',
    'Grand Entrance': 'grand courtyard arrival',
    'Mystery Maker': 'hidden entryways and discovery',
    'Gathering Stone': 'central kitchen and gathering spaces',
    'Knowledge Keeper': 'library and quiet study areas',
    'Sky Beholder': 'open courtyard light wells',
    'Star Gazer': 'rooftop terraces and sky access',
    'Earth Dweller': 'sunken living spaces and depth',
    'Water Whisper': 'walled gardens and water features',
    'Wood Whisperer': 'reclaimed wood throughout',
    'Stone Heart': 'polished concrete and stone',
    'Green Soul': 'living walls and biophilic design',
    'Zen Master': 'minimalist aesthetic and silence',
    'Joy Spark': 'playful design elements',
    'Power Tower': 'bold geometric forms',
    'Timeless Craft': 'exceptional attention to detail',
    "Nature's Child": 'sustainable and regenerative systems',
    'Future Forward': 'cutting-edge materials and methods',
    'Diplomat': 'navigated zoning complexities',
    'Depth Explorer': 'strategic basement integration',
    'Shape Shifter': 'adaptive and flexible design'
  };

  const descriptions = tokens.map(t => tokenDescriptions[t] || t.toLowerCase()).join(', ');

  const buildingName = `The ${tokens[Math.floor(Math.random() * tokens.length)]} Residence`;

  const features = [
    'Custom site analysis and grading',
    'Integrated landscape design',
    'Thoughtful material palette',
    'Responsive daylighting strategy',
    'Flexible interior spaces',
    'Outdoor room extensions',
    'High-performance envelope'
  ];

  const imagePrompt = `A stunning architectural rendering of ${buildingName.toLowerCase()}: A contemporary residence featuring ${descriptions}. The design reflects ${tokens.slice(0, 3).join(', ').toLowerCase()}. Rendered in photorealistic style with dramatic lighting, showing the full elevation and surrounding landscape. High-end architectural photography quality.`;

  return {
    buildingName,
    description: `A home born from your deepest architectural aspirations. Every decision in your quest shaped this design—${descriptions}. This is not just a building; it is a reflection of how you live.`,
    features,
    estimatedCost: '$2.1M - $3.8M',
    imagePrompt
  };
}

// Main component
export default function QuestPage() {
  const [phase, setPhase] = useState<'intro' | 'journey' | 'boss' | 'synthesis' | 'result'>('intro');
  const [sceneIndex, setSceneIndex] = useState(0);
  const [collectedTokens, setCollectedTokens] = useState<string[]>([]);
  const [result, setResult] = useState<QuestResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleBeginQuest = useCallback(() => {
    setPhase('journey');
  }, []);

  const handleChoice = useCallback((token: string) => {
    const newTokens = [...collectedTokens, token];
    setCollectedTokens(newTokens);

    if (sceneIndex < 7) {
      // Continue through journey
      setSceneIndex(sceneIndex + 1);
    } else if (sceneIndex === 7) {
      // Move to boss scene
      setPhase('boss');
      setSceneIndex(0);
    }
  }, [sceneIndex, collectedTokens]);

  const handleBossChoice = useCallback((token: string) => {
    const finalTokens = [...collectedTokens, token];
    setCollectedTokens(finalTokens);
    setPhase('synthesis');
    triggerSynthesis(finalTokens);
  }, [collectedTokens]);

  const triggerSynthesis = async (tokens: string[]) => {
    setIsLoading(true);

    // Generate result
    const questResult = generateQuestResult(tokens);
    setResult(questResult);

    // Attempt to fetch FLUX render
    try {
      const renderRes = await fetch('/api/v1/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: questResult.imagePrompt,
          style: 'exterior',
          aspect: 'landscape',
          quality: 'standard'
        })
      });

      if (renderRes.ok) {
        const data = await renderRes.json();
        if (data.success && data.renders?.[0]?.imageUrl) {
          setImageUrl(data.renders[0].imageUrl);
        }
      }
    } catch (error) {
      console.log('Render endpoint not available; using placeholder');
    }

    // Transition to result after synthesis
    setTimeout(() => {
      setPhase('result');
      setIsLoading(false);
    }, 3000);
  };

  const handleNewQuest = useCallback(() => {
    setPhase('intro');
    setSceneIndex(0);
    setCollectedTokens([]);
    setResult(null);
    setImageUrl(null);
  }, []);

  const currentScene = phase === 'boss' ? BOSS_SCENE : SCENES[sceneIndex];
  const progressText = phase === 'boss' ? 'Boss Battle' : `Scene ${sceneIndex + 1} of 8`;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', color: '#ffffff', fontFamily: 'var(--font-archivo)', overflow: 'hidden' }}>
      {/* Back button */}
      <Link href="/dream" style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 50, textDecoration: 'none' }}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            background: 'transparent',
            border: '1px solid #D85A30',
            color: '#D85A30',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            transition: 'all 0.3s ease'
          }}
        >
          ← Dream Machine
        </motion.button>
      </Link>

      {/* Intro Phase */}
      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{
              minHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 20px',
              textAlign: 'center',
              position: 'relative'
            }}
          >
            {/* Animated background gradient */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at center, #1a1a1a 0%, #0a0a0a 100%)',
                zIndex: 0
              }}
            />

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              style={{ position: 'relative', zIndex: 1 }}
            >
              <h1
                style={{
                  fontSize: '64px',
                  fontWeight: 900,
                  marginBottom: '24px',
                  background: 'linear-gradient(135deg, #D85A30 0%, #C4A44A 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontFamily: 'var(--font-archivo-black), sans-serif'
                }}
              >
                THE QUEST
              </h1>

              <motion.div
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 4, repeat: Infinity }}
                style={{
                  fontSize: '48px',
                  marginBottom: '40px',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                🏗️
              </motion.div>

              <p style={{ fontSize: '20px', maxWidth: '600px', lineHeight: 1.6, color: '#cccccc', marginBottom: '48px' }}>
                You stand on an empty lot. The wind carries the scent of fresh earth. The sun is setting. What do you see?
              </p>

              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 30px #D85A30' }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBeginQuest}
                style={{
                  padding: '16px 48px',
                  fontSize: '18px',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #D85A30 0%, #C4A44A 100%)',
                  color: '#0a0a0a',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(216, 90, 48, 0.3)',
                  transition: 'all 0.3s ease'
                }}
              >
                Begin Your Quest
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Journey Phase */}
      <AnimatePresence mode="wait">
        {(phase === 'journey' || phase === 'boss') && (
          <motion.div
            key={`scene-${sceneIndex}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
            style={{
              minHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '60px 40px 40px',
              position: 'relative'
            }}
          >
            {/* Progress indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ fontSize: '14px', color: '#888', textTransform: 'uppercase', letterSpacing: '2px' }}
              >
                {progressText}
              </motion.div>
              <motion.div style={{ display: 'flex', gap: '8px' }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor:
                        i < (phase === 'boss' ? 8 : sceneIndex + 1) ? '#D85A30' : 'rgba(216, 90, 48, 0.2)',
                      transition: 'background-color 0.3s ease'
                    }}
                  />
                ))}
              </motion.div>
            </div>

            {/* Scene content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              <motion.h2
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{
                  fontSize: '32px',
                  fontWeight: 800,
                  marginBottom: '20px',
                  color: '#D85A30',
                  fontFamily: 'var(--font-archivo-black), sans-serif'
                }}
              >
                {currentScene.title}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{
                  fontSize: '20px',
                  lineHeight: 1.8,
                  color: '#dddddd',
                  marginBottom: '60px',
                  fontStyle: 'italic'
                }}
              >
                {currentScene.narrative}
              </motion.p>

              {/* Choice cards */}
              <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                {currentScene.choices.map((choice, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + idx * 0.1 }}
                    whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(216, 90, 48, 0.3)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => (phase === 'boss' ? handleBossChoice(choice.token) : handleChoice(choice.token))}
                    style={{
                      padding: '24px',
                      backgroundColor: '#151515',
                      border: '2px solid #D85A30',
                      borderRadius: '12px',
                      color: '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#C4A44A' }}>{choice.text}</div>
                    <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.5 }}>{choice.description}</div>
                  </motion.button>
                ))}
              </motion.div>
            </div>

            {/* Collected tokens display */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              style={{
                marginTop: '60px',
                paddingTop: '20px',
                borderTop: '1px solid #333',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                alignItems: 'center'
              }}
            >
              <span style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>Collected Tokens:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {collectedTokens.map((token, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1, boxShadow: ['0 0 10px #D85A30', '0 0 20px #D85A30', '0 0 10px #D85A30'] }}
                    transition={{ delay: 0.5 + idx * 0.05, boxShadow: { duration: 2, repeat: Infinity } }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'rgba(216, 90, 48, 0.1)',
                      border: '1px solid #D85A30',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#C4A44A'
                    }}
                  >
                    ✨ {token}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Synthesis Phase */}
      <AnimatePresence mode="wait">
        {phase === 'synthesis' && (
          <motion.div
            key="synthesis"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              minHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px'
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              style={{
                fontSize: '80px',
                marginBottom: '40px'
              }}
            >
              ✨
            </motion.div>

            <h2
              style={{
                fontSize: '32px',
                fontWeight: 800,
                color: '#D85A30',
                marginBottom: '20px',
                fontFamily: 'var(--font-archivo-black), sans-serif'
              }}
            >
              Synthesizing Your Vision
            </h2>

            <p style={{ fontSize: '16px', color: '#aaaaaa', maxWidth: '500px', textAlign: 'center', lineHeight: 1.6 }}>
              Your choices are converging. Design tokens are swirling. Your unique building concept is taking shape...
            </p>

            {/* Swirling tokens animation */}
            <div style={{ position: 'relative', width: '200px', height: '200px', marginTop: '60px' }}>
              {collectedTokens.map((token, idx) => (
                <motion.div
                  key={idx}
                  animate={{
                    x: Math.cos((idx / collectedTokens.length) * Math.PI * 2) * 100,
                    y: Math.sin((idx / collectedTokens.length) * Math.PI * 2) * 100,
                    rotate: 360
                  }}
                  transition={{
                    duration: 3 + idx * 0.2,
                    repeat: Infinity,
                    ease: 'linear'
                  }}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#C4A44A',
                    padding: '4px 8px',
                    backgroundColor: 'rgba(216, 90, 48, 0.1)',
                    borderRadius: '12px',
                    border: '1px solid #D85A30',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {token}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Phase */}
      <AnimatePresence mode="wait">
        {phase === 'result' && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{
              minHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '60px 40px 40px',
              overflowY: 'auto'
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                maxWidth: '900px',
                margin: '0 auto',
                width: '100%'
              }}
            >
              {/* Header */}
              <h1
                style={{
                  fontSize: '48px',
                  fontWeight: 900,
                  color: '#D85A30',
                  marginBottom: '12px',
                  fontFamily: 'var(--font-archivo-black), sans-serif'
                }}
              >
                {result.buildingName}
              </h1>

              <p style={{ fontSize: '14px', color: '#888', marginBottom: '40px', textTransform: 'uppercase', letterSpacing: '2px' }}>
                Your Quest is Complete
              </p>

              {/* Image placeholder */}
              {imageUrl ? (
                <motion.img
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  src={imageUrl}
                  alt={result.buildingName}
                  style={{
                    width: '100%',
                    borderRadius: '12px',
                    marginBottom: '40px',
                    border: '2px solid #D85A30',
                    maxHeight: '500px',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  style={{
                    width: '100%',
                    height: '400px',
                    backgroundColor: '#151515',
                    borderRadius: '12px',
                    border: '2px dashed #D85A30',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '40px',
                    fontSize: '48px',
                    color: '#666'
                  }}
                >
                  🏗️
                </motion.div>
              )}

              {/* Description */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                style={{
                  fontSize: '18px',
                  lineHeight: 1.8,
                  color: '#cccccc',
                  marginBottom: '40px',
                  fontStyle: 'italic'
                }}
              >
                {result.description}
              </motion.p>

              {/* Features */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#C4A44A', marginBottom: '20px' }}>
                  Design Features
                </h2>
                <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '40px', listStyle: 'none', padding: 0 }}>
                  {result.features.map((feature, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + idx * 0.05 }}
                      style={{
                        padding: '12px 16px',
                        backgroundColor: '#151515',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        color: '#aaaaaa',
                        fontSize: '14px'
                      }}
                    >
                      ✓ {feature}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>

              {/* Tokens */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#C4A44A', marginBottom: '20px' }}>
                  Your Design Tokens
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '40px' }}>
                  {collectedTokens.map((token, idx) => (
                    <motion.span
                      key={idx}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.8 + idx * 0.05 }}
                      style={{
                        padding: '10px 18px',
                        backgroundColor: 'rgba(216, 90, 48, 0.1)',
                        border: '1px solid #D85A30',
                        borderRadius: '24px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#C4A44A'
                      }}
                    >
                      ✨ {token}
                    </motion.span>
                  ))}
                </div>
              </motion.div>

              {/* Cost */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.85 }}
                style={{
                  padding: '24px',
                  backgroundColor: '#151515',
                  border: '1px solid #333',
                  borderRadius: '12px',
                  marginBottom: '40px'
                }}
              >
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Estimated Project Investment
                </p>
                <p style={{ fontSize: '24px', fontWeight: 800, color: '#D85A30' }}>
                  {result.estimatedCost}
                </p>
              </motion.div>

              {/* New quest button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                whileHover={{ scale: 1.05, boxShadow: '0 0 30px #D85A30' }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNewQuest}
                style={{
                  padding: '16px 48px',
                  fontSize: '16px',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #D85A30 0%, #C4A44A 100%)',
                  color: '#0a0a0a',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(216, 90, 48, 0.3)',
                  transition: 'all 0.3s ease',
                  width: '100%',
                  maxWidth: '300px',
                  margin: '0 auto'
                }}
              >
                Start New Quest
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

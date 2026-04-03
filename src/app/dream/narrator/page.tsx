'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// Story data structure
interface Scene {
  title: string;
  text: string;
  imagePrompt: string;
}

interface Story {
  title: string;
  location: string;
  vibe: string;
  scale: string;
  scenes: Scene[];
  concept: {
    name: string;
    description: string;
    features: string[];
    materials: string[];
  };
}

// Pre-generated stories
const STORIES: Record<string, Story> = {
  'monday-coastal-minimalist': {
    title: 'A Monday Morning',
    location: 'Coastal',
    vibe: 'Minimalist',
    scale: 'Cottage',
    scenes: [
      {
        title: 'The Awakening',
        text: "You open your eyes. The ceiling above you is raw concrete, softened by warm light filtering through floor-to-ceiling glass. The Pacific stretches endlessly beyond your bedroom wall. You don't need an alarm here — the light wakes you gently, the way it has every morning since you moved in.",
        imagePrompt: 'Minimalist coastal bedroom, raw concrete ceiling, floor to ceiling glass wall overlooking Pacific ocean, morning golden light, modern architecture',
      },
      {
        title: 'The Ritual',
        text: 'Your bare feet meet heated concrete as you pad toward the kitchen. The island — a single slab of honed marble — catches the early light. You press a button; the coffee machine hums. Through the open window, salt air mixes with fresh grounds.',
        imagePrompt: 'Modern minimalist kitchen, honed marble island, heated concrete floors, ocean view through window, morning light, coffee',
      },
      {
        title: 'The View',
        text: 'Coffee in hand, you step onto the terrace. The cantilever extends twelve feet over the hillside — nothing but glass railing between you and the horizon. Dolphins break the surface. You lean against warm wood railing and breathe.',
        imagePrompt: 'Cantilevered terrace overlooking ocean, glass railing, modern architecture, person with coffee, dolphins in distance, morning',
      },
      {
        title: 'The Garden',
        text: 'You follow stepping stones down to the garden level. Succulents and native grasses frame a lap pool reflecting the sky. The outdoor shower — exposed copper, surrounded by bamboo — beckons.',
        imagePrompt: 'Modern coastal garden, lap pool, succulents, native grasses, outdoor copper shower, bamboo, hillside',
      },
      {
        title: 'The Studio',
        text: 'Back inside, your studio occupies the entire north wing. Clerestory windows pour even light across your workspace. The walls are raw plywood — pinned with sketches, samples, inspirations. This room is why you built this house.',
        imagePrompt: 'Artist studio north light, clerestory windows, raw plywood walls, creative workspace, modern architecture, natural light',
      },
      {
        title: 'The Evening',
        text: 'As the sun drops, the house transforms. Recessed lighting warms the concrete. The fireplace — a slot of flame in a steel wall — throws dancing shadows. You sink into the sectional, the ocean now black and silver. This is home.',
        imagePrompt: 'Modern living room evening, fireplace slot in steel wall, ocean view at sunset, warm lighting, concrete and wood interior',
      },
    ],
    concept: {
      name: 'Horizon House',
      description: 'A minimalist coastal retreat where light, material, and landscape merge into a single unified experience. Every room frames the view. Every material speaks to its environment.',
      features: ['Cantilevered terrace', 'Artist studio with north light', 'Outdoor copper shower', 'Lap pool', 'Sleeping pavilion with glass walls'],
      materials: ['Raw concrete', 'Honed marble', 'Steel frames', 'Glass', 'Native plants'],
    },
  },
  'thanksgiving-mountain-rustic': {
    title: 'Hosting Thanksgiving',
    location: 'Mountain',
    vibe: 'Warm & Rustic',
    scale: 'Family Home',
    scenes: [
      {
        title: 'The Preparation',
        text: 'Dawn breaks over the peaks. You\'re already in the kitchen — a room that could seat twenty. The Douglas fir beams above you are two hundred years old. The six-burner range throws warmth into the room as the turkey goes in.',
        imagePrompt: 'Rustic mountain kitchen, Douglas fir beams, professional range, Thanksgiving preparation, mountain view dawn, warm lighting',
      },
      {
        title: 'The Table',
        text: 'The dining table — a single slab of live-edge walnut — stretches fourteen feet. You lay out the plates. Through the window wall, aspen trees glow gold. Twenty-two chairs. All of them will be full today.',
        imagePrompt: 'Live edge walnut dining table, 22 chairs, mountain window wall, golden aspen trees, Thanksgiving table setting, rustic elegance',
      },
      {
        title: 'The Arrival',
        text: 'Cars wind up the gravel drive. Children burst through the stone entry arch and scatter across the meadow. The front door — reclaimed barn wood, iron hardware — stands open. The house opens its arms.',
        imagePrompt: 'Mountain home stone entry arch, reclaimed barn wood door, gravel driveway, children playing, meadow, warm welcome, rustic architecture',
      },
      {
        title: 'The Gathering',
        text: 'The great room fills with voices. The fireplace — a floor-to-ceiling stone chimney — anchors the space. Someone plays piano in the corner. The ceiling soars twenty-five feet. Even full of people, the room breathes.',
        imagePrompt: 'Grand great room, floor to ceiling stone fireplace, piano corner, vaulted ceiling 25 feet, mountain lodge, warm gathering, Thanksgiving',
      },
      {
        title: 'The Feast',
        text: 'The meal is served. Candlelight catches the copper pendant lights above the table. Through the glass, snow begins to fall on the peaks. Laughter echoes off stone walls. Three generations, one table, this house holding them all.',
        imagePrompt: 'Thanksgiving feast, copper pendant lights, candlelight, snow falling on mountain peaks through window, multi-generational family dinner',
      },
      {
        title: 'The Quiet',
        text: 'They\'re gone. The house settles. You sit by the embers in the reading nook — a window seat carved into the stone wall. A blanket, a whiskey, the mountains. The house remembers every gathering. So do you.',
        imagePrompt: 'Stone window seat reading nook, dying embers fireplace, whiskey, mountain view at night, cozy blanket, quiet evening after gathering',
      },
    ],
    concept: {
      name: 'Gathering Lodge',
      description: 'A multigenerational mountain home built for connection. Heavy timber, hand-finished stone, and a soaring central space transform family time into ritual. A house designed to be full.',
      features: ['Great room with 25-ft ceiling', 'Live-edge walnut table (seats 22)', 'Floor-to-ceiling stone fireplace', 'Professional kitchen', 'Reading nook window seat'],
      materials: ['Douglas fir beams', 'Hand-laid stone', 'Live-edge walnut', 'Reclaimed barn wood', 'Copper accents'],
    },
  },
  'saturday-urban-bold': {
    title: 'A Rainy Saturday Afternoon',
    location: 'Urban',
    vibe: 'Bold & Modern',
    scale: 'Grand Estate',
    scenes: [
      {
        title: 'The Rain',
        text: 'Rain drums on the steel roof. You\'re on the top floor — a converted warehouse, all exposed brick and industrial steel. The skylights turn the rain into percussion. You pull the duvet higher and watch the city blur.',
        imagePrompt: 'Urban loft bedroom, industrial warehouse conversion, exposed brick, steel beams, rain on skylights, city view blurred by rain, moody',
      },
      {
        title: 'The Kitchen',
        text: 'You descend the floating steel staircase to the kitchen level. The island is polished black granite. The espresso machine is Italian and serious. Rain streams down the two-story window wall. The city is a watercolor.',
        imagePrompt: 'Industrial urban kitchen, floating steel staircase, black granite island, Italian espresso machine, two story window wall, rainy city view',
      },
      {
        title: 'The Library',
        text: 'Coffee in hand, you cross to the library. Floor to ceiling bookshelves line the old brick wall. A rolling ladder. A Barcelona chair. The rain is louder here — the metal roof section above turns water into music.',
        imagePrompt: 'Urban industrial library, floor to ceiling bookshelves on brick wall, rolling ladder, Barcelona chair, metal roof rain, moody lighting',
      },
      {
        title: 'The Studio',
        text: 'Your creative space occupies the mezzanine. A drafting table faces the north-light window. Concrete floors, track lighting, a massive cork wall covered in your work. The rain makes you productive.',
        imagePrompt: 'Urban mezzanine creative studio, drafting table, north light window, concrete floors, track lighting, cork inspiration wall, rainy day',
      },
      {
        title: 'The Terrace',
        text: 'The rain pauses. You step onto the rooftop terrace — steel planters, string lights, the city skyline. The hot tub steams in the cool air. You sink in and watch clouds race over downtown.',
        imagePrompt: 'Urban rooftop terrace, steel planters, string lights, city skyline, hot tub steaming, clouds, post-rain, industrial modern',
      },
      {
        title: 'The Night',
        text: 'Evening. The loft glows. Pendant Edison bulbs reflect off polished concrete. You\'re on the sectional, rain returning, a film projected on the white brick wall. This warehouse remembers its past. But tonight, it\'s yours.',
        imagePrompt: 'Industrial loft evening, Edison pendant bulbs, polished concrete, projector on white brick wall, cozy sectional, rain, urban night',
      },
    ],
    concept: {
      name: 'Industrial Sanctuary',
      description: 'A warehouse reimagined as a creative refuge. Raw materials, open floors, and dramatic vertical space create an urban retreat where light, shadow, and water become design elements.',
      features: ['Rooftop hot tub terrace', 'Mezzanine studio', 'Library with rolling ladder', 'Two-story window wall', 'Floating steel staircase'],
      materials: ['Exposed brick', 'Steel beams', 'Polished concrete', 'Black granite', 'Edison bulb lighting'],
    },
  },
};

// Phase type
type Phase = 'intro' | 'customize' | 'reading' | 'concept';

// Main component
export default function NarratorPage() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [customInput, setCustomInput] = useState<string>('');
  const [preferences, setPreferences] = useState({
    location: '',
    vibe: '',
    scale: '',
  });
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);

  // Select story based on preferences
  const selectedStory = useMemo(() => {
    if (!selectedScenario) return null;

    const storyKey = Object.keys(STORIES).find((key) => {
      const story = STORIES[key];
      if (selectedScenario === 'monday') {
        return key.includes('monday') && preferences.location === 'Coastal' && preferences.vibe === 'Minimalist';
      }
      if (selectedScenario === 'thanksgiving') {
        return key.includes('thanksgiving') && preferences.location === 'Mountain' && preferences.vibe === 'Warm & Rustic';
      }
      if (selectedScenario === 'saturday') {
        return key.includes('saturday') && preferences.location === 'Urban' && preferences.vibe === 'Bold & Modern';
      }
      return false;
    });

    return storyKey ? STORIES[storyKey] : null;
  }, [selectedScenario, preferences]);

  // Intro phase
  const renderIntro = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
        backgroundColor: 'var(--bg, #ffffff)',
      }}
    >
      <motion.h1
        style={{
          fontSize: 'clamp(2.5rem, 8vw, 4rem)',
          fontFamily: 'var(--font-archivo), sans-serif',
          fontWeight: 900,
          color: '#D85A30',
          textAlign: 'center',
          marginBottom: '1rem',
          maxWidth: '900px',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
      >
        Dream Your Home
      </motion.h1>

      <motion.p
        style={{
          fontSize: '1.125rem',
          color: '#999',
          textAlign: 'center',
          maxWidth: '680px',
          lineHeight: '1.8',
          marginBottom: '3rem',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
      >
        Choose a moment in your future home. We'll weave it into a narrative. At the end, your dream becomes a concept.
      </motion.p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          maxWidth: '900px',
          width: '100%',
          marginBottom: '2rem',
        }}
      >
        {[
          {
            id: 'monday',
            title: 'A Monday Morning',
            description: 'Peaceful awakening, coffee ritual, ocean light',
          },
          {
            id: 'thanksgiving',
            title: 'Hosting Thanksgiving',
            description: 'Warmth, gathering, three generations under one roof',
          },
          {
            id: 'saturday',
            title: 'A Rainy Saturday Afternoon',
            description: 'Cozy introspection, creative space, urban retreat',
          },
        ].map((scenario, index) => (
          <motion.button
            key={scenario.id}
            onClick={() => {
              setSelectedScenario(scenario.id);
              setPhase('customize');
            }}
            style={{
              padding: '2rem',
              background: 'linear-gradient(135deg, rgba(216, 90, 48, 0.15) 0%, rgba(196, 164, 74, 0.1) 100%)',
              border: '1px solid rgba(216, 90, 48, 0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#fff',
              textAlign: 'left',
              transition: 'all 0.3s ease',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + index * 0.1, duration: 0.6 }}
            whileHover={{
              background: 'linear-gradient(135deg, rgba(216, 90, 48, 0.25) 0%, rgba(196, 164, 74, 0.2) 100%)',
              borderColor: 'rgba(216, 90, 48, 0.6)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                'linear-gradient(135deg, rgba(216, 90, 48, 0.25) 0%, rgba(196, 164, 74, 0.2) 100%)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(216, 90, 48, 0.6)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                'linear-gradient(135deg, rgba(216, 90, 48, 0.15) 0%, rgba(196, 164, 74, 0.1) 100%)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(216, 90, 48, 0.3)';
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600, color: '#D85A30' }}>
              {scenario.title}
            </h3>
            <p style={{ margin: 0, fontSize: '0.95rem', color: '#aaa', lineHeight: '1.6' }}>
              {scenario.description}
            </p>
          </motion.button>
        ))}
      </div>

      <motion.div
        style={{
          maxWidth: '680px',
          width: '100%',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        <p style={{ fontSize: '0.95rem', color: '#666', marginBottom: '1rem' }}>Or describe your own moment:</p>
        <input
          type="text"
          placeholder="e.g., Sunday brunch in my garden..."
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && customInput.trim()) {
              setSelectedScenario('custom');
              setPhase('customize');
            }
          }}
          style={{
            width: '100%',
            padding: '1rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(216, 90, 48, 0.3)',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '1rem',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      </motion.div>
    </motion.div>
  );

  // Customize phase
  const renderCustomize = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
        backgroundColor: 'var(--bg, #ffffff)',
      }}
    >
      <motion.h1
        style={{
          fontSize: '2.5rem',
          fontFamily: 'var(--font-archivo), sans-serif',
          fontWeight: 900,
          color: '#D85A30',
          textAlign: 'center',
          marginBottom: '0.5rem',
          maxWidth: '900px',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
      >
        Shape Your Story
      </motion.h1>

      <motion.p
        style={{
          fontSize: '1rem',
          color: '#999',
          textAlign: 'center',
          maxWidth: '680px',
          lineHeight: '1.8',
          marginBottom: '3rem',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
      >
        Choose three style preferences. We'll personalize your narrative.
      </motion.p>

      <div
        style={{
          maxWidth: '900px',
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem',
          marginBottom: '3rem',
        }}
      >
        {[
          {
            label: 'Location',
            key: 'location',
            options: ['Coastal', 'Mountain', 'Urban'],
          },
          {
            label: 'Vibe',
            key: 'vibe',
            options: ['Minimalist', 'Warm & Rustic', 'Bold & Modern'],
          },
          {
            label: 'Scale',
            key: 'scale',
            options: ['Cottage', 'Family Home', 'Grand Estate'],
          },
        ].map((group, groupIndex) => (
          <motion.div
            key={group.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + groupIndex * 0.1, duration: 0.6 }}
          >
            <h3 style={{ color: '#D85A30', marginBottom: '1rem', fontSize: '1.1rem' }}>{group.label}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {group.options.map((option) => (
                <button
                  key={option}
                  onClick={() => setPreferences((prev) => ({ ...prev, [group.key]: option }))}
                  style={{
                    padding: '0.875rem',
                    background:
                      preferences[group.key as keyof typeof preferences] === option
                        ? 'rgba(216, 90, 48, 0.3)'
                        : 'rgba(255, 255, 255, 0.05)',
                    border:
                      preferences[group.key as keyof typeof preferences] === option
                        ? '2px solid #D85A30'
                        : '1px solid rgba(216, 90, 48, 0.2)',
                    borderRadius: '6px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (preferences[group.key as keyof typeof preferences] !== option) {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(216, 90, 48, 0.15)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(216, 90, 48, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (preferences[group.key as keyof typeof preferences] !== option) {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(216, 90, 48, 0.2)';
                    }
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.button
        onClick={() => {
          if (preferences.location && preferences.vibe && preferences.scale) {
            setPhase('reading');
            setCurrentSceneIndex(0);
          }
        }}
        disabled={!preferences.location || !preferences.vibe || !preferences.scale}
        style={{
          padding: '1rem 2.5rem',
          background: 'linear-gradient(135deg, #D85A30 0%, #C4A44A 100%)',
          border: 'none',
          borderRadius: '6px',
          color: '#111111',
          cursor: preferences.location && preferences.vibe && preferences.scale ? 'pointer' : 'not-allowed',
          fontSize: '1.1rem',
          fontWeight: 600,
          fontFamily: 'inherit',
          opacity: preferences.location && preferences.vibe && preferences.scale ? 1 : 0.5,
          transition: 'transform 0.2s ease',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.6 }}
        whileHover={preferences.location && preferences.vibe && preferences.scale ? { scale: 1.05 } : undefined}
        onMouseEnter={(e) => {
          if (preferences.location && preferences.vibe && preferences.scale) {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
        }}
      >
        Begin Reading
      </motion.button>
    </motion.div>
  );

  // Reading phase
  const renderReading = () => {
    if (!selectedStory) return null;

    const currentScene = selectedStory.scenes[currentSceneIndex];
    const words = currentScene.text.split(' ');

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2rem',
          backgroundColor: 'var(--bg, #ffffff)',
          position: 'relative',
        }}
      >
        {/* Back button */}
        <Link
          href="/dream"
          style={{
            position: 'absolute',
            top: '2rem',
            left: '2rem',
            color: '#D85A30',
            textDecoration: 'none',
            fontSize: '0.95rem',
            fontWeight: 500,
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#C4A44A';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#D85A30';
          }}
        >
          ← Dream Machine
        </Link>

        {/* Scene counter */}
        <div
          style={{
            position: 'absolute',
            top: '2rem',
            right: '2rem',
            color: '#666',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          Scene {currentSceneIndex + 1} of {selectedStory.scenes.length}
        </div>

        {/* Left side indicators */}
        <div
          style={{
            position: 'absolute',
            left: '2rem',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {selectedStory.scenes.map((_, index) => (
            <motion.div
              key={index}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: index <= currentSceneIndex ? '#D85A30' : 'rgba(216, 90, 48, 0.2)',
                cursor: 'pointer',
              }}
              onClick={() => setCurrentSceneIndex(index)}
              whileHover={{ scale: 1.3 }}
              transition={{ duration: 0.2 }}
            />
          ))}
        </div>

        {/* Main content */}
        <div
          style={{
            maxWidth: '680px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
          }}
        >
          {/* Image placeholder */}
          <motion.div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16 / 9',
              background: `linear-gradient(135deg, rgba(216, 90, 48, 0.15) 0%, rgba(196, 164, 74, 0.1) 100%)`,
              borderRadius: '8px',
              border: '1px solid rgba(216, 90, 48, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <button
              style={{
                padding: '0.75rem 1.5rem',
                background: 'rgba(216, 90, 48, 0.3)',
                border: '1px solid rgba(216, 90, 48, 0.5)',
                borderRadius: '6px',
                color: '#D85A30',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: 500,
                fontFamily: 'inherit',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(216, 90, 48, 0.5)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(216, 90, 48, 0.3)';
              }}
            >
              Render this moment
            </button>
          </motion.div>

          {/* Scene title */}
          <motion.h2
            style={{
              fontSize: '1.75rem',
              fontFamily: 'var(--font-archivo), sans-serif',
              fontWeight: 700,
              color: '#C4A44A',
              textAlign: 'center',
              margin: 0,
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            {currentScene.title}
          </motion.h2>

          {/* Typewriter text effect */}
          <motion.p
            style={{
              fontSize: '1.125rem',
              color: '#ddd',
              lineHeight: '1.85',
              margin: 0,
              textAlign: 'center',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <motion.span
              style={{ display: 'inline' }}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.04,
                    delayChildren: 0.2,
                  },
                },
              }}
            >
              {words.map((word, index) => (
                <motion.span
                  key={index}
                  style={{
                    display: 'inline',
                    opacity: 0,
                    marginRight: '0.25em',
                  }}
                  variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1 },
                  }}
                  transition={{ duration: 0.1 }}
                >
                  {word}
                </motion.span>
              ))}
            </motion.span>
          </motion.p>

          {/* Navigation buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '2rem',
            }}
          >
            <button
              onClick={() => setCurrentSceneIndex(Math.max(0, currentSceneIndex - 1))}
              disabled={currentSceneIndex === 0}
              style={{
                padding: '0.75rem 1.5rem',
                background: currentSceneIndex === 0 ? 'rgba(216, 90, 48, 0.1)' : 'rgba(216, 90, 48, 0.2)',
                border: '1px solid rgba(216, 90, 48, 0.3)',
                borderRadius: '6px',
                color: currentSceneIndex === 0 ? '#666' : '#D85A30',
                cursor: currentSceneIndex === 0 ? 'not-allowed' : 'pointer',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                fontWeight: 500,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (currentSceneIndex !== 0) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(216, 90, 48, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentSceneIndex !== 0) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(216, 90, 48, 0.2)';
                }
              }}
            >
              ← Previous
            </button>

            <button
              onClick={() => {
                if (currentSceneIndex === selectedStory.scenes.length - 1) {
                  setPhase('concept');
                } else {
                  setCurrentSceneIndex(currentSceneIndex + 1);
                }
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #D85A30 0%, #C4A44A 100%)',
                border: 'none',
                borderRadius: '6px',
                color: '#111111',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                fontWeight: 600,
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              }}
            >
              {currentSceneIndex === selectedStory.scenes.length - 1 ? 'Assemble Concept' : 'Continue'} →
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  // Concept phase
  const renderConcept = () => {
    if (!selectedStory) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2rem',
          backgroundColor: 'var(--bg, #ffffff)',
        }}
      >
        {/* Back button */}
        <Link
          href="/dream"
          style={{
            position: 'absolute',
            top: '2rem',
            left: '2rem',
            color: '#D85A30',
            textDecoration: 'none',
            fontSize: '0.95rem',
            fontWeight: 500,
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#C4A44A';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#D85A30';
          }}
        >
          ← Dream Machine
        </Link>

        {/* Headline */}
        <motion.h1
          style={{
            fontSize: '2.5rem',
            fontFamily: 'var(--font-archivo), sans-serif',
            fontWeight: 900,
            color: '#D85A30',
            textAlign: 'center',
            marginBottom: '0.5rem',
            maxWidth: '900px',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          Your Home, Assembled
        </motion.h1>

        <motion.p
          style={{
            fontSize: '1rem',
            color: '#999',
            textAlign: 'center',
            maxWidth: '680px',
            lineHeight: '1.8',
            marginBottom: '3rem',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          From your narrative, a concept emerges.
        </motion.p>

        {/* Scene thumbnails strip */}
        <motion.div
          style={{
            display: 'flex',
            gap: '1rem',
            overflowX: 'auto',
            marginBottom: '3rem',
            maxWidth: '900px',
            paddingBottom: '1rem',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          {selectedStory.scenes.map((scene, index) => (
            <motion.div
              key={index}
              style={{
                minWidth: '120px',
                height: '120px',
                background: `linear-gradient(135deg, rgba(216, 90, 48, 0.2) 0%, rgba(196, 164, 74, 0.15) 100%)`,
                borderRadius: '6px',
                border: '1px solid rgba(216, 90, 48, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 + index * 0.08, duration: 0.5 }}
              whileHover={{ scale: 1.05 }}
            >
              <p
                style={{
                  fontSize: '0.85rem',
                  color: '#999',
                  textAlign: 'center',
                  padding: '0.75rem',
                  lineHeight: '1.4',
                }}
              >
                {scene.title}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Concept card */}
        <motion.div
          style={{
            maxWidth: '680px',
            width: '100%',
            padding: '2.5rem',
            background: 'linear-gradient(135deg, rgba(216, 90, 48, 0.12) 0%, rgba(196, 164, 74, 0.08) 100%)',
            border: '1px solid rgba(216, 90, 48, 0.25)',
            borderRadius: '8px',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <h2
            style={{
              fontSize: '2rem',
              fontFamily: 'var(--font-archivo), sans-serif',
              fontWeight: 700,
              color: '#C4A44A',
              margin: '0 0 1rem 0',
              textAlign: 'center',
            }}
          >
            {selectedStory.concept.name}
          </h2>

          <p
            style={{
              fontSize: '1.05rem',
              color: '#ddd',
              lineHeight: '1.8',
              marginBottom: '2rem',
              textAlign: 'center',
            }}
          >
            {selectedStory.concept.description}
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2rem',
              marginTop: '2rem',
            }}
          >
            <div>
              <h4
                style={{
                  fontSize: '0.95rem',
                  color: '#D85A30',
                  marginBottom: '1rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                Key Features
              </h4>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                }}
              >
                {selectedStory.concept.features.map((feature, index) => (
                  <li
                    key={index}
                    style={{
                      fontSize: '0.95rem',
                      color: '#aaa',
                      marginBottom: '0.75rem',
                      paddingLeft: '1.5rem',
                      position: 'relative',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        color: '#D85A30',
                        fontWeight: 600,
                      }}
                    >
                      •
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4
                style={{
                  fontSize: '0.95rem',
                  color: '#D85A30',
                  marginBottom: '1rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                Materials
              </h4>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                }}
              >
                {selectedStory.concept.materials.map((material, index) => (
                  <li
                    key={index}
                    style={{
                      fontSize: '0.95rem',
                      color: '#aaa',
                      marginBottom: '0.75rem',
                      paddingLeft: '1.5rem',
                      position: 'relative',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        color: '#C4A44A',
                        fontWeight: 600,
                      }}
                    >
                      •
                    </span>
                    {material}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <motion.button
            onClick={() => {
              setPhase('intro');
              setSelectedScenario('');
              setPreferences({ location: '', vibe: '', scale: '' });
              setCurrentSceneIndex(0);
            }}
            style={{
              width: '100%',
              padding: '1rem',
              background: 'linear-gradient(135deg, #D85A30 0%, #C4A44A 100%)',
              border: 'none',
              borderRadius: '6px',
              color: '#111111',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 600,
              fontFamily: 'inherit',
              marginTop: '2rem',
              transition: 'transform 0.2s ease',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.6 }}
            whileHover={{ scale: 1.02 }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            }}
          >
            Dream Another Home
          </motion.button>
        </motion.div>
      </motion.div>
    );
  };

  // Render current phase
  return (
    <div style={{ background: 'var(--bg, #ffffff)' }}>
      <AnimatePresence mode="wait">
        {phase === 'intro' && <div key="intro">{renderIntro()}</div>}
        {phase === 'customize' && <div key="customize">{renderCustomize()}</div>}
        {phase === 'reading' && <div key="reading">{renderReading()}</div>}
        {phase === 'concept' && <div key="concept">{renderConcept()}</div>}
      </AnimatePresence>
    </div>
  );
}

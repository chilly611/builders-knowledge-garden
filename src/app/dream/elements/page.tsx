'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// ELEMENT DATA STRUCTURE
// ============================================================================

interface BuildingElement {
  symbol: string;
  name: string;
  category: 'Structural' | 'Envelope' | 'Roofing' | 'Systems' | 'Interior' | 'Landscape';
  costRange: string;
  sustainability: number; // 1-5
  durability: number; // years
  description: string;
  funFact: string;
  pairings: string[]; // references to other symbols
}

// All 36 building elements organized by category
const ELEMENTS: BuildingElement[] = [
  // Row 1 - STRUCTURAL
  {
    symbol: 'Fn',
    name: 'Foundation',
    category: 'Structural',
    costRange: '$15,000 - $50,000',
    sustainability: 3,
    durability: 100,
    description: 'The bedrock of every building. Concrete foundation systems provide stability and distribute structural loads safely to the earth below.',
    funFact: 'Roman concrete (opus caementicium) from 2,000 years ago is still standing and actually gets stronger over time!',
    pairings: ['St', 'Co', 'Cl', 'Ma'],
  },
  {
    symbol: 'St',
    name: 'Steel Frame',
    category: 'Structural',
    costRange: '$30,000 - $80,000',
    sustainability: 2,
    durability: 50,
    description: 'High-strength steel structural system enabling tall, open-plan buildings with minimal interior walls. Recyclable and reusable.',
    funFact: 'A single steel beam can support the weight of 1,000+ elephants.',
    pairings: ['Gl', 'Mp', 'Fn'],
  },
  {
    symbol: 'Wd',
    name: 'Wood Frame',
    category: 'Structural',
    costRange: '$20,000 - $60,000',
    sustainability: 4,
    durability: 80,
    description: 'Classic timber framing with modern engineering. Renewable, carbon-negative if sustainably harvested. Ideal for residential projects.',
    funFact: 'Wood actually gets stronger as it ages if kept dry—some timber structures are 600+ years old.',
    pairings: ['Br', 'Hw', 'Ng'],
  },
  {
    symbol: 'Co',
    name: 'Concrete',
    category: 'Structural',
    costRange: '$25,000 - $70,000',
    sustainability: 2,
    durability: 75,
    description: 'Versatile composite material of cement, aggregates, and water. Can be cast into any shape, ideal for modern structures.',
    funFact: 'Concrete used in modern construction is the most-used material on Earth—we use more than gold, silver, and platinum combined.',
    pairings: ['St', 'Pc', 'Sp'],
  },
  {
    symbol: 'Cl',
    name: 'CLT Timber',
    category: 'Structural',
    costRange: '$35,000 - $95,000',
    sustainability: 5,
    durability: 80,
    description: 'Cross-Laminated Timber: sustainably sourced wood layers bonded perpendicular for strength. Carbon-negative champion of modern construction.',
    funFact: 'CLT locks away carbon for the building\'s entire lifetime—each cubic meter stores about a ton of CO2.',
    pairings: ['Gl', 'Gw', 'Gr'],
  },
  {
    symbol: 'Ma',
    name: 'Masonry',
    category: 'Structural',
    costRange: '$18,000 - $55,000',
    sustainability: 3,
    durability: 100,
    description: 'Ancient art of assembling bricks, stones, or blocks with mortar. Massive thermal mass, beautiful, enduring.',
    funFact: 'The Great Wall of China is mostly masonry—over 13,000 miles of bricks and stone still standing after 2,000 years.',
    pairings: ['Br', 'Sv', 'Ng'],
  },

  // Row 2 - ENVELOPE
  {
    symbol: 'Br',
    name: 'Brick Wall',
    category: 'Envelope',
    costRange: '$12,000 - $35,000',
    sustainability: 3,
    durability: 100,
    description: 'Classic masonry exterior with timeless aesthetic. Excellent thermal mass and weather resistance. Infinite color and texture options.',
    funFact: 'Bricks are one of the oldest building materials—Egyptians were making them over 4,000 years ago.',
    pairings: ['Wd', 'Ma', 'Os'],
  },
  {
    symbol: 'Gl',
    name: 'Glass Curtain',
    category: 'Envelope',
    costRange: '$40,000 - $120,000',
    sustainability: 2,
    durability: 40,
    description: 'Floor-to-ceiling glass facade system. Maximizes transparency and natural light. Modern buildings use triple-glazed units for efficiency.',
    funFact: 'Modern smart glass can change opacity electronically to control heat and glare in real-time.',
    pairings: ['St', 'Cl', 'Hv'],
  },
  {
    symbol: 'Sv',
    name: 'Stone Veneer',
    category: 'Envelope',
    costRange: '$20,000 - $60,000',
    sustainability: 3,
    durability: 80,
    description: 'Thin-cut natural stone applied over backing structure. Luxury aesthetic with authentic material beauty and excellent durability.',
    funFact: 'Some natural stones are harder than diamonds—granite scores 7-8 on the Mohs hardness scale.',
    pairings: ['Ma', 'Gc', 'Ng'],
  },
  {
    symbol: 'Mp',
    name: 'Metal Panel',
    category: 'Envelope',
    costRange: '$15,000 - $45,000',
    sustainability: 2,
    durability: 50,
    description: 'Lightweight aluminum or steel panels in endless finishes. Modern, industrial aesthetic. Excellent for contemporary designs.',
    funFact: 'Aluminum is infinitely recyclable and retains all its properties through multiple cycles—it\'s the most recycled material globally.',
    pairings: ['St', 'Ss', 'Sh'],
  },
  {
    symbol: 'Su',
    name: 'Stucco',
    category: 'Envelope',
    costRange: '$10,000 - $30,000',
    sustainability: 3,
    durability: 40,
    description: 'Textured plaster finish applied to masonry or frame. Breathable, weather-resistant, and infinitely customizable in color.',
    funFact: 'Stucco has been used for thousands of years—Roman buildings in Pompeii still have intact stucco finishes.',
    pairings: ['Wd', 'Co', 'Hw'],
  },
  {
    symbol: 'Gw',
    name: 'Green Wall',
    category: 'Envelope',
    costRange: '$25,000 - $75,000',
    sustainability: 5,
    durability: 30,
    description: 'Living wall of vegetation on building facade. Improves air quality, reduces heat, provides wildlife habitat, and looks stunning.',
    funFact: 'Green walls can reduce building surface temperature by up to 30°F and increase oxygen production in urban spaces.',
    pairings: ['Cl', 'Gr', 'Ng'],
  },

  // Row 3 - ROOFING
  {
    symbol: 'As',
    name: 'Asphalt Shingle',
    category: 'Roofing',
    costRange: '$8,000 - $20,000',
    sustainability: 1,
    durability: 20,
    description: 'Most common residential roofing. Fiberglass-based shingles with asphalt coating. Affordable and quick to install.',
    funFact: 'Asphalt shingles were invented in the early 1900s as a byproduct of oil refining—waste transformed into building material.',
    pairings: ['Wd', 'Hv'],
  },
  {
    symbol: 'Ss',
    name: 'Standing Seam',
    category: 'Roofing',
    costRange: '$15,000 - $40,000',
    sustainability: 2,
    durability: 50,
    description: 'Metal roofing with vertical seams. Contemporary industrial look, extremely durable, reflective for energy efficiency.',
    funFact: 'Standing seam roofs can last 50+ years and have a nearly 100% recycling rate at end of life.',
    pairings: ['St', 'Sp', 'Hv'],
  },
  {
    symbol: 'Ct',
    name: 'Clay Tile',
    category: 'Roofing',
    costRange: '$20,000 - $60,000',
    sustainability: 3,
    durability: 100,
    description: 'Handcrafted clay tiles with centuries of tradition. Mediterranean aesthetic, incredible longevity, excellent thermal performance.',
    funFact: 'Some clay tile roofs in Spain have been protecting buildings for over 400 years without replacement.',
    pairings: ['Ma', 'Sv'],
  },
  {
    symbol: 'Gr',
    name: 'Green Roof',
    category: 'Roofing',
    costRange: '$18,000 - $50,000',
    sustainability: 5,
    durability: 40,
    description: 'Vegetation-covered roofing system. Extends roof life by protecting membrane, manages stormwater, provides insulation and habitat.',
    funFact: 'A 1,000 sq ft green roof can retain 600+ gallons of water from a 1-inch rainstorm—turning rooftops into water storage.',
    pairings: ['Cl', 'Gw', 'Rw'],
  },
  {
    symbol: 'Tp',
    name: 'Flat/TPO',
    category: 'Roofing',
    costRange: '$10,000 - $28,000',
    sustainability: 2,
    durability: 30,
    description: 'Thermoplastic olefin single-ply membrane. Modern commercial standard. Seams welded together for durability and weather resistance.',
    funFact: 'TPO roofing reflects 65%+ of sunlight, significantly reducing building cooling loads in hot climates.',
    pairings: ['Co', 'Hv'],
  },
  {
    symbol: 'Sr',
    name: 'Solar Roof',
    category: 'Roofing',
    costRange: '$35,000 - $100,000',
    sustainability: 5,
    durability: 25,
    description: 'Photovoltaic cells integrated into roofing. Generates electricity while protecting the building. The future of net-zero homes.',
    funFact: 'A typical 5kW solar roof can offset 75%+ of a household\'s annual electricity consumption.',
    pairings: ['Sp', 'Sh', 'Ge'],
  },

  // Row 4 - SYSTEMS
  {
    symbol: 'Hv',
    name: 'Central HVAC',
    category: 'Systems',
    costRange: '$8,000 - $20,000',
    sustainability: 2,
    durability: 20,
    description: 'Heating, Ventilation, Air Conditioning. Central system distributes conditioned air throughout the building via ductwork.',
    funFact: 'Modern high-efficiency HVAC systems use variable refrigerant flow (VRF) technology, adapting to exact heating/cooling needs room-by-room.',
    pairings: ['St', 'Gl', 'Hv'],
  },
  {
    symbol: 'Rf',
    name: 'Radiant Floor',
    category: 'Systems',
    costRange: '$5,000 - $15,000',
    sustainability: 4,
    durability: 50,
    description: 'Heating/cooling via tubes embedded in floor slabs. Even temperature distribution, silent operation, works great with renewable energy.',
    funFact: 'Radiant floor heating is 15-20% more efficient than forced-air systems and feels like walking on warm sand in winter.',
    pairings: ['Co', 'Pc', 'Ge'],
  },
  {
    symbol: 'Sp',
    name: 'Solar PV',
    category: 'Systems',
    costRange: '$12,000 - $35,000',
    sustainability: 5,
    durability: 25,
    description: 'Photovoltaic panels convert sunlight to electricity. Rooftop or ground-mounted. Key to net-zero buildings.',
    funFact: 'Solar panel efficiency has nearly tripled in the last 20 years—monocrystalline panels now exceed 22% efficiency.',
    pairings: ['Sr', 'Sh', 'Rw'],
  },
  {
    symbol: 'Ge',
    name: 'Geothermal',
    category: 'Systems',
    costRange: '$15,000 - $40,000',
    sustainability: 5,
    durability: 50,
    description: 'Heat pump system using Earth\'s stable subsurface temperature. Most efficient heating/cooling system available. Works in any climate.',
    funFact: 'Geothermal heat pumps can achieve 400-600% efficiency (COP 4-6), meaning 4-6 units of heat output per unit of electricity input.',
    pairings: ['Rf', 'Sp', 'Sh'],
  },
  {
    symbol: 'Rw',
    name: 'Rainwater',
    category: 'Systems',
    costRange: '$3,000 - $10,000',
    sustainability: 5,
    durability: 30,
    description: 'Harvesting system collecting roof runoff for irrigation and non-potable uses. Reduces municipal water demand.',
    funFact: 'A typical home roof can harvest 600+ gallons of water from a single inch of rain—enough to water a garden all summer.',
    pairings: ['Gr', 'Sp', 'Ng'],
  },
  {
    symbol: 'Sh',
    name: 'Smart Home',
    category: 'Systems',
    costRange: '$5,000 - $20,000',
    sustainability: 3,
    durability: 10,
    description: 'Connected sensors and controls for HVAC, lighting, security, appliances. Learns occupancy patterns and optimizes energy use.',
    funFact: 'Smart home systems can reduce energy consumption by 10-15% through automated optimization of heating, cooling, and lighting.',
    pairings: ['Hv', 'Sr', 'Ge'],
  },

  // Row 5 - INTERIOR
  {
    symbol: 'Hw',
    name: 'Hardwood Floor',
    category: 'Interior',
    costRange: '$8,000 - $25,000',
    sustainability: 3,
    durability: 50,
    description: 'Solid or engineered wood flooring. Warm, beautiful, durable. Can be refinished multiple times. Renewable if sustainably sourced.',
    funFact: 'Hardwood flooring can be sanded and refinished 10+ times over its lifetime, effectively giving it a 150+ year lifespan.',
    pairings: ['Wd', 'Br', 'Gc'],
  },
  {
    symbol: 'Pc',
    name: 'Polished Concrete',
    category: 'Interior',
    costRange: '$5,000 - $15,000',
    sustainability: 2,
    durability: 75,
    description: 'Sealed and polished concrete floors. Industrial-contemporary aesthetic, durability, low maintenance, excellent thermal mass.',
    funFact: 'Polished concrete reflects light like marble but costs a fraction of the price and is completely sealed against stains.',
    pairings: ['Co', 'St', 'Rf'],
  },
  {
    symbol: 'Gc',
    name: 'Granite Counter',
    category: 'Interior',
    costRange: '$6,000 - $18,000',
    sustainability: 2,
    durability: 50,
    description: 'Natural stone countertops. Luxury aesthetic, heat-resistant, durable. Each slab is unique with natural variations.',
    funFact: 'Granite is harder than steel and was formed from magma cooling over millions of years deep underground.',
    pairings: ['Sv', 'Hw', 'Os'],
  },
  {
    symbol: 'Qs',
    name: 'Quartz Surface',
    category: 'Interior',
    costRange: '$5,000 - $16,000',
    sustainability: 1,
    durability: 40,
    description: 'Engineered stone (93% quartz + resin). Uniform appearance, non-porous, stain-resistant, low-maintenance alternative to granite.',
    funFact: 'Quartz is the second-most abundant mineral on Earth\'s crust—90% of sand is quartz.',
    pairings: ['Pc', 'Gc'],
  },
  {
    symbol: 'Cc',
    name: 'Custom Cabinet',
    category: 'Interior',
    costRange: '$8,000 - $30,000',
    sustainability: 3,
    durability: 30,
    description: 'Hand-crafted cabinetry tailored to space. Custom joinery and finishes. Investment in functionality and beauty.',
    funFact: 'High-quality custom cabinetry uses mortise-and-tenon joints, the same technique woodworkers have used for 2,000+ years.',
    pairings: ['Hw', 'Gc', 'Os'],
  },
  {
    symbol: 'Os',
    name: 'Open Shelving',
    category: 'Interior',
    costRange: '$2,000 - $8,000',
    sustainability: 4,
    durability: 40,
    description: 'Exposed shelving without cabinet doors. Modern aesthetic, maximizes space perception, displays collections. Requires organization.',
    funFact: 'Open shelving is experiencing a resurgence in modern design as it makes spaces feel larger and promotes accessibility.',
    pairings: ['Br', 'Cc', 'Hw'],
  },

  // Row 6 - LANDSCAPE
  {
    symbol: 'Ng',
    name: 'Native Garden',
    category: 'Landscape',
    costRange: '$5,000 - $15,000',
    sustainability: 5,
    durability: 20,
    description: 'Plants native to region. Low water, supports local wildlife, beautiful seasonal changes. Regenerative landscaping at its finest.',
    funFact: 'Native plants have co-evolved with local insects, birds, and pollinators—creating a thriving ecosystem in your yard.',
    pairings: ['Ma', 'Gw', 'Rw'],
  },
  {
    symbol: 'Ps',
    name: 'Pool/Spa',
    category: 'Landscape',
    costRange: '$25,000 - $80,000',
    sustainability: 1,
    durability: 30,
    description: 'Swimming pool or hot tub. Recreation and relaxation. Modern systems use variable-speed pumps and heat recovery for efficiency.',
    funFact: 'Salt-chlorine generators use electrolysis to produce chlorine, eliminating the need to store hazardous chlorine chemicals.',
    pairings: ['Rw', 'Ge', 'Hv'],
  },
  {
    symbol: 'Ok',
    name: 'Outdoor Kitchen',
    category: 'Landscape',
    costRange: '$15,000 - $50,000',
    sustainability: 2,
    durability: 25,
    description: 'Exterior cooking and dining space. Stainless steel appliances, stone counters, weather-resistant. Extends living space.',
    funFact: 'Outdoor kitchens with integrated grills can increase home value by 5-10% and extend the usable living season.',
    pairings: ['Gc', 'Sv', 'Pp'],
  },
  {
    symbol: 'Pp',
    name: 'Permeable Paving',
    category: 'Landscape',
    costRange: '$8,000 - $25,000',
    sustainability: 4,
    durability: 20,
    description: 'Porous pavement allowing water infiltration. Reduces stormwater runoff, prevents flooding, recharges groundwater.',
    funFact: 'Permeable pavement can reduce stormwater runoff by 100% compared to traditional asphalt, protecting waterways and reducing flooding.',
    pairings: ['Rw', 'Ng', 'Gr'],
  },
  {
    symbol: 'Pf',
    name: 'Privacy Fence',
    category: 'Landscape',
    costRange: '$5,000 - $15,000',
    sustainability: 2,
    durability: 20,
    description: 'Boundary fence for privacy and wind protection. Wood, vinyl, or composite materials. Defines outdoor space.',
    funFact: 'A well-designed fence can reduce wind speed by 50% on the leeward side, protecting gardens and outdoor spaces.',
    pairings: ['Wd', 'Ma', 'Ng'],
  },
  {
    symbol: 'Fp',
    name: 'Fire Pit',
    category: 'Landscape',
    costRange: '$2,000 - $8,000',
    sustainability: 2,
    durability: 25,
    description: 'Outdoor gathering space with fire. Stone or metal construction. Ambient heat, ambiance, and community gathering.',
    funFact: 'A propane fire pit produces the cozy glow of a real fire without the smoke, ash, and carbon emissions of wood burning.',
    pairings: ['Sv', 'Pp', 'Ok'],
  },
];

// ============================================================================
// CATEGORY STYLING
// ============================================================================

const CATEGORY_COLORS: Record<string, { border: string; bg: string; header: string }> = {
  Structural: { border: '#9CA3AF', bg: '#F3F4F6', header: '#374151' },
  Envelope: { border: '#3B82F6', bg: '#EFF6FF', header: '#1E40AF' },
  Roofing: { border: '#EF4444', bg: '#FEF2F2', header: '#991B1B' },
  Systems: { border: '#1D9E75', bg: '#F0FAF8', header: '#065F46' },
  Interior: { border: '#A855F7', bg: '#FAF5FF', header: '#581C87' },
  Landscape: { border: '#8B5A3C', bg: '#FAF8F3', header: '#44221A' },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ElementsPage() {
  const [selectedElement, setSelectedElement] = useState<BuildingElement | null>(null);
  const [discoveredElements, setDiscoveredElements] = useState<Set<string>>(new Set());
  const [combinationSlots, setCombinationSlots] = useState<(BuildingElement | null)[]>([null, null, null]);
  const [synthesisResult, setSynthesisResult] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [xp, setXp] = useState(0);
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null);

  // Load discovered elements from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('bkg_elements_discovered');
    if (saved) {
      setDiscoveredElements(new Set(JSON.parse(saved)));
    }
  }, []);

  // Save discovered elements to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('bkg_elements_discovered', JSON.stringify(Array.from(discoveredElements)));
  }, [discoveredElements]);

  // Handle element discovery
  const handleElementClick = (element: BuildingElement) => {
    setSelectedElement(element);

    if (!discoveredElements.has(element.symbol)) {
      const newDiscovered = new Set(discoveredElements);
      newDiscovered.add(element.symbol);
      setDiscoveredElements(newDiscovered);
      setXp((prev) => prev + 10);
      setCelebrationMessage('✨ Element Discovered! +10 XP');
      setTimeout(() => setCelebrationMessage(null), 2000);

      // Check for category completion
      const categoryElements = ELEMENTS.filter((e) => e.category === element.category);
      const allDiscovered = categoryElements.every((e) => newDiscovered.has(e.symbol));
      if (allDiscovered) {
        setXp((prev) => prev + 100);
        setCelebrationMessage(`🏆 ${element.category} Expert! +100 XP`);
        setTimeout(() => setCelebrationMessage(null), 3000);
      }
    }
  };

  // Add element to combination slot
  const handleAddToCombination = (element: BuildingElement, slotIndex: number) => {
    const newSlots = [...combinationSlots];
    newSlots[slotIndex] = element;
    setCombinationSlots(newSlots);
  };

  // Remove element from combination slot
  const handleRemoveFromCombination = (slotIndex: number) => {
    const newSlots = [...combinationSlots];
    newSlots[slotIndex] = null;
    setCombinationSlots(newSlots);
    setSynthesisResult(null);
  };

  // Generate building concept from combination
  const handleSynthesize = () => {
    const filledSlots = combinationSlots.filter((s) => s !== null) as BuildingElement[];
    if (filledSlots.length < 2) {
      alert('Combine at least 2 elements to synthesize!');
      return;
    }

    // Generate a creative building concept based on the combination
    const synthesis = generateSynthesis(filledSlots);
    setSynthesisResult(synthesis);
    setXp((prev) => prev + 50);
    setCelebrationMessage('⚗️ Synthesis Complete! +50 XP');
    setTimeout(() => setCelebrationMessage(null), 2500);
  };

  // Generate building concept description
  const generateSynthesis = (elements: BuildingElement[]): string => {
    const names = elements.map((e) => e.name).join(' + ');
    const categories = elements.map((e) => e.category);
    const hasStructural = categories.includes('Structural');
    const hasEnvelope = categories.includes('Envelope');
    const hasRoofing = categories.includes('Roofing');
    const hasSystems = categories.includes('Systems');
    const hasInterior = categories.includes('Interior');
    const hasLandscape = categories.includes('Landscape');

    let concept = '';

    if (hasStructural && hasEnvelope && hasRoofing) {
      concept = `A revolutionary ${names} structure featuring a robust structural core with innovative envelope technology and cutting-edge roofing systems.`;
    } else if (hasStructural && hasSystems) {
      concept = `A highly efficient ${names} building utilizing smart structural systems integrated with advanced mechanical and electrical infrastructure.`;
    } else if (hasEnvelope && hasLandscape) {
      concept = `A bio-integrated ${names} space merging the building envelope seamlessly with natural landscape elements for total environmental harmony.`;
    } else if (hasSystems && hasInterior) {
      concept = `A luxurious ${names} interior environment with intelligent systems creating perfect comfort and ambiance throughout.`;
    } else if (hasRoofing && hasSystems) {
      concept = `An energy-generating ${names} roofscape featuring advanced building systems that actively contribute power to the grid while protecting the structure.`;
    } else if (hasStructural && hasLandscape) {
      concept = `A naturalistic ${names} design where the building structure and landscape merge into a unified ecosystem, blurring indoor-outdoor boundaries.`;
    } else {
      concept = `An innovative ${names} composition creating a unique building experience by thoughtfully combining distinct architectural elements.`;
    }

    return concept;
  };

  // Filter elements by category
  const displayElements =
    activeCategory === null ? ELEMENTS : ELEMENTS.filter((e) => e.category === activeCategory);

  const categories = ['Structural', 'Envelope', 'Roofing', 'Systems', 'Interior', 'Landscape'];
  const discoveryPercent = Math.round((discoveredElements.size / ELEMENTS.length) * 100);

  return (
    <div style={{ backgroundColor: '#FFFFFF', minHeight: '100vh', padding: '2rem' }}>
      {/* ===== HEADER & DISCOVERY PROGRESS ===== */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1F2937' }}>
          The Periodic Table of Building
        </h1>
        <p style={{ fontSize: '1rem', color: '#6B7280', marginBottom: '2rem' }}>
          Explore building elements, discover new materials, and synthesize innovative structures
        </p>

        {/* Discovery Progress Ring */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ position: 'relative', width: '80px', height: '80px' }}>
            <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="40"
                cy="40"
                r="35"
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="4"
              />
              <motion.circle
                cx="40"
                cy="40"
                r="35"
                fill="none"
                stroke="#1D9E75"
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 35}`}
                strokeDashoffset={`${2 * Math.PI * 35 * (1 - discoveryPercent / 100)}`}
                strokeLinecap="round"
                animate={{ strokeDashoffset: `${2 * Math.PI * 35 * (1 - discoveryPercent / 100)}` }}
                transition={{ duration: 0.5 }}
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                color: '#1D9E75',
              }}
            >
              {discoveryPercent}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>
              Elements Discovered: {discoveredElements.size}/{ELEMENTS.length}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#6B7280' }}>XP: {xp}</div>
          </div>
        </div>
      </motion.div>

      {/* ===== CELEBRATION MESSAGE ===== */}
      <AnimatePresence>
        {celebrationMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: 'fixed',
              top: '2rem',
              right: '2rem',
              backgroundColor: '#D85A30',
              color: '#FFFFFF',
              padding: '1rem 2rem',
              borderRadius: '0.5rem',
              fontWeight: 'bold',
              zIndex: 50,
            }}
          >
            {celebrationMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== CATEGORY FILTER TABS ===== */}
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveCategory(null)}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '0.375rem',
            border: activeCategory === null ? '2px solid #1D9E75' : '2px solid #E5E7EB',
            backgroundColor: activeCategory === null ? '#F0FAF8' : '#FFFFFF',
            color: activeCategory === null ? '#1D9E75' : '#6B7280',
            fontWeight: activeCategory === null ? 'bold' : '500',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          All Elements
        </motion.button>
        {categories.map((category) => (
          <motion.button
            key={category}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveCategory(category)}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.375rem',
              border:
                activeCategory === category
                  ? `2px solid ${CATEGORY_COLORS[category].header}`
                  : '2px solid #E5E7EB',
              backgroundColor:
                activeCategory === category ? CATEGORY_COLORS[category].bg : '#FFFFFF',
              color:
                activeCategory === category ? CATEGORY_COLORS[category].header : '#6B7280',
              fontWeight: activeCategory === category ? 'bold' : '500',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            {category}
          </motion.button>
        ))}
      </div>

      {/* ===== PERIODIC TABLE GRID ===== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '1rem',
          marginBottom: '3rem',
          maxWidth: '100%',
        }}
      >
        {displayElements.map((element) => {
          const colors = CATEGORY_COLORS[element.category];
          const isDiscovered = discoveredElements.has(element.symbol);

          return (
            <motion.div
              key={element.symbol}
              whileHover={{ scale: 1.08, translateY: -4 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleElementClick(element)}
              style={{
                padding: '1.25rem 1rem',
                borderRadius: '0.5rem',
                border: `2px solid ${colors.border}`,
                backgroundColor: colors.bg,
                cursor: 'pointer',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
              animate={isDiscovered ? {} : { opacity: 0.7 }}
            >
              {/* Glow effect for selected element */}
              {selectedElement?.symbol === element.symbol && (
                <motion.div
                  layoutId="selectedGlow"
                  style={{
                    position: 'absolute',
                    inset: '-2px',
                    borderRadius: '0.5rem',
                    border: `3px solid ${colors.header}`,
                    pointerEvents: 'none',
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              )}

              {/* Discovery badge */}
              {isDiscovered && (
                <div
                  style={{
                    position: 'absolute',
                    top: '0.25rem',
                    right: '0.25rem',
                    width: '1.25rem',
                    height: '1.25rem',
                    borderRadius: '50%',
                    backgroundColor: colors.header,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    color: '#FFFFFF',
                    fontWeight: 'bold',
                  }}
                >
                  ✓
                </div>
              )}

              {/* Element symbol */}
              <div
                style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: colors.header,
                  fontFamily: '"Archivo Black", sans-serif',
                  marginBottom: '0.5rem',
                }}
              >
                {element.symbol}
              </div>

              {/* Element name */}
              <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '500' }}>
                {element.name}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* ===== LEFT: ELEMENT DETAIL PANEL ===== */}
        <AnimatePresence>
          {selectedElement && (
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              style={{
                backgroundColor: '#FAFAF8',
                borderRadius: '0.75rem',
                padding: '2rem',
                border: `2px solid ${CATEGORY_COLORS[selectedElement.category].border}`,
              }}
            >
              <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1F2937' }}>
                {selectedElement.name}
              </h2>
              <div style={{ fontSize: '0.9rem', color: '#6B7280', marginBottom: '1.5rem' }}>
                {selectedElement.category}
              </div>

              <div style={{ marginBottom: '1.5rem', lineHeight: '1.6' }}>
                <p style={{ color: '#374151', fontSize: '0.95rem' }}>{selectedElement.description}</p>
              </div>

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ backgroundColor: '#FFFFFF', padding: '1rem', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Cost Range
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#1F2937' }}>{selectedElement.costRange}</div>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', padding: '1rem', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Durability
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#1F2937' }}>{selectedElement.durability} years</div>
                </div>
              </div>

              {/* Sustainability Rating */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Sustainability
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '1.25rem',
                        opacity: i < selectedElement.sustainability ? 1 : 0.2,
                      }}
                    >
                      🍃
                    </span>
                  ))}
                </div>
              </div>

              {/* Fun Fact */}
              <div style={{ backgroundColor: '#F0FAF8', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#065F46', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  💡 FUN FACT
                </div>
                <p style={{ fontSize: '0.9rem', color: '#047857' }}>{selectedElement.funFact}</p>
              </div>

              {/* Common Pairings */}
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', marginBottom: '0.75rem', fontWeight: 'bold' }}>
                  Works Well With
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {selectedElement.pairings.map((symbol) => {
                    const pairedElement = ELEMENTS.find((e) => e.symbol === symbol);
                    return (
                      <motion.button
                        key={symbol}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => pairedElement && handleElementClick(pairedElement)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E5E7EB',
                          borderRadius: '0.375rem',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          color: '#374151',
                        }}
                      >
                        {symbol}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== RIGHT: COMBINATION LAB ===== */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
          style={{
            backgroundColor: '#FAFAF8',
            borderRadius: '0.75rem',
            padding: '2rem',
            border: '2px solid #D85A30',
            background: 'linear-gradient(135deg, #FAFAF8 0%, rgba(216, 90, 48, 0.05) 100%)',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1F2937' }}>
            ⚗️ Combination Lab
          </h2>

          {/* Combination Slots */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            {combinationSlots.map((element, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                style={{
                  width: '100px',
                  height: '100px',
                  border: '2px dashed #D85A30',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backgroundColor: element ? '#F0FAF8' : '#FFFFFF',
                  position: 'relative',
                }}
                onClick={() => {
                  if (selectedElement) {
                    handleAddToCombination(selectedElement, index);
                  }
                }}
              >
                {element ? (
                  <>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#D85A30' }}>
                      {element.symbol}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: '0.25rem', textAlign: 'center' }}>
                      {element.name}
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.2 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFromCombination(index);
                      }}
                      style={{
                        position: 'absolute',
                        top: '-0.5rem',
                        right: '-0.5rem',
                        width: '1.5rem',
                        height: '1.5rem',
                        borderRadius: '50%',
                        backgroundColor: '#E8443A',
                        color: '#FFFFFF',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      ✕
                    </motion.button>
                  </>
                ) : (
                  <div style={{ fontSize: '2rem', color: '#D5D4D0' }}>+</div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Synthesis Button */}
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(216, 90, 48, 0.3)' }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSynthesize}
            style={{
              width: '100%',
              padding: '1rem 2rem',
              backgroundColor: '#D85A30',
              color: '#FFFFFF',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              marginBottom: '2rem',
            }}
          >
            Synthesize Building Concept
          </motion.button>

          {/* Synthesis Result */}
          <AnimatePresence>
            {synthesisResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '2px solid #D85A30',
                  borderRadius: '0.5rem',
                  padding: '1.5rem',
                }}
              >
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', color: '#D85A30' }}>
                  ✨ Your Synthesis
                </h3>
                <p style={{ fontSize: '0.95rem', color: '#374151', lineHeight: '1.6' }}>
                  {synthesisResult}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Instructions */}
          {combinationSlots.filter((s) => s !== null).length === 0 && !synthesisResult && (
            <div style={{ backgroundColor: '#FEF3F2', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #FECACA' }}>
              <p style={{ fontSize: '0.9rem', color: '#7F1D1D', lineHeight: '1.5' }}>
                Click on building elements in the periodic table above, then click on the slots below to add them. Combine 2+ elements and click "Synthesize" to create a building concept!
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ElementDef {
  id: string;
  name: string;
  emoji: string;
  category: string;
}

interface PlacedElement {
  instanceId: string;
  elementId: string;
  name: string;
  emoji: string;
  category: string;
  x: number;
  y: number;
}

interface Suggestion {
  text: string;
  elementName: string;
  emoji: string;
  elementId: string;
}

const ELEMENT_CATEGORIES = ['All', 'Structure', 'Living', 'Kitchen', 'Bedroom', 'Outdoor', 'Special'];

const ALL_ELEMENTS: ElementDef[] = [
  // Structure
  { id: 'door', name: 'Door', emoji: '🚪', category: 'Structure' },
  { id: 'window', name: 'Window', emoji: '🪟', category: 'Structure' },
  { id: 'staircase', name: 'Staircase', emoji: '🪜', category: 'Structure' },
  { id: 'fireplace', name: 'Fireplace', emoji: '🔥', category: 'Structure' },
  { id: 'skylight', name: 'Skylight', emoji: '☀️', category: 'Structure' },
  { id: 'arch', name: 'Archway', emoji: '🏛️', category: 'Structure' },
  { id: 'column', name: 'Column', emoji: '🏛️', category: 'Structure' },
  { id: 'bay-window', name: 'Bay Window', emoji: '🪟', category: 'Structure' },
  { id: 'vaulted', name: 'Vaulted Ceiling', emoji: '⬆️', category: 'Structure' },
  { id: 'deck', name: 'Deck', emoji: '🪵', category: 'Structure' },
  { id: 'patio', name: 'Patio', emoji: '🏠', category: 'Structure' },
  { id: 'pergola', name: 'Pergola', emoji: '🌿', category: 'Structure' },
  { id: 'pool', name: 'Pool', emoji: '🏊', category: 'Structure' },
  { id: 'fence', name: 'Fence', emoji: '🪵', category: 'Structure' },
  { id: 'gate', name: 'Gate', emoji: '🚧', category: 'Structure' },
  // Living
  { id: 'sofa', name: 'Sofa', emoji: '🛋️', category: 'Living' },
  { id: 'coffee-table', name: 'Coffee Table', emoji: '🪑', category: 'Living' },
  { id: 'bookshelf', name: 'Bookshelf', emoji: '📚', category: 'Living' },
  { id: 'tv-unit', name: 'TV Unit', emoji: '📺', category: 'Living' },
  { id: 'accent-chair', name: 'Accent Chair', emoji: '🪑', category: 'Living' },
  { id: 'ottoman', name: 'Ottoman', emoji: '🟫', category: 'Living' },
  { id: 'rug', name: 'Area Rug', emoji: '🟩', category: 'Living' },
  { id: 'floor-lamp', name: 'Floor Lamp', emoji: '💡', category: 'Living' },
  { id: 'chandelier', name: 'Chandelier', emoji: '🕯️', category: 'Living' },
  { id: 'art-wall', name: 'Art Wall', emoji: '🖼️', category: 'Living' },
  { id: 'plant', name: 'Indoor Plant', emoji: '🌱', category: 'Living' },
  { id: 'piano', name: 'Piano', emoji: '🎹', category: 'Living' },
  // Kitchen
  { id: 'island', name: 'Kitchen Island', emoji: '🏝️', category: 'Kitchen' },
  { id: 'sink', name: 'Farmhouse Sink', emoji: '🚿', category: 'Kitchen' },
  { id: 'pot-rack', name: 'Pot Rack', emoji: '🍳', category: 'Kitchen' },
  { id: 'open-shelves', name: 'Open Shelves', emoji: '📦', category: 'Kitchen' },
  { id: 'pantry', name: 'Walk-in Pantry', emoji: '🏪', category: 'Kitchen' },
  { id: 'breakfast-bar', name: 'Breakfast Bar', emoji: '🥞', category: 'Kitchen' },
  { id: 'wine-fridge', name: 'Wine Fridge', emoji: '🍷', category: 'Kitchen' },
  { id: 'coffee-station', name: 'Coffee Station', emoji: '☕', category: 'Kitchen' },
  { id: 'herb-garden', name: 'Herb Garden', emoji: '🌿', category: 'Kitchen' },
  // Bedroom
  { id: 'king-bed', name: 'King Bed', emoji: '🛏️', category: 'Bedroom' },
  { id: 'walk-in-closet', name: 'Walk-in Closet', emoji: '👗', category: 'Bedroom' },
  { id: 'window-seat', name: 'Window Seat', emoji: '🪟', category: 'Bedroom' },
  { id: 'dressing-table', name: 'Dressing Table', emoji: '💄', category: 'Bedroom' },
  { id: 'reading-nook', name: 'Reading Nook', emoji: '📖', category: 'Bedroom' },
  { id: 'built-ins', name: 'Built-in Storage', emoji: '🗄️', category: 'Bedroom' },
  { id: 'ensuite', name: 'Ensuite Bath', emoji: '🛁', category: 'Bedroom' },
  // Outdoor
  { id: 'veg-garden', name: 'Vegetable Garden', emoji: '🥦', category: 'Outdoor' },
  { id: 'fire-pit', name: 'Fire Pit', emoji: '🔥', category: 'Outdoor' },
  { id: 'hot-tub', name: 'Hot Tub', emoji: '♨️', category: 'Outdoor' },
  { id: 'outdoor-kitchen', name: 'Outdoor Kitchen', emoji: '🍖', category: 'Outdoor' },
  { id: 'string-lights', name: 'String Lights', emoji: '✨', category: 'Outdoor' },
  { id: 'hammock', name: 'Hammock', emoji: '🏕️', category: 'Outdoor' },
  { id: 'greenhouse', name: 'Greenhouse', emoji: '🌱', category: 'Outdoor' },
  { id: 'koi-pond', name: 'Koi Pond', emoji: '🐟', category: 'Outdoor' },
  // Special
  { id: 'home-office', name: 'Home Office', emoji: '💻', category: 'Special' },
  { id: 'gym', name: 'Home Gym', emoji: '🏋️', category: 'Special' },
  { id: 'media-room', name: 'Media Room', emoji: '🎬', category: 'Special' },
  { id: 'wine-cellar', name: 'Wine Cellar', emoji: '🍷', category: 'Special' },
  { id: 'mudroom', name: 'Mudroom', emoji: '🥾', category: 'Special' },
  { id: 'home-spa', name: 'Home Spa', emoji: '🧖', category: 'Special' },
  { id: 'game-room', name: 'Game Room', emoji: '🎮', category: 'Special' },
  { id: 'library', name: 'Library', emoji: '📚', category: 'Special' },
  { id: 'art-studio', name: 'Art Studio', emoji: '🎨', category: 'Special' },
  { id: 'music-room', name: 'Music Room', emoji: '🎵', category: 'Special' },
];

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { text: 'A warm fireplace anchors the living room — pair it with a cozy sofa.', elementName: 'Sofa', emoji: '🛋️', elementId: 'sofa' },
  { text: 'Every dream home needs natural light. A skylight transforms any space.', elementName: 'Skylight', emoji: '☀️', elementId: 'skylight' },
  { text: 'Lush indoor plants bring life and calm to your space.', elementName: 'Indoor Plant', emoji: '🌱', elementId: 'plant' },
];

const KITCHEN_SUGGESTIONS: Suggestion[] = [
  { text: 'A kitchen island becomes the social heart of your home.', elementName: 'Breakfast Bar', emoji: '🥞', elementId: 'breakfast-bar' },
  { text: 'Open shelves add character and accessibility to your kitchen.', elementName: 'Open Shelves', emoji: '📦', elementId: 'open-shelves' },
  { text: 'A coffee station makes every morning feel like a ritual.', elementName: 'Coffee Station', emoji: '☕', elementId: 'coffee-station' },
];

const OUTDOOR_SUGGESTIONS: Suggestion[] = [
  { text: 'String lights transform your outdoor space into a magical evening retreat.', elementName: 'String Lights', emoji: '✨', elementId: 'string-lights' },
  { text: 'A fire pit creates unforgettable nights under the stars.', elementName: 'Fire Pit', emoji: '🔥', elementId: 'fire-pit' },
  { text: 'A vegetable garden connects you to what you eat.', elementName: 'Vegetable Garden', emoji: '🥦', elementId: 'veg-garden' },
];

const BEDROOM_SUGGESTIONS: Suggestion[] = [
  { text: 'A reading nook gives you a private sanctuary within your sanctuary.', elementName: 'Reading Nook', emoji: '📖', elementId: 'reading-nook' },
  { text: 'A walk-in closet is the ultimate daily luxury.', elementName: 'Walk-in Closet', emoji: '👗', elementId: 'walk-in-closet' },
  { text: 'A window seat is perfect for dreaming and morning light.', elementName: 'Window Seat', emoji: '🪟', elementId: 'window-seat' },
];

function getDreamProfile(placedElements: PlacedElement[]): string {
  if (placedElements.length === 0) return 'Begin placing elements to reveal your dream profile.';
  const counts: Record<string, number> = {};
  for (const el of placedElements) {
    counts[el.category] = (counts[el.category] || 0) + 1;
  }
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Living';
  const profiles: Record<string, string> = {
    Structure: 'Architectural Visionary — you dream in bones and form.',
    Living: 'Comfort Curator — warmth and beauty are your priority.',
    Kitchen: 'Culinary Dreamer — your home revolves around gathering and nourishment.',
    Bedroom: 'Sanctuary Seeker — rest, retreat, and personal space define you.',
    Outdoor: 'Nature Connector — the outdoors is an extension of your living.',
    Special: 'Lifestyle Architect — you design for how you truly want to live.',
  };
  return profiles[dominant] || 'Eclectic Visionary — your dream defies easy labels.';
}

export default function DreamImagineStudio() {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [placedElements, setPlacedElements] = useState<PlacedElement[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dreamScore, setDreamScore] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(DEFAULT_SUGGESTIONS);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoveredInstanceId, setHoveredInstanceId] = useState<string | null>(null);
  const [suggestionSet, setSuggestionSet] = useState(0);

  // Recalculate dream score when elements change
  useEffect(() => {
    const base = placedElements.length * 8;
    const jitter = (placedElements.length * 3) % 7;
    setDreamScore(Math.min(100, base + jitter));
  }, [placedElements.length]);

  // Update suggestions based on categories present
  useEffect(() => {
    const categories = new Set(placedElements.map(el => el.category));
    if (categories.has('Kitchen')) {
      setSuggestions(KITCHEN_SUGGESTIONS);
    } else if (categories.has('Outdoor')) {
      setSuggestions(OUTDOOR_SUGGESTIONS);
    } else if (categories.has('Bedroom')) {
      setSuggestions(BEDROOM_SUGGESTIONS);
    } else {
      setSuggestions(DEFAULT_SUGGESTIONS);
    }
  }, [placedElements]);

  const filteredElements = ALL_ELEMENTS.filter(el => {
    const matchesCategory = activeCategory === 'All' || el.category === activeCategory;
    const matchesSearch = el.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      el.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addElement = useCallback((el: ElementDef) => {
    const canvasWidth = canvasRef.current?.clientWidth || 600;
    const canvasHeight = canvasRef.current?.clientHeight || 500;
    const newEl: PlacedElement = {
      instanceId: `${el.id}-${Date.now()}`,
      elementId: el.id,
      name: el.name,
      emoji: el.emoji,
      category: el.category,
      x: Math.random() * (canvasWidth - 120) + 20,
      y: Math.random() * (canvasHeight - 100) + 20,
    };
    setPlacedElements(prev => [...prev, newEl]);
    setHistory(prev => [`Added ${el.name}`, ...prev].slice(0, 5));
  }, []);

  const removeElement = useCallback((instanceId: string) => {
    setPlacedElements(prev => {
      const el = prev.find(e => e.instanceId === instanceId);
      if (el) {
        setHistory(h => [`Removed ${el.name}`, ...h].slice(0, 5));
      }
      return prev.filter(e => e.instanceId !== instanceId);
    });
  }, []);

  const clearAll = useCallback(() => {
    if (placedElements.length === 0) return;
    setHistory(prev => ['Cleared canvas', ...prev].slice(0, 5));
    setPlacedElements([]);
  }, [placedElements.length]);

  const undo = useCallback(() => {
    if (placedElements.length === 0) return;
    const last = placedElements[placedElements.length - 1];
    setHistory(prev => [`Removed ${last.name}`, ...prev].slice(0, 5));
    setPlacedElements(prev => prev.slice(0, -1));
  }, [placedElements]);

  const handleElementMouseDown = useCallback((e: React.MouseEvent, instanceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const el = placedElements.find(p => p.instanceId === instanceId);
    if (!el) return;
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    const offsetX = e.clientX - canvasRect.left - el.x;
    const offsetY = e.clientY - canvasRect.top - el.y;
    setDraggingId(instanceId);
    setDragOffset({ x: offsetX, y: offsetY });
  }, [placedElements]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    const x = Math.round(e.clientX - canvasRect.left);
    const y = Math.round(e.clientY - canvasRect.top);
    setMousePos({ x, y });
    if (draggingId) {
      const newX = e.clientX - canvasRect.left - dragOffset.x;
      const newY = e.clientY - canvasRect.top - dragOffset.y;
      const clampedX = Math.max(0, Math.min(canvasRect.width - 80, newX));
      const clampedY = Math.max(0, Math.min(canvasRect.height - 72, newY));
      setPlacedElements(prev =>
        prev.map(el =>
          el.instanceId === draggingId ? { ...el, x: clampedX, y: clampedY } : el
        )
      );
    }
  }, [draggingId, dragOffset]);

  const handleCanvasMouseUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  const addSuggestion = useCallback((suggestion: Suggestion) => {
    const el = ALL_ELEMENTS.find(e => e.id === suggestion.elementId);
    if (el) addElement(el);
  }, [addElement]);

  const refreshSuggestions = useCallback(() => {
    setSuggestionSet(prev => prev + 1);
  }, []);

  // Dimension calculations
  const total = placedElements.length;
  const livingBedroom = placedElements.filter(e => e.category === 'Living' || e.category === 'Bedroom').length;
  const kitchenSpecial = placedElements.filter(e => e.category === 'Kitchen' || e.category === 'Special').length;
  const structureOutdoor = placedElements.filter(e => e.category === 'Structure' || e.category === 'Outdoor').length;

  const livability = total > 0 ? Math.round((livingBedroom / total) * 100) : 0;
  const functionality = total > 0 ? Math.round((kitchenSpecial / total) * 100) : 0;
  const curbAppeal = total > 0 ? Math.round((structureOutdoor / total) * 100) : 0;
  const ambition = Math.min(100, Math.round((total / 15) * 100));

  const dreamProfile = getDreamProfile(placedElements);

  // Cycle suggestions offset
  const displayedSuggestions = suggestions.map((s, i) => {
    const idx = (i + suggestionSet) % suggestions.length;
    return suggestions[idx];
  }).slice(0, 3);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--bp-paper-cream)',
      fontFamily: 'var(--bp-font-mono)',
      overflow: 'hidden',
    }}>
      {/* Sticky Header */}
      <header style={{
        height: '52px',
        minHeight: '52px',
        background: 'var(--bp-ink-900)',
        borderBottom: '2px solid var(--bp-phase-dream)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 100,
        flexShrink: 0,
      }}>
        <Link href="/dream" style={{
          color: 'var(--bp-ink-200)',
          textDecoration: 'none',
          fontFamily: 'var(--bp-font-mono)',
          fontSize: '12px',
          letterSpacing: '0.05em',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'color 0.15s',
        }}>
          ← DREAM HUB
        </Link>

        <div style={{
          fontFamily: 'var(--bp-font-mono)',
          fontSize: '14px',
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: 'var(--bp-paper-cream)',
        }}>
          DREAM IMAGINE STUDIO
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'rgba(255, 167, 38, 0.15)',
            border: '1px solid var(--bp-amber-main)',
            borderRadius: '4px',
            padding: '2px 10px',
            fontFamily: 'var(--bp-font-mono)',
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--bp-amber-main)',
            boxShadow: '0 0 8px rgba(255, 167, 38, 0.3)',
          }}>
            {dreamScore}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--bp-ink-300)', letterSpacing: '0.05em' }}>
            {total} ELEMENTS
          </span>
          <button
            onClick={() => router.push('/dream/upload')}
            style={{
              background: 'var(--bp-phase-dream)',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 14px',
              fontFamily: 'var(--bp-font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            REALIZE DREAM →
          </button>
        </div>
      </header>

      {/* Main 3-panel layout */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        minHeight: 0,
      }}>

        {/* Left Sidebar — Element Palette */}
        <aside style={{
          width: '260px',
          minWidth: '260px',
          background: 'var(--bp-paper-warm)',
          borderRight: '1.5px solid var(--bp-paper-border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 12px 8px' }}>
            <input
              type="text"
              placeholder="Search elements..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bp-input"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                fontFamily: 'var(--bp-font-mono)',
                fontSize: '11px',
              }}
            />
          </div>

          {/* Category tabs */}
          <div style={{
            display: 'flex',
            gap: '4px',
            overflowX: 'auto',
            padding: '0 12px 8px',
            scrollbarWidth: 'none',
          }}>
            {ELEMENT_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  flexShrink: 0,
                  padding: '3px 8px',
                  fontFamily: 'var(--bp-font-mono)',
                  fontSize: '9px',
                  fontWeight: activeCategory === cat ? 700 : 400,
                  letterSpacing: '0.06em',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeCategory === cat ? '2px solid var(--bp-amber-main)' : '2px solid transparent',
                  color: activeCategory === cat ? 'var(--bp-ink-700)' : 'var(--bp-ink-400)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  paddingBottom: '5px',
                }}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Element grid */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 12px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            alignContent: 'start',
          }}>
            {filteredElements.map(el => (
              <button
                key={el.id}
                onClick={() => addElement(el)}
                title={`Add ${el.name}`}
                style={{
                  background: '#fff',
                  border: '1.5px solid var(--bp-ink-200)',
                  borderRadius: '2px',
                  padding: '8px 6px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                  minWidth: 0,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--bp-ink-400)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--bp-ink-50)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--bp-ink-200)';
                  (e.currentTarget as HTMLButtonElement).style.background = '#fff';
                }}
              >
                <span style={{ fontSize: '24px', lineHeight: 1 }}>{el.emoji}</span>
                <span style={{
                  fontFamily: 'var(--bp-font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.04em',
                  color: 'var(--bp-ink-700)',
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '100%',
                }}>
                  {el.name.toUpperCase()}
                </span>
              </button>
            ))}
          </div>

          <div style={{
            padding: '8px 12px',
            borderTop: '1px solid var(--bp-paper-border)',
            fontFamily: 'var(--bp-font-mono)',
            fontSize: '9px',
            letterSpacing: '0.08em',
            color: 'var(--bp-ink-400)',
          }}>
            SHOWING {filteredElements.length} ELEMENTS
          </div>
        </aside>

        {/* Center — Dream Canvas */}
        <main style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}>
          <div
            ref={canvasRef}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            style={{
              flex: 1,
              position: 'relative',
              overflow: 'hidden',
              background: 'var(--bp-paper-cream)',
              backgroundImage: `
                linear-gradient(rgba(43, 102, 153, 0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(43, 102, 153, 0.05) 1px, transparent 1px)
              `,
              backgroundSize: '24px 24px',
              cursor: draggingId ? 'grabbing' : 'default',
            }}
          >
            {/* Empty state */}
            {placedElements.length === 0 && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                pointerEvents: 'none',
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  position: 'relative',
                  opacity: 0.3,
                }}>
                  <div style={{
                    position: 'absolute',
                    left: '50%',
                    top: 0,
                    bottom: 0,
                    width: '1.5px',
                    background: 'var(--bp-ink-500)',
                    transform: 'translateX(-50%)',
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    right: 0,
                    height: '1.5px',
                    background: 'var(--bp-ink-500)',
                    transform: 'translateY(-50%)',
                  }} />
                  <div style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: '8px',
                    height: '8px',
                    background: 'var(--bp-phase-dream)',
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%)',
                  }} />
                </div>
                <div style={{
                  fontFamily: 'var(--bp-font-mono)',
                  fontSize: '13px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: 'var(--bp-ink-400)',
                  opacity: 0.6,
                }}>
                  ADD ELEMENTS FROM THE PALETTE
                </div>
                <div style={{
                  fontFamily: 'var(--bp-font-mono)',
                  fontSize: '10px',
                  letterSpacing: '0.06em',
                  color: 'var(--bp-ink-300)',
                  opacity: 0.5,
                }}>
                  Click any element on the left to begin
                </div>
              </div>
            )}

            {/* Placed elements */}
            {placedElements.map(el => (
              <div
                key={el.instanceId}
                onMouseDown={e => handleElementMouseDown(e, el.instanceId)}
                onMouseEnter={() => setHoveredInstanceId(el.instanceId)}
                onMouseLeave={() => setHoveredInstanceId(null)}
                style={{
                  position: 'absolute',
                  left: el.x,
                  top: el.y,
                  width: '80px',
                  height: '72px',
                  background: '#fff',
                  border: `1.5px solid ${draggingId === el.instanceId ? 'var(--bp-amber-main)' : 'var(--bp-ink-300)'}`,
                  borderRadius: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  cursor: draggingId === el.instanceId ? 'grabbing' : 'grab',
                  userSelect: 'none',
                  boxShadow: draggingId === el.instanceId
                    ? '0 8px 24px rgba(11, 29, 51, 0.25)'
                    : '0 2px 6px rgba(11, 29, 51, 0.08)',
                  transition: draggingId === el.instanceId ? 'none' : 'box-shadow 0.15s',
                  zIndex: draggingId === el.instanceId ? 200 : 10,
                }}
              >
                {/* Remove button */}
                {hoveredInstanceId === el.instanceId && draggingId !== el.instanceId && (
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => {
                      e.stopPropagation();
                      removeElement(el.instanceId);
                    }}
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      width: '18px',
                      height: '18px',
                      background: 'var(--bp-ink-700)',
                      border: 'none',
                      borderRadius: '50%',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 300,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                )}
                <span style={{ fontSize: '28px', lineHeight: 1 }}>{el.emoji}</span>
                <span style={{
                  fontFamily: 'var(--bp-font-mono)',
                  fontSize: '8px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: 'var(--bp-ink-700)',
                  textAlign: 'center',
                  padding: '0 4px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '100%',
                }}>
                  {el.name.toUpperCase()}
                </span>
              </div>
            ))}
          </div>

          {/* Canvas toolbar */}
          <div style={{
            height: '44px',
            minHeight: '44px',
            background: 'var(--bp-paper-aged)',
            borderTop: '1px solid var(--bp-paper-border)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: '10px',
            flexShrink: 0,
          }}>
            <button
              onClick={clearAll}
              style={{
                background: 'transparent',
                border: '1px solid rgba(216, 90, 48, 0.4)',
                borderRadius: '3px',
                padding: '3px 10px',
                fontFamily: 'var(--bp-font-mono)',
                fontSize: '10px',
                letterSpacing: '0.06em',
                color: 'var(--bp-phase-dream)',
                cursor: 'pointer',
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(216, 90, 48, 0.08)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              CLEAR ALL
            </button>
            <button
              onClick={undo}
              style={{
                background: 'transparent',
                border: '1px solid var(--bp-ink-200)',
                borderRadius: '3px',
                padding: '3px 10px',
                fontFamily: 'var(--bp-font-mono)',
                fontSize: '10px',
                letterSpacing: '0.06em',
                color: 'var(--bp-ink-500)',
                cursor: 'pointer',
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--bp-ink-50)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              UNDO
            </button>
            <div style={{ flex: 1 }} />
            <span style={{
              fontFamily: 'var(--bp-font-mono)',
              fontSize: '10px',
              letterSpacing: '0.06em',
              color: 'var(--bp-ink-400)',
            }}>
              X: {mousePos.x}  Y: {mousePos.y}
            </span>
          </div>
        </main>

        {/* Right Sidebar — AI & Score */}
        <aside style={{
          width: '240px',
          minWidth: '240px',
          background: 'var(--bp-paper-warm)',
          borderLeft: '1.5px solid var(--bp-paper-border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>

            {/* Inspiration Whispers */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}>
                <span style={{
                  fontFamily: 'var(--bp-font-mono)',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: 'var(--bp-ink-700)',
                }}>
                  INSPIRATION WHISPERS
                </span>
                <span style={{
                  background: 'rgba(0, 184, 212, 0.12)',
                  border: '1px solid var(--bp-cyan-main)',
                  borderRadius: '3px',
                  padding: '1px 5px',
                  fontFamily: 'var(--bp-font-mono)',
                  fontSize: '8px',
                  color: 'var(--bp-cyan-main)',
                  letterSpacing: '0.06em',
                }}>
                  AI
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                {displayedSuggestions.map((s, i) => (
                  <div
                    key={`${s.elementId}-${i}-${suggestionSet}`}
                    style={{
                      background: '#fff',
                      border: '1px solid var(--bp-ink-200)',
                      borderRadius: '3px',
                      padding: '8px',
                    }}
                  >
                    <div style={{
                      fontFamily: 'var(--bp-font-mono)',
                      fontSize: '9px',
                      color: 'var(--bp-ink-600, var(--bp-ink-500))',
                      lineHeight: 1.5,
                      marginBottom: '6px',
                    }}>
                      {s.text}
                    </div>
                    <button
                      onClick={() => addSuggestion(s)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--bp-ink-300)',
                        borderRadius: '2px',
                        padding: '2px 7px',
                        fontFamily: 'var(--bp-font-mono)',
                        fontSize: '8px',
                        letterSpacing: '0.06em',
                        color: 'var(--bp-ink-500)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.12s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'var(--bp-ink-50)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--bp-ink-400)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--bp-ink-300)';
                      }}
                    >
                      <span>{s.emoji}</span>
                      <span>ADD {s.elementName.toUpperCase()} →</span>
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={refreshSuggestions}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: '1px solid var(--bp-ink-200)',
                  borderRadius: '3px',
                  padding: '4px',
                  fontFamily: 'var(--bp-font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.08em',
                  color: 'var(--bp-ink-400)',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--bp-ink-50)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                REFRESH
              </button>
            </div>

            {/* Dream Score */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                fontFamily: 'var(--bp-font-mono)',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'var(--bp-ink-700)',
                marginBottom: '8px',
              }}>
                DREAM SCORE
              </div>

              <div style={{
                fontSize: '64px',
                fontWeight: 700,
                fontFamily: 'var(--bp-font-mono)',
                color: 'var(--bp-amber-main)',
                lineHeight: 1,
                marginBottom: '12px',
                textShadow: '0 0 20px rgba(255, 167, 38, 0.25)',
              }}>
                {dreamScore}
              </div>

              {/* Dimension bars */}
              {[
                { label: 'LIVABILITY', value: livability },
                { label: 'FUNCTIONALITY', value: functionality },
                { label: 'CURB APPEAL', value: curbAppeal },
                { label: 'AMBITION', value: ambition },
              ].map(dim => (
                <div key={dim.label} style={{ marginBottom: '8px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '3px',
                  }}>
                    <span style={{
                      fontFamily: 'var(--bp-font-mono)',
                      fontSize: '8px',
                      letterSpacing: '0.06em',
                      color: 'var(--bp-ink-500)',
                    }}>
                      {dim.label}
                    </span>
                    <span style={{
                      fontFamily: 'var(--bp-font-mono)',
                      fontSize: '8px',
                      color: 'var(--bp-ink-400)',
                    }}>
                      {dim.value}%
                    </span>
                  </div>
                  <div style={{
                    height: '4px',
                    background: 'var(--bp-ink-100)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${dim.value}%`,
                      background: dim.label === 'AMBITION' ? 'var(--bp-phase-dream)' : 'var(--bp-ink-400)',
                      borderRadius: '2px',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              ))}

              {/* Dream Profile */}
              <div style={{
                marginTop: '10px',
                padding: '8px',
                background: 'rgba(216, 90, 48, 0.06)',
                border: '1px solid rgba(216, 90, 48, 0.2)',
                borderRadius: '3px',
                fontFamily: 'var(--bp-font-mono)',
                fontSize: '9px',
                color: 'var(--bp-ink-600, var(--bp-ink-500))',
                lineHeight: 1.5,
                fontStyle: 'italic',
              }}>
                {dreamProfile}
              </div>
            </div>

            {/* Canvas History */}
            <div>
              <div style={{
                fontFamily: 'var(--bp-font-mono)',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'var(--bp-ink-700)',
                marginBottom: '8px',
              }}>
                CANVAS HISTORY
              </div>
              {history.length === 0 ? (
                <div style={{
                  fontFamily: 'var(--bp-font-mono)',
                  fontSize: '9px',
                  color: 'var(--bp-ink-300)',
                  letterSpacing: '0.04em',
                }}>
                  No actions yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {history.map((entry, i) => (
                    <div
                      key={i}
                      style={{
                        fontFamily: 'var(--bp-font-mono)',
                        fontSize: '9px',
                        color: i === 0 ? 'var(--bp-ink-500)' : 'var(--bp-ink-300)',
                        letterSpacing: '0.04em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span style={{
                        width: '4px',
                        height: '4px',
                        background: i === 0 ? 'var(--bp-amber-main)' : 'var(--bp-ink-200)',
                        borderRadius: '50%',
                        flexShrink: 0,
                      }} />
                      {entry}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </aside>
      </div>

      {/* Bottom action bar */}
      <div style={{
        height: '64px',
        minHeight: '64px',
        background: 'var(--bp-ink-900)',
        borderTop: '2px solid var(--bp-ink-700)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        flexShrink: 0,
        zIndex: 100,
      }}>
        <span style={{
          fontFamily: 'var(--bp-font-mono)',
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: 'var(--bp-amber-main)',
        }}>
          {total} ELEMENT{total !== 1 ? 'S' : ''} IN YOUR DREAM
        </span>

        <button
          style={{
            background: 'transparent',
            border: '1.5px solid var(--bp-ink-400)',
            borderRadius: '4px',
            padding: '8px 20px',
            fontFamily: 'var(--bp-font-mono)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'var(--bp-ink-200)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--bp-ink-200)';
            (e.currentTarget as HTMLButtonElement).style.color = '#fff';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--bp-ink-400)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--bp-ink-200)';
          }}
        >
          SAVE AS INSPIRATION
        </button>

        <button
          onClick={() => router.push('/dream/upload')}
          style={{
            background: 'var(--bp-amber-main)',
            border: 'none',
            borderRadius: '4px',
            padding: '10px 24px',
            fontFamily: 'var(--bp-font-mono)',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: 'var(--bp-ink-900)',
            cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: '0 0 16px rgba(255, 167, 38, 0.3)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--bp-amber-bright)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 24px rgba(255, 167, 38, 0.5)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--bp-amber-main)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 16px rgba(255, 167, 38, 0.3)';
          }}
        >
          REALIZE DREAM →
        </button>
      </div>
    </div>
  );
}

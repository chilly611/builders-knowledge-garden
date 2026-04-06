'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface Ingredient {
  id: string;
  name: string;
  category: 'style' | 'texture' | 'color';
  color: string;
}

interface CrucibleIngredient extends Ingredient {
  orbitAngle: number;
}

interface SynthesisResult {
  name: string;
  description: string;
  compatibilityScore: number;
  colorPalette: string[];
  baseIngredients: Ingredient[];
  timestamp: number;
}

interface SavedRecipe extends SynthesisResult {
  id: string;
  createdAt: number;
  likes: number;
}

// Ingredient definitions
const STYLE_WORDS: Ingredient[] = [
  { id: 'sw-1', name: 'Modern', category: 'style', color: '#378ADD' },
  { id: 'sw-2', name: 'Rustic', category: 'style', color: '#D85A30' },
  { id: 'sw-3', name: 'Industrial', category: 'style', color: '#666666' },
  { id: 'sw-4', name: 'Minimalist', category: 'style', color: '#F5F5F5' },
  { id: 'sw-5', name: 'Craftsman', category: 'style', color: '#8B7355' },
  { id: 'sw-6', name: 'Victorian', category: 'style', color: '#4A235A' },
  { id: 'sw-7', name: 'Mediterranean', category: 'style', color: '#E8B74A' },
  { id: 'sw-8', name: 'Mid-Century', category: 'style', color: '#C1440E' },
  { id: 'sw-9', name: 'Farmhouse', category: 'style', color: '#D4A574' },
  { id: 'sw-10', name: 'Scandinavian', category: 'style', color: '#E8E8E8' },
];

const TEXTURES: Ingredient[] = [
  { id: 'tx-1', name: 'Brick', category: 'texture', color: '#C1440E' },
  { id: 'tx-2', name: 'Wood', category: 'texture', color: '#8B6F47' },
  { id: 'tx-3', name: 'Concrete', category: 'texture', color: '#A9A9A9' },
  { id: 'tx-4', name: 'Stone', category: 'texture', color: '#B8B8B8' },
  { id: 'tx-5', name: 'Metal', category: 'texture', color: '#C0C0C0' },
  { id: 'tx-6', name: 'Glass', category: 'texture', color: '#E0F7FF' },
  { id: 'tx-7', name: 'Tile', category: 'texture', color: '#6B8E99' },
  { id: 'tx-8', name: 'Marble', category: 'texture', color: '#D3D3D3' },
  { id: 'tx-9', name: 'Copper', category: 'texture', color: '#B87333' },
  { id: 'tx-10', name: 'Leather', category: 'texture', color: '#6F4E37' },
];

const COLORS_MOODS: Ingredient[] = [
  { id: 'cm-1', name: 'Warm', category: 'color', color: '#D85A30' },
  { id: 'cm-2', name: 'Cool', category: 'color', color: '#378ADD' },
  { id: 'cm-3', name: 'Earthy', category: 'color', color: '#1D9E75' },
  { id: 'cm-4', name: 'Vibrant', category: 'color', color: '#7F77DD' },
  { id: 'cm-5', name: 'Muted', category: 'color', color: '#9B9B9B' },
  { id: 'cm-6', name: 'Monochrome', category: 'color', color: '#4A4A4A' },
  { id: 'cm-7', name: 'Coastal', category: 'color', color: '#6BB6D6' },
  { id: 'cm-8', name: 'Forest', category: 'color', color: '#2D5016' },
  { id: 'cm-9', name: 'Sunset', category: 'color', color: '#FF6B35' },
  { id: 'cm-10', name: 'Midnight', category: 'color', color: '#0B1929' },
];

// Compatibility matrix: check if two ingredients work well together
const getCompatibilityScore = (ingredients: Ingredient[]): number => {
  if (ingredients.length === 0) return 0;
  if (ingredients.length === 1) return 75;

  let score = 100;
  const categories = ingredients.map(i => i.category);

  // Prefer diversity
  const uniqueCategories = new Set(categories).size;
  score *= (uniqueCategories / 3) * 1.1;

  // Penalize conflicting combinations
  const ingredientNames = ingredients.map(i => i.name.toLowerCase());

  // Industrial + Minimalist = good
  if (ingredientNames.includes('industrial') && ingredientNames.includes('minimalist')) {
    score *= 1.15;
  }

  // Modern + Minimalist = good
  if (ingredientNames.includes('modern') && ingredientNames.includes('minimalist')) {
    score *= 1.12;
  }

  // Rustic + Farmhouse = good
  if (ingredientNames.includes('rustic') && ingredientNames.includes('farmhouse')) {
    score *= 1.15;
  }

  // Wood + Rustic = good
  if (ingredientNames.includes('wood') && ingredientNames.includes('rustic')) {
    score *= 1.10;
  }

  // Victorian + Marble = good
  if (ingredientNames.includes('victorian') && ingredientNames.includes('marble')) {
    score *= 1.12;
  }

  // Conflicting: Industrial + Victorian
  if (ingredientNames.includes('industrial') && ingredientNames.includes('victorian')) {
    score *= 0.7;
  }

  // Conflicting: Minimalist + Victorian
  if (ingredientNames.includes('minimalist') && ingredientNames.includes('victorian')) {
    score *= 0.75;
  }

  // Conflicting: Modern + Craftsman (can work but not ideal)
  if (ingredientNames.includes('modern') && ingredientNames.includes('craftsman')) {
    score *= 0.85;
  }

  // Ensure score is within bounds
  return Math.max(0, Math.min(100, score));
};

// Generate synthesis result from ingredients
const synthesizeIngredients = (ingredients: Ingredient[]): SynthesisResult => {
  const compatibilityScore = getCompatibilityScore(ingredients);

  const names = ingredients.map(i => i.name).join(' ');
  const resultName = names.length > 0 ? `${names} Essence` : 'Empty Crucible';

  // Generate description based on combinations
  let description = 'A unique blend of ';
  description += ingredients.map(i => i.name.toLowerCase()).join(', ');
  description += ' that creates an unforgettable aesthetic experience.';

  if (ingredients.length >= 2) {
    const hasStyle = ingredients.some(i => i.category === 'style');
    const hasTexture = ingredients.some(i => i.category === 'texture');
    const hasColor = ingredients.some(i => i.category === 'color');

    if (hasStyle && hasTexture && hasColor) {
      description = `A sophisticated ${ingredients.find(i => i.category === 'style')?.name.toLowerCase()} design anchored by ${ingredients.find(i => i.category === 'texture')?.name.toLowerCase()} textures and ${ingredients.find(i => i.category === 'color')?.name.toLowerCase()} hues.`;
    }
  }

  // Generate color palette from ingredients
  const colorPalette = ingredients.map(i => i.color).slice(0, 5);
  if (colorPalette.length < 3) {
    // Fill in brand colors if needed
    if (!colorPalette.includes('#1D9E75')) colorPalette.push('#1D9E75');
    if (!colorPalette.includes('#D85A30')) colorPalette.push('#D85A30');
  }

  return {
    name: resultName,
    description,
    compatibilityScore: Math.round(compatibilityScore),
    colorPalette: colorPalette.slice(0, 5),
    baseIngredients: ingredients,
    timestamp: Date.now(),
  };
};

// Sound trigger hooks (no actual sound, but structure for future implementation)
const useSoundEffects = () => {
  const playAddIngredient = useCallback(() => {
    // Trigger add sound
  }, []);

  const playSynthesis = useCallback(() => {
    // Trigger synthesis sound
  }, []);

  const playSuccess = useCallback(() => {
    // Trigger success sound
  }, []);

  return { playAddIngredient, playSynthesis, playSuccess };
};

// Ingredient pill component
const IngredientPill: React.FC<{
  ingredient: Ingredient;
  onDragStart: (e: React.DragEvent, ingredient: Ingredient) => void;
  inCrucible?: boolean;
  compatibility?: 'good' | 'bad' | 'neutral';
}> = ({ ingredient, onDragStart, inCrucible = false, compatibility = 'neutral' }) => {
  return (
    <motion.div
      draggable
      onDragStart={(e) => onDragStart(e as any, ingredient)}
      whileHover={{ scale: 1.08, y: -2 }}
      whileTap={{ scale: 0.96 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      style={{
        padding: '8px 14px',
        borderRadius: '20px',
        backgroundColor: ingredient.color,
        color: '#fff',
        cursor: 'grab',
        fontSize: '13px',
        fontWeight: 600,
        userSelect: 'none',
        border: '2px solid transparent',
        fontFamily: 'Archivo, sans-serif',
        display: 'inline-block',
        transition: 'all 0.2s ease',
      }}
      onDragEnd={(e) => e.preventDefault()}
      className={compatibility === 'good' ? 'glow-green' : compatibility === 'bad' ? 'shake-red' : ''}
    >
      {ingredient.name}
      <style>{`
        .glow-green {
          box-shadow: 0 0 12px rgba(29, 158, 117, 0.6);
        }
        .shake-red {
          animation: shake 0.3s ease-in-out;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </motion.div>
  );
};

// Main Alchemist Crucible Component
export default function AlchemistCrucible() {
  const [crucibleIngredients, setCrucibleIngredients] = useState<CrucibleIngredient[]>([]);
  const [synthesisResult, setSynthesisResult] = useState<SynthesisResult | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [showCommunity, setShowCommunity] = useState(false);
  const [showRecipeLibrary, setShowRecipeLibrary] = useState(false);
  const [draggedIngredient, setDraggedIngredient] = useState<Ingredient | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { playAddIngredient, playSynthesis, playSuccess } = useSoundEffects();
  const crucibleRef = useRef<HTMLDivElement>(null);

  // Responsive layout detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load saved recipes from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('alchemist-recipes');
    if (saved) {
      try {
        setSavedRecipes(JSON.parse(saved));
      } catch (e) {
        // Handle parse error silently
      }
    }
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, ingredient: Ingredient) => {
    setDraggedIngredient(ingredient);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDropOnCrucible = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedIngredient) return;
    if (crucibleIngredients.length >= 5) return;

    const newIngredient: CrucibleIngredient = {
      ...draggedIngredient,
      orbitAngle: Math.random() * 360,
    };

    setCrucibleIngredients([...crucibleIngredients, newIngredient]);
    playAddIngredient();
  }, [draggedIngredient, crucibleIngredients, playAddIngredient]);

  const handleSurpriseMe = useCallback(() => {
    const allIngredients = [...STYLE_WORDS, ...TEXTURES, ...COLORS_MOODS];
    const count = Math.floor(Math.random() * 3) + 3; // 3-5 ingredients
    const shuffled = allIngredients.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count).map((ing, idx) => ({
      ...ing,
      orbitAngle: (idx / count) * 360,
    }));

    setCrucibleIngredients(selected);
    setTimeout(() => {
      handleSynthesize(selected);
    }, 500);
  }, []);

  const handleSynthesize = useCallback((ingredients?: CrucibleIngredient[]) => {
    const toSynthesize = ingredients || crucibleIngredients;
    if (toSynthesize.length === 0) return;

    setIsSynthesizing(true);
    playSynthesis();

    // Simulate synthesis process
    setTimeout(() => {
      const result = synthesizeIngredients(toSynthesize);
      setSynthesisResult(result);
      setIsSynthesizing(false);
      playSuccess();
    }, 2000);
  }, [crucibleIngredients, playSynthesis, playSuccess]);

  const handleSaveRecipe = useCallback(() => {
    if (!synthesisResult) return;

    const newRecipe: SavedRecipe = {
      ...synthesisResult,
      id: `recipe-${Date.now()}`,
      createdAt: Date.now(),
      likes: 0,
    };

    const updated = [...savedRecipes, newRecipe];
    setSavedRecipes(updated);
    localStorage.setItem('alchemist-recipes', JSON.stringify(updated));
  }, [synthesisResult, savedRecipes]);

  const handleUndoIngredient = useCallback(() => {
    if (crucibleIngredients.length > 0) {
      setCrucibleIngredients(crucibleIngredients.slice(0, -1));
    }
  }, [crucibleIngredients]);

  const handleClearAll = useCallback(() => {
    setCrucibleIngredients([]);
    setSynthesisResult(null);
  }, []);

  const containerStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
    gap: '24px',
    padding: '32px',
    backgroundColor: '#ffffff',
    minHeight: '100vh',
    fontFamily: 'Archivo, sans-serif',
  };

  const panelStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backgroundColor: '#f9f9f9',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #e0e0e0',
  };

  const crucibleCenterStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
  };

  const crucibleAreaStyle: React.CSSProperties = {
    position: 'relative',
    width: isMobile ? '200px' : '280px',
    height: isMobile ? '200px' : '280px',
    borderRadius: '50%',
    border: '3px dashed #D85A30',
    backgroundColor: '#fffaf5',
    cursor: 'grab',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    onDragOver: handleDragOver,
    onDrop: handleDropOnCrucible,
  } as React.CSSProperties;

  const panelLabelStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 700,
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '8px',
  };

  const ingredientGridStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  };

  const buttonGroupStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr',
    gap: '12px',
    marginTop: '20px',
  };

  const buttonStyle = (color: string): React.CSSProperties => ({
    padding: '12px 20px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: color,
    color: '#fff',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Archivo, sans-serif',
    transition: 'all 0.2s ease',
  });

  const resultCardStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    border: '2px solid #D85A30',
    borderRadius: '12px',
    padding: '24px',
    marginTop: '20px',
  };

  const resultNameStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 700,
    color: '#333',
    fontFamily: 'Archivo Black, sans-serif',
    marginBottom: '12px',
  };

  const resultDescriptionStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#666',
    marginBottom: '16px',
    lineHeight: '1.6',
  };

  const scoreBarStyle: React.CSSProperties = {
    width: '100%',
    height: '8px',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '12px',
  };

  const scoreBarFillStyle: React.CSSProperties = {
    height: '100%',
    backgroundColor: synthesisResult && synthesisResult.compatibilityScore > 75 ? '#1D9E75' : synthesisResult && synthesisResult.compatibilityScore > 50 ? '#D85A30' : '#E8443A',
    width: `${synthesisResult?.compatibilityScore || 0}%`,
    transition: 'width 0.3s ease',
  };

  const colorPaletteStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  };

  const colorSwatchStyle = (color: string): React.CSSProperties => ({
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    backgroundColor: color,
    border: '1px solid #ddd',
  });

  const recipeLibraryStyle: React.CSSProperties = {
    backgroundColor: '#f0f8ff',
    padding: '16px',
    borderRadius: '8px',
    marginTop: '20px',
    maxHeight: '300px',
    overflowY: 'auto',
  };

  const recipeItemStyle: React.CSSProperties = {
    padding: '12px',
    backgroundColor: '#fff',
    borderRadius: '6px',
    marginBottom: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    border: '1px solid #e0e0e0',
    transition: 'all 0.2s ease',
  };

  return (
    <div style={containerStyle}>
      {/* Left Panel: Style Words */}
      <div style={panelStyle}>
        <div style={panelLabelStyle}>Style Words</div>
        <div style={ingredientGridStyle}>
          <AnimatePresence>
            {STYLE_WORDS.map(ingredient => (
              <IngredientPill
                key={ingredient.id}
                ingredient={ingredient}
                onDragStart={handleDragStart}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Center: Crucible */}
      <div style={crucibleCenterStyle}>
        <div style={panelLabelStyle}>Alchemist Crucible</div>

        <motion.div
          ref={crucibleRef}
          style={crucibleAreaStyle}
          onDragOver={handleDragOver}
          onDrop={handleDropOnCrucible}
          animate={isSynthesizing ? { scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] } : {}}
          transition={{ duration: 0.6, repeat: isSynthesizing ? Infinity : 0 }}
        >
          <AnimatePresence>
            {crucibleIngredients.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                style={{
                  fontSize: '14px',
                  color: '#999',
                  textAlign: 'center',
                  fontStyle: 'italic',
                }}
              >
                Drag ingredients here
              </motion.div>
            ) : (
              crucibleIngredients.map((ing, idx) => (
                <motion.div
                  key={ing.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    x: Math.cos((ing.orbitAngle * Math.PI) / 180) * 60,
                    y: Math.sin((ing.orbitAngle * Math.PI) / 180) * 60,
                  }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ duration: 0.4 }}
                  style={{
                    position: 'absolute',
                  }}
                >
                  <IngredientPill
                    ingredient={ing}
                    onDragStart={handleDragStart}
                    inCrucible={true}
                  />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </motion.div>

        <div style={{ fontSize: '12px', color: '#666' }}>
          {crucibleIngredients.length}/5 ingredients
        </div>

        {/* Synthesis Result */}
        <AnimatePresence>
          {synthesisResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              style={resultCardStyle}
            >
              <div style={resultNameStyle}>{synthesisResult.name}</div>
              <div style={resultDescriptionStyle}>{synthesisResult.description}</div>

              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                Compatibility Score: {synthesisResult.compatibilityScore}%
              </div>
              <div style={scoreBarStyle}>
                <motion.div
                  style={scoreBarFillStyle}
                  initial={{ width: 0 }}
                  animate={{ width: `${synthesisResult.compatibilityScore}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>

              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                Color Palette:
              </div>
              <div style={colorPaletteStyle}>
                {synthesisResult.colorPalette.map((color, idx) => (
                  <motion.div
                    key={idx}
                    style={colorSwatchStyle(color)}
                    whileHover={{ scale: 1.1 }}
                  />
                ))}
              </div>

              <motion.button
                onClick={handleSaveRecipe}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  ...buttonStyle('#1D9E75'),
                  width: '100%',
                  marginTop: '16px',
                }}
              >
                Save Recipe
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div style={buttonGroupStyle}>
          <motion.button
            onClick={() => handleSynthesize()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={crucibleIngredients.length === 0 || isSynthesizing}
            style={{
              ...buttonStyle('#D85A30'),
              opacity: crucibleIngredients.length === 0 || isSynthesizing ? 0.5 : 1,
              cursor: crucibleIngredients.length === 0 || isSynthesizing ? 'not-allowed' : 'pointer',
            }}
          >
            {isSynthesizing ? 'Synthesizing...' : 'Synthesize'}
          </motion.button>
          <motion.button
            onClick={handleSurpriseMe}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={buttonStyle('#7F77DD')}
          >
            Surprise Me
          </motion.button>
          <motion.button
            onClick={handleUndoIngredient}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={crucibleIngredients.length === 0}
            style={{
              ...buttonStyle('#666'),
              opacity: crucibleIngredients.length === 0 ? 0.5 : 1,
            }}
          >
            Undo
          </motion.button>
          <motion.button
            onClick={handleClearAll}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={crucibleIngredients.length === 0}
            style={{
              ...buttonStyle('#E8443A'),
              opacity: crucibleIngredients.length === 0 ? 0.5 : 1,
            }}
          >
            Clear All
          </motion.button>
        </div>

        {/* Recipe Library Toggle */}
        <motion.button
          onClick={() => setShowRecipeLibrary(!showRecipeLibrary)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            ...buttonStyle('#378ADD'),
            width: '100%',
          }}
        >
          {showRecipeLibrary ? 'Hide' : 'Show'} Recipe Library ({savedRecipes.length})
        </motion.button>

        {/* Recipe Library */}
        <AnimatePresence>
          {showRecipeLibrary && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={recipeLibraryStyle}
            >
              {savedRecipes.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#999', textAlign: 'center' }}>
                  No saved recipes yet
                </div>
              ) : (
                savedRecipes.map(recipe => (
                  <motion.div
                    key={recipe.id}
                    style={recipeItemStyle}
                    whileHover={{ backgroundColor: '#f5f5f5' }}
                  >
                    <div style={{ fontWeight: 700 }}>{recipe.name}</div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      Score: {recipe.compatibilityScore}% • Likes: {recipe.likes}
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Panel: Textures & Colors/Moods */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={panelStyle}>
          <div style={panelLabelStyle}>Textures</div>
          <div style={ingredientGridStyle}>
            <AnimatePresence>
              {TEXTURES.map(ingredient => (
                <IngredientPill
                  key={ingredient.id}
                  ingredient={ingredient}
                  onDragStart={handleDragStart}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={panelLabelStyle}>Colors & Moods</div>
          <div style={ingredientGridStyle}>
            <AnimatePresence>
              {COLORS_MOODS.map(ingredient => (
                <IngredientPill
                  key={ingredient.id}
                  ingredient={ingredient}
                  onDragStart={handleDragStart}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Community Gallery */}
        <div style={panelStyle}>
          <motion.button
            onClick={() => setShowCommunity(!showCommunity)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              ...buttonStyle('#1D9E75'),
              width: '100%',
            }}
          >
            {showCommunity ? 'Hide' : 'Show'} Community Gallery
          </motion.button>

          <AnimatePresence>
            {showCommunity && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div style={{ fontSize: '12px', color: '#666', marginTop: '12px', lineHeight: '1.6' }}>
                  <div style={{ fontWeight: 700, marginBottom: '8px' }}>Popular Recipes:</div>
                  <div style={{ marginBottom: '8px' }}>1. Modern Minimalist Glass (94%)</div>
                  <div style={{ marginBottom: '8px' }}>2. Rustic Farmhouse Wood (92%)</div>
                  <div style={{ marginBottom: '8px' }}>3. Industrial Metal Concrete (88%)</div>
                  <div>4. Mediterranean Warm Stone (86%)</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

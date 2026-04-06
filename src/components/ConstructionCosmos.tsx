'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { supabase } from '@/lib/supabase';

interface Entity {
  id: string;
  name: string;
  type: 'material' | 'technique' | 'supplier' | 'standard' | 'regulation';
  description?: string;
  relationship_count: number;
  assertion_count: number;
  updated_at?: string;
}

interface Relationship {
  id: string;
  source_id: string;
  target_id: string;
  strength: number;
  type?: string;
}

interface StarData {
  entity: Entity;
  position: THREE.Vector3;
  color: THREE.Color;
  size: number;
  index: number;
}

const BRAND_COLORS = {
  materials: new THREE.Color('#1D9E75'),
  techniques: new THREE.Color('#D85A30'),
  suppliers: new THREE.Color('#378ADD'),
  standards: new THREE.Color('#7F77DD'),
  regulations: new THREE.Color('#E8443A'),
};

const getEntityColor = (type: Entity['type']): THREE.Color => {
  return BRAND_COLORS[type] || new THREE.Color('#ffffff');
};

export default function ConstructionCosmos() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const starsRef = useRef<Map<string, StarData>>(new Map());
  const selectedEntityRef = useRef<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<Entity['type'] | null>(null);
  const [ambientMode, setAmbientMode] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<string | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const orbitControlsRef = useRef({
    phi: Math.PI / 4,
    theta: 0,
    radius: 150,
    targetPhi: Math.PI / 4,
    targetTheta: 0,
    targetRadius: 150,
    isDragging: false,
    previousMousePosition: { x: 0, y: 0 },
  });
  const autoRotateRef = useRef(true);
  const particlesRef = useRef<{ position: THREE.Vector3; velocity: THREE.Vector3; age: number; maxAge: number }[]>([]);
  const lineGroupRef = useRef<THREE.Group | null>(null);
  const starMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const labelsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [entitiesRes, relationshipsRes] = await Promise.all([
          supabase.from('kg_entities').select('*').limit(500),
          supabase.from('kg_relationships').select('*').limit(1000),
        ]);

        let data = entitiesRes.data || [];

        if (!data || data.length === 0) {
          // Generate mock data
          data = generateMockEntities(50);
        } else {
          // Count relationships for each entity
          const relCount = new Map<string, number>();
          (relationshipsRes.data || []).forEach((rel: any) => {
            relCount.set(rel.source_id, (relCount.get(rel.source_id) || 0) + 1);
            relCount.set(rel.target_id, (relCount.get(rel.target_id) || 0) + 1);
          });

          data = data.map((e: any) => ({
            ...e,
            relationship_count: relCount.get(e.id) || 0,
            assertion_count: e.assertion_count || Math.floor(Math.random() * 20) + 1,
          }));
        }

        setEntities(data);
      } catch (error) {
        console.error('Error fetching data:', error);
        setEntities(generateMockEntities(50));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Generate mock entities
  const generateMockEntities = (count: number): Entity[] => {
    const types: Entity['type'][] = ['material', 'technique', 'supplier', 'standard', 'regulation'];
    const names = [
      'Steel Reinforcement', 'Concrete Mix', 'Labor Efficiency', 'Safety Protocol', 'Building Code',
      'Timber Framing', 'Electrical Wiring', 'HVAC System', 'Foundation Quality', 'Masonry Technique',
      'Flooring Installation', 'Roofing Material', 'Waterproofing', 'Ventilation System', 'Structural Support',
    ];

    return Array.from({ length: count }, (_, i) => ({
      id: `entity-${i}`,
      name: names[i % names.length] + (i > names.length ? ` ${Math.floor(i / names.length)}` : ''),
      type: types[i % types.length],
      description: `Key component in construction knowledge base`,
      relationship_count: Math.floor(Math.random() * 20) + 1,
      assertion_count: Math.floor(Math.random() * 30) + 1,
      updated_at: new Date().toISOString(),
    }));
  };

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || loading) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e27);
    scene.fog = new THREE.Fog(0x0a0e27, 500, 1500);
    sceneRef.current = scene;

    // Camera
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);
    camera.position.set(100, 80, 100);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(200, 200, 200);
    scene.add(pointLight);

    // Create stars (instanced mesh)
    const starGeometry = new THREE.SphereGeometry(1, 16, 16);
    const starMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const starMesh = new THREE.InstancedMesh(starGeometry, starMaterial, entities.length);
    scene.add(starMesh);
    starMeshRef.current = starMesh;

    // Position stars and create star data
    const starsMap = new Map<string, StarData>();
    const dummy = new THREE.Object3D();

    entities.forEach((entity, index) => {
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI;
      const radius = 80 + Math.random() * 60;

      const position = new THREE.Vector3(
        radius * Math.sin(angle2) * Math.cos(angle1),
        (Math.random() - 0.5) * 60,
        radius * Math.sin(angle2) * Math.sin(angle1)
      );

      const color = getEntityColor(entity.type);
      const size = 2 + (entity.relationship_count / 20) * 3;

      dummy.position.copy(position);
      dummy.scale.setScalar(size);
      dummy.updateMatrix();
      starMesh.setMatrixAt(index, dummy.matrix);

      starsMap.set(entity.id, { entity, position, color, size, index });
    });

    starMesh.instanceMatrix.needsUpdate = true;
    starsRef.current = starsMap;

    // Create orbital lines
    const lineGroup = new THREE.Group();
    scene.add(lineGroup);
    lineGroupRef.current = lineGroup;

    // Create some random relationships for visualization
    const maxConnections = Math.min(entities.length * 3, 150);
    for (let i = 0; i < maxConnections; i++) {
      const source = entities[Math.floor(Math.random() * entities.length)];
      const target = entities[Math.floor(Math.random() * entities.length)];
      if (source.id !== target.id) {
        createOrbitalPath(lineGroup, source, target, Math.random() * 0.7 + 0.3);
      }
    }

    // Handle window resize
    const handleResize = () => {
      const newWidth = containerRef.current?.clientWidth || width;
      const newHeight = containerRef.current?.clientHeight || height;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Mouse events
    const handleMouseDown = (e: MouseEvent) => {
      orbitControlsRef.current.isDragging = true;
      orbitControlsRef.current.previousMousePosition = { x: e.clientX, y: e.clientY };
      autoRotateRef.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / width) * 2 - 1;
      mouseRef.current.y = -(e.clientY / height) * 2 + 1;

      if (orbitControlsRef.current.isDragging) {
        const deltaX = e.clientX - orbitControlsRef.current.previousMousePosition.x;
        const deltaY = e.clientY - orbitControlsRef.current.previousMousePosition.y;

        orbitControlsRef.current.targetTheta += deltaX * 0.005;
        orbitControlsRef.current.targetPhi -= deltaY * 0.005;
        orbitControlsRef.current.targetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, orbitControlsRef.current.targetPhi));

        orbitControlsRef.current.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = () => {
      orbitControlsRef.current.isDragging = false;
    };

    const handleClick = (e: MouseEvent) => {
      if (orbitControlsRef.current.isDragging) return;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObject(starMesh);

      if (intersects.length > 0) {
        const instanceId = intersects[0].instanceId;
        if (instanceId !== undefined) {
          let selectedId: string | null = null;
          for (const [id, data] of starsRef.current.entries()) {
            if (data.index === instanceId) {
              selectedId = id;
              break;
            }
          }

          if (selectedId) {
            selectedEntityRef.current = selectedId;
            setSelectedEntity(starsRef.current.get(selectedId)?.entity || null);
            flyToStar(selectedId);
          }
        }
      } else {
        selectedEntityRef.current = null;
        setSelectedEntity(null);
        if (e.detail === 2) {
          resetCamera();
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSpeed = 0.1;
      orbitControlsRef.current.targetRadius += e.deltaY * zoomSpeed;
      orbitControlsRef.current.targetRadius = Math.max(30, Math.min(300, orbitControlsRef.current.targetRadius));
      autoRotateRef.current = false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAmbientMode(false);

      const moveSpeed = 3;
      if (e.key === 'w') camera.position.z -= moveSpeed;
      if (e.key === 's') camera.position.z += moveSpeed;
      if (e.key === 'a') camera.position.x -= moveSpeed;
      if (e.key === 'd') camera.position.x += moveSpeed;
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('click', handleClick);
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    // Animation loop
    const clock = new THREE.Clock();
    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const deltaTime = clock.getDelta();

      // Update orbit controls
      const controls = orbitControlsRef.current;
      controls.phi += (controls.targetPhi - controls.phi) * 0.1;
      controls.theta += (controls.targetTheta - controls.theta) * 0.1;
      controls.radius += (controls.targetRadius - controls.radius) * 0.1;

      // Auto-rotate when idle
      if (autoRotateRef.current && !ambientMode) {
        controls.targetTheta += 0.0001;
      } else if (ambientMode) {
        controls.targetTheta += 0.00005;
        controls.targetPhi += Math.sin(clock.getElapsedTime() * 0.3) * 0.0001;
      }

      camera.position.x = controls.radius * Math.sin(controls.phi) * Math.cos(controls.theta);
      camera.position.y = controls.radius * Math.cos(controls.phi);
      camera.position.z = controls.radius * Math.sin(controls.phi) * Math.sin(controls.theta);
      camera.lookAt(0, 0, 0);

      // Update star colors and glow
      const instanceColorArray = new Float32Array(entities.length * 3);
      starsRef.current.forEach((star, _) => {
        const pulse = Math.sin(clock.getElapsedTime() * 2 + star.index) * 0.3 + 0.7;
        const isSearchMatched = searchQuery === '' || star.entity.name.toLowerCase().includes(searchQuery.toLowerCase());
        const isTypeMatched = typeFilter === null || star.entity.type === typeFilter;
        const opacity = (isSearchMatched && isTypeMatched) ? pulse : 0.2;

        const adjustedColor = new THREE.Color().copy(star.color).multiplyScalar(opacity);
        instanceColorArray[star.index * 3] = adjustedColor.r;
        instanceColorArray[star.index * 3 + 1] = adjustedColor.g;
        instanceColorArray[star.index * 3 + 2] = adjustedColor.b;
      });

      starMesh.geometry.setAttribute(
        'color',
        new THREE.BufferAttribute(instanceColorArray, 3)
      );
      starMesh.material.vertexColors = true;

      // Update particles
      particlesRef.current = particlesRef.current.filter((p) => p.age < p.maxAge);
      particlesRef.current.forEach((p) => {
        p.position.add(p.velocity);
        p.age += deltaTime;
      });

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [entities, loading, searchQuery, typeFilter, ambientMode]);

  const createOrbitalPath = (group: THREE.Group, source: Entity, target: Entity, strength: number) => {
    const sourceData = starsRef.current.get(source.id);
    const targetData = starsRef.current.get(target.id);

    if (!sourceData || !targetData) return;

    const curve = new THREE.CatmullRomCurve3([
      sourceData.position,
      sourceData.position.clone().add(new THREE.Vector3(Math.random() * 20, Math.random() * 20, Math.random() * 20)),
      targetData.position.clone().add(new THREE.Vector3(Math.random() * 20, Math.random() * 20, Math.random() * 20)),
      targetData.position,
    ]);

    const points = curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const colorBlend = new THREE.Color().addColors(sourceData.color, targetData.color).multiplyScalar(0.5);
    const material = new THREE.LineBasicMaterial({
      color: colorBlend,
      opacity: strength,
      transparent: true,
      linewidth: 1,
    });

    const line = new THREE.Line(geometry, material);
    group.add(line);
  };

  const flyToStar = (entityId: string) => {
    const star = starsRef.current.get(entityId);
    if (!star) return;

    autoRotateRef.current = false;
    orbitControlsRef.current.targetRadius = 40;

    const direction = star.position.clone().normalize();
    orbitControlsRef.current.targetPhi = Math.acos(direction.y);
    orbitControlsRef.current.targetTheta = Math.atan2(direction.z, direction.x);
  };

  const resetCamera = () => {
    orbitControlsRef.current.targetPhi = Math.PI / 4;
    orbitControlsRef.current.targetTheta = 0;
    orbitControlsRef.current.targetRadius = 150;
    selectedEntityRef.current = null;
    setSelectedEntity(null);
    autoRotateRef.current = true;
  };

  const filteredEntities = entities.filter((e) => {
    const matchesSearch = searchQuery === '' || e.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === null || e.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const types: Entity['type'][] = ['material', 'technique', 'supplier', 'standard', 'regulation'];

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-300 font-archivo">Constructing the cosmos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      <div ref={containerRef} className="w-full h-full" />

      {/* Search Overlay */}
      {!ambientMode && (
        <div className="absolute top-6 left-6 z-20 bg-white/10 backdrop-blur-md rounded-lg p-4 w-80 border border-white/20">
          <input
            type="text"
            placeholder="Search entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/20 text-white placeholder-white/50 rounded px-3 py-2 mb-3 font-archivo border border-white/30 focus:outline-none focus:border-[#1D9E75]"
          />

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {types.map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(typeFilter === type ? null : type)}
                  className={`px-3 py-1 rounded text-xs font-archivo transition ${
                    typeFilter === type
                      ? 'bg-[#1D9E75] text-white'
                      : 'bg-white/20 text-white/70 hover:bg-white/30'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {(searchQuery || typeFilter) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilter(null);
                }}
                className="w-full text-xs text-white/50 hover:text-white/70 font-archivo py-1"
              >
                Show All
              </button>
            )}
          </div>

          <div className="mt-3 text-xs text-white/50 font-archivo">
            Showing {filteredEntities.length} of {entities.length}
          </div>
        </div>
      )}

      {/* Entity Detail Panel */}
      {selectedEntity && !ambientMode && (
        <div className="absolute right-6 top-6 z-20 bg-white/95 backdrop-blur-md rounded-lg p-6 w-96 border border-white/20 shadow-2xl font-archivo animate-in slide-in-from-right-4 duration-300">
          <button
            onClick={() => {
              setSelectedEntity(null);
              selectedEntityRef.current = null;
            }}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedEntity.name}</h2>

          <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4" style={{
            backgroundColor: getEntityColor(selectedEntity.type).getStyle(),
            color: '#fff'
          }}>
            {selectedEntity.type}
          </div>

          {selectedEntity.description && (
            <p className="text-slate-600 text-sm mb-4">{selectedEntity.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-slate-200">
            <div>
              <div className="text-xs text-slate-500 font-semibold uppercase">Relationships</div>
              <div className="text-2xl font-bold text-slate-900">{selectedEntity.relationship_count}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold uppercase">Assertions</div>
              <div className="text-2xl font-bold text-slate-900">{selectedEntity.assertion_count}</div>
            </div>
          </div>

          {selectedEntity.updated_at && (
            <p className="text-xs text-slate-500 mb-4">
              Last updated: {new Date(selectedEntity.updated_at).toLocaleDateString()}
            </p>
          )}

          <button className="w-full bg-[#1D9E75] text-white py-2 rounded font-semibold hover:bg-[#1a8966] transition">
            Open in Knowledge Garden
          </button>
        </div>
      )}

      {/* Ambient Mode Toggle */}
      {!ambientMode && (
        <button
          onClick={() => setAmbientMode(true)}
          className="absolute bottom-6 right-6 z-20 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-archivo text-sm border border-white/20 transition backdrop-blur-md"
        >
          Ambient Mode
        </button>
      )}

      {ambientMode && (
        <button
          onClick={() => setAmbientMode(false)}
          className="absolute bottom-6 right-6 z-20 px-4 py-2 bg-[#1D9E75] hover:bg-[#1a8966] text-white rounded-lg font-archivo text-sm transition backdrop-blur-md"
        >
          Exit Ambient Mode
        </button>
      )}

      {/* Controls hint */}
      {!ambientMode && (
        <div className="absolute bottom-6 left-6 z-20 text-white/50 text-xs font-archivo space-y-1">
          <p>Click + drag to orbit • Scroll to zoom</p>
          <p>Click star to inspect • Double-click background to reset</p>
          <p>WASD for free navigation</p>
        </div>
      )}
    </div>
  );
}

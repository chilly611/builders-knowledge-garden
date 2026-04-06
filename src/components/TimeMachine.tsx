'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';

const BRAND_COLORS = {
  green: '#1D9E75',
  gold: '#D85A30',
  red: '#E8443A',
  purple: '#7F77DD',
  blue: '#378ADD',
};

const PHASES = [
  { name: 'Foundation', color: BRAND_COLORS.red, progress: 14 },
  { name: 'Framing', color: BRAND_COLORS.gold, progress: 29 },
  { name: 'Rough-In', color: BRAND_COLORS.purple, progress: 43 },
  { name: 'Insulation', color: BRAND_COLORS.blue, progress: 57 },
  { name: 'Drywall', color: BRAND_COLORS.green, progress: 71 },
  { name: 'Finish', color: BRAND_COLORS.gold, progress: 86 },
  { name: 'Complete', color: BRAND_COLORS.green, progress: 100 },
];

interface BuildingGeometry {
  foundation: THREE.Mesh[];
  framing: THREE.Mesh[];
  roughIn: THREE.Mesh[];
  insulation: THREE.Mesh[];
  drywall: THREE.Mesh[];
  finish: THREE.Mesh[];
}

const TimeMachine: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const geometryRef = useRef<BuildingGeometry | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [phaseIndex, setPhaseIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const cameraStateRef = useRef({
    theta: Math.PI / 4,
    phi: Math.PI / 3,
    radius: 30,
    targetTheta: Math.PI / 4,
    targetPhi: Math.PI / 3,
    targetRadius: 30,
  });

  const mouseStateRef = useRef({ isDragging: false, lastX: 0, lastY: 0 });

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f5f5f5');
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(20, 15, 20);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 30, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    scene.add(directionalLight);

    // Grid floor
    const gridHelper = new THREE.GridHelper(40, 20, 0xdddddd, 0xeeeeee);
    gridHelper.position.y = -8;
    scene.add(gridHelper);

    // Create building geometry
    const geometry: BuildingGeometry = {
      foundation: [],
      framing: [],
      roughIn: [],
      insulation: [],
      drywall: [],
      finish: [],
    };

    // Foundation: concrete slab
    const foundationGeom = new THREE.BoxGeometry(12, 1, 12);
    const foundationMat = new THREE.MeshStandardMaterial({
      color: parseInt(BRAND_COLORS.red.slice(1), 16),
      roughness: 0.8,
      metalness: 0.1,
    });
    const foundationMesh = new THREE.Mesh(foundationGeom, foundationMat);
    foundationMesh.position.y = -7.5;
    foundationMesh.castShadow = true;
    foundationMesh.receiveShadow = true;
    geometry.foundation.push(foundationMesh);
    scene.add(foundationMesh);

    // Framing: wooden frame structure
    const woodMat = new THREE.MeshStandardMaterial({
      color: parseInt(BRAND_COLORS.gold.slice(1), 16),
      roughness: 0.6,
      metalness: 0,
    });

    // Left wall frame
    const leftFrameGeom = new THREE.BoxGeometry(0.3, 8, 12);
    const leftFrame = new THREE.Mesh(leftFrameGeom, woodMat);
    leftFrame.position.set(-6, 0, 0);
    leftFrame.castShadow = true;
    leftFrame.receiveShadow = true;
    geometry.framing.push(leftFrame);
    scene.add(leftFrame);

    // Right wall frame
    const rightFrame = leftFrame.clone();
    rightFrame.position.x = 6;
    geometry.framing.push(rightFrame);
    scene.add(rightFrame);

    // Front wall frame
    const frontFrameGeom = new THREE.BoxGeometry(12, 8, 0.3);
    const frontFrame = new THREE.Mesh(frontFrameGeom, woodMat);
    frontFrame.position.set(0, 0, -6);
    frontFrame.castShadow = true;
    frontFrame.receiveShadow = true;
    geometry.framing.push(frontFrame);
    scene.add(frontFrame);

    // Back wall frame
    const backFrame = frontFrame.clone();
    backFrame.position.z = 6;
    geometry.framing.push(backFrame);
    scene.add(backFrame);

    // Roof frame (trusses)
    const roofFrameGeom = new THREE.BoxGeometry(12, 0.3, 12);
    const roofFrame = new THREE.Mesh(roofFrameGeom, woodMat);
    roofFrame.position.y = 8;
    roofFrame.castShadow = true;
    roofFrame.receiveShadow = true;
    geometry.framing.push(roofFrame);
    scene.add(roofFrame);

    // Rough-In: plumbing/electrical (cyan boxes)
    const roughInMat = new THREE.MeshStandardMaterial({
      color: parseInt(BRAND_COLORS.purple.slice(1), 16),
      roughness: 0.4,
      metalness: 0.3,
      transparent: true,
      opacity: 0.6,
    });

    const pipeGeom = new THREE.CylinderGeometry(0.15, 0.15, 8, 8);
    const pipe1 = new THREE.Mesh(pipeGeom, roughInMat);
    pipe1.position.set(-3, 0, 0);
    geometry.roughIn.push(pipe1);
    scene.add(pipe1);

    const pipe2 = new THREE.Mesh(pipeGeom, roughInMat);
    pipe2.position.set(3, 0, 0);
    geometry.roughIn.push(pipe2);
    scene.add(pipe2);

    const wireGeom = new THREE.BoxGeometry(10, 0.1, 0.1);
    const wire = new THREE.Mesh(wireGeom, roughInMat);
    wire.position.set(0, 3, 0);
    wire.rotation.z = Math.PI / 4;
    geometry.roughIn.push(wire);
    scene.add(wire);

    // Insulation: pink fluffy appearance
    const insulationMat = new THREE.MeshStandardMaterial({
      color: parseInt(BRAND_COLORS.blue.slice(1), 16),
      roughness: 0.9,
      metalness: 0,
      transparent: true,
      opacity: 0.5,
    });

    const insideWallGeom = new THREE.BoxGeometry(11.4, 7.4, 11.4);
    const insideWall = new THREE.Mesh(insideWallGeom, insulationMat);
    insideWall.position.y = 0;
    geometry.insulation.push(insideWall);
    scene.add(insideWall);

    // Drywall: white walls
    const drywallMat = new THREE.MeshStandardMaterial({
      color: parseInt(BRAND_COLORS.green.slice(1), 16),
      roughness: 0.7,
      metalness: 0,
    });

    const wallThickness = 0.2;
    const drywallLeftGeom = new THREE.BoxGeometry(wallThickness, 7, 11);
    const drywallLeft = new THREE.Mesh(drywallLeftGeom, drywallMat);
    drywallLeft.position.set(-5.7, 0, 0);
    drywallLeft.castShadow = true;
    drywallLeft.receiveShadow = true;
    geometry.drywall.push(drywallLeft);
    scene.add(drywallLeft);

    const drywallRight = drywallLeft.clone();
    drywallRight.position.x = 5.7;
    geometry.drywall.push(drywallRight);
    scene.add(drywallRight);

    const drywallFrontGeom = new THREE.BoxGeometry(11, 7, wallThickness);
    const drywallFront = new THREE.Mesh(drywallFrontGeom, drywallMat);
    drywallFront.position.set(0, 0, -5.7);
    drywallFront.castShadow = true;
    drywallFront.receiveShadow = true;
    geometry.drywall.push(drywallFront);
    scene.add(drywallFront);

    const drywallBack = drywallFront.clone();
    drywallBack.position.z = 5.7;
    geometry.drywall.push(drywallBack);
    scene.add(drywallBack);

    // Finish: roof and details
    const finishMat = new THREE.MeshStandardMaterial({
      color: parseInt(BRAND_COLORS.gold.slice(1), 16),
      roughness: 0.5,
      metalness: 0.1,
    });

    const roofGeom = new THREE.ConeGeometry(8.5, 5, 4);
    const roof = new THREE.Mesh(roofGeom, finishMat);
    roof.position.y = 11;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    roof.receiveShadow = true;
    geometry.finish.push(roof);
    scene.add(roof);

    // Door frame
    const doorFrameGeom = new THREE.BoxGeometry(2, 3, 0.3);
    const doorFrame = new THREE.Mesh(doorFrameGeom, drywallMat);
    doorFrame.position.set(0, 0, -5.9);
    doorFrame.castShadow = true;
    doorFrame.receiveShadow = true;
    geometry.finish.push(doorFrame);
    scene.add(doorFrame);

    geometryRef.current = geometry;

    // Mouse controls setup
    const onMouseDown = (e: MouseEvent) => {
      mouseStateRef.current.isDragging = true;
      mouseStateRef.current.lastX = e.clientX;
      mouseStateRef.current.lastY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!mouseStateRef.current.isDragging) return;

      const deltaX = e.clientX - mouseStateRef.current.lastX;
      const deltaY = e.clientY - mouseStateRef.current.lastY;

      cameraStateRef.current.targetTheta -= deltaX * 0.01;
      cameraStateRef.current.targetPhi -= deltaY * 0.01;
      cameraStateRef.current.targetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraStateRef.current.targetPhi));

      mouseStateRef.current.lastX = e.clientX;
      mouseStateRef.current.lastY = e.clientY;
    };

    const onMouseUp = () => {
      mouseStateRef.current.isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraStateRef.current.targetRadius += e.deltaY * 0.02;
      cameraStateRef.current.targetRadius = Math.max(15, Math.min(80, cameraStateRef.current.targetRadius));
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // Smooth camera interpolation
      const camState = cameraStateRef.current;
      camState.theta += (camState.targetTheta - camState.theta) * 0.1;
      camState.phi += (camState.targetPhi - camState.phi) * 0.1;
      camState.radius += (camState.targetRadius - camState.radius) * 0.1;

      const x = camState.radius * Math.sin(camState.phi) * Math.cos(camState.theta);
      const y = camState.radius * Math.cos(camState.phi);
      const z = camState.radius * Math.sin(camState.phi) * Math.sin(camState.theta);

      camera.position.set(x, y, z);
      camera.lookAt(0, 2, 0);

      // Auto-play logic
      if (isPlaying) {
        setPhaseIndex((prev) => {
          const next = (prev + 0.016 * speed) % PHASES.length;
          return next;
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      containerRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  // Update visibility of geometry based on phase
  useEffect(() => {
    if (!geometryRef.current || !sceneRef.current) return;

    const geo = geometryRef.current;
    const phase = Math.floor(phaseIndex);

    // Hide all meshes first
    Object.values(geo).forEach((meshes) => {
      meshes.forEach((mesh) => {
        mesh.visible = false;
      });
    });

    // Show meshes up to current phase
    geo.foundation.forEach((m) => (m.visible = true));
    if (phase >= 1) geo.framing.forEach((m) => (m.visible = true));
    if (phase >= 2) geo.roughIn.forEach((m) => (m.visible = true));
    if (phase >= 3) geo.insulation.forEach((m) => (m.visible = true));
    if (phase >= 4) geo.drywall.forEach((m) => (m.visible = true));
    if (phase >= 5) geo.finish.forEach((m) => (m.visible = true));

    // Animate opacity for transition
    const transitionAlpha = phaseIndex - phase;
    if (phase < 5) {
      const nextPhaseGeo = Object.entries(geo)[phase + 1][1];
      if (nextPhaseGeo) {
        nextPhaseGeo.forEach((mesh) => {
          if (mesh.material instanceof THREE.Material) {
            if ('opacity' in mesh.material) {
              mesh.material.opacity = transitionAlpha * 0.8 + 0.2;
            }
          }
        });
      }
    }
  }, [phaseIndex]);

  const currentPhase = Math.floor(phaseIndex);
  const phaseData = PHASES[currentPhase];
  const progress = Math.round(phaseData.progress + (PHASES[Math.min(currentPhase + 1, 6)].progress - phaseData.progress) * (phaseIndex - currentPhase));

  const handlePhaseChange = (index: number) => {
    setPhaseIndex(index);
    setIsPlaying(false);
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!isFullscreen) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f5f5f5',
      }}
    >
      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      />

      {/* Phase label overlay */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        key={currentPhase}
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '16px 24px',
          borderRadius: '8px',
          fontFamily: 'Archivo',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: phaseData.color }}>
          {phaseData.name}
        </div>
        <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
          {progress}% Complete
        </div>
      </motion.div>

      {/* Fullscreen button */}
      <button
        onClick={toggleFullscreen}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          width: 40,
          height: 40,
          borderRadius: '8px',
          border: 'none',
          backgroundColor: 'white',
          cursor: 'pointer',
          fontSize: '18px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isFullscreen ? '✕' : '⛶'}
      </button>

      {/* Timeline controls */}
      <div
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderTop: '1px solid #ddd',
          fontFamily: 'Archivo',
        }}
      >
        {/* Phase markers and scrubber */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            {/* Play/Pause button */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                width: 40,
                height: 40,
                borderRadius: '6px',
                border: 'none',
                backgroundColor: BRAND_COLORS.green,
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
              }}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>

            {/* Speed control */}
            <select
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: `1px solid ${BRAND_COLORS.green}`,
                fontFamily: 'Archivo',
                cursor: 'pointer',
                backgroundColor: 'white',
              }}
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
            </select>
          </div>

          {/* Slider */}
          <input
            type="range"
            min="0"
            max={PHASES.length - 1}
            step="0.01"
            value={phaseIndex}
            onChange={(e) => handlePhaseChange(parseFloat(e.target.value))}
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '4px',
              background: `linear-gradient(to right, ${BRAND_COLORS.red}, ${BRAND_COLORS.gold}, ${BRAND_COLORS.purple}, ${BRAND_COLORS.blue}, ${BRAND_COLORS.green})`,
              outline: 'none',
              WebkitAppearance: 'none',
              appearance: 'none',
            }}
          />
          <style>{`
            input[type='range']::-webkit-slider-thumb {
              WebkitAppearance: none;
              appearance: none;
              width: 20px;
              height: 20px;
              borderRadius: 50%;
              background: white;
              cursor: pointer;
              boxShadow: 0 2px 8px rgba(0, 0, 0, 0.2);
              border: 2px solid ${BRAND_COLORS.green};
            }
            input[type='range']::-moz-range-thumb {
              width: 20px;
              height: 20px;
              borderRadius: 50%;
              background: white;
              cursor: pointer;
              boxShadow: 0 2px 8px rgba(0, 0, 0, 0.2);
              border: 2px solid ${BRAND_COLORS.green};
            }
          `}</style>
        </div>

        {/* Phase markers */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
          {PHASES.map((phase, idx) => (
            <motion.button
              key={idx}
              onClick={() => handlePhaseChange(idx)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                border: currentPhase === idx ? `3px solid ${phase.color}` : '1px solid #ddd',
                backgroundColor: idx <= currentPhase ? phase.color : '#f9f9f9',
                color: idx <= currentPhase ? 'white' : '#666',
                cursor: 'pointer',
                fontFamily: 'Archivo',
                fontSize: '12px',
                fontWeight: 'bold',
                transition: 'all 0.3s ease',
              }}
            >
              {phase.name}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimeMachine;

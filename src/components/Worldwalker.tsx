'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

// Brand colors
const COLORS = {
  green: '#1D9E75',
  gold: '#D85A30',
  red: '#E8443A',
  purple: '#7F77DD',
  blue: '#378ADD',
};

interface UploadedFile {
  file: File;
  preview: string;
  id: string;
}

interface PipelineStage {
  id: number;
  label: string;
  icon: string;
  status: 'pending' | 'active' | 'complete';
}

interface DetectedMaterial {
  id: string;
  name: string;
  color: string;
}

interface Dimension {
  label: string;
  value: string;
  x: number;
  y: number;
  z: number;
}

const pipelineStages: PipelineStage[] = [
  { id: 1, label: 'Upload', icon: '📤', status: 'pending' },
  { id: 2, label: 'Analyze', icon: '🧠', status: 'pending' },
  { id: 3, label: 'Generate 3D', icon: '🎲', status: 'pending' },
  { id: 4, label: 'Render', icon: '📷', status: 'pending' },
  { id: 5, label: 'Explore', icon: '🧭', status: 'pending' },
];

const mockMaterials: DetectedMaterial[] = [
  { id: '1', name: 'Oak Hardwood', color: '#8B4513' },
  { id: '2', name: 'Granite Countertop', color: '#696969' },
  { id: '3', name: 'Brushed Nickel', color: '#C0C0C0' },
  { id: '4', name: 'Ceramic Tile', color: '#F5DEB3' },
];

const mockDimensions: Dimension[] = [
  { label: 'Living Room Width', value: '16\' 4"', x: 0, y: 0, z: 0 },
  { label: 'Ceiling Height', value: '9\' 2"', x: 0, y: 1, z: 0 },
  { label: 'Room Depth', value: '20\' 8"', x: 0, y: 0, z: 1 },
];

const voiceCommands = [
  'Raise the ceiling 2 feet',
  'Add a fireplace to the living room',
  'Change exterior to stone',
  'Show me the kitchen from the dining room',
];

export default function Worldwalker() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [showMaterials, setShowMaterials] = useState(false);
  const [showDimensions, setShowDimensions] = useState(false);
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [mouseDown, setMouseDown] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [cameraRotation, setCameraRotation] = useState({ x: 0, y: 0 });
  const [cameraZoom, setCameraZoom] = useState(5);

  const dragRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const animationIdRef = useRef<number | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f5f5f5');
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 3, 5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Grid floor
    const gridHelper = new THREE.GridHelper(20, 20, 0xcccccc, 0xeeeeee);
    scene.add(gridHelper);

    // Create house model (simple box composition)
    const modelGroup = new THREE.Group();
    modelGroupRef.current = modelGroup;

    // Foundation slab
    const foundationGeometry = new THREE.BoxGeometry(6, 0.3, 8);
    const foundationMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.gold,
      metalness: 0.2,
      roughness: 0.8,
    });
    const foundation = new THREE.Mesh(foundationGeometry, foundationMaterial);
    foundation.position.y = -0.15;
    foundation.castShadow = true;
    foundation.receiveShadow = true;
    modelGroup.add(foundation);

    // Four walls
    const wallGeometry = new THREE.BoxGeometry(0.3, 3, 8);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.blue,
      metalness: 0.1,
      roughness: 0.9,
    });

    // Front wall
    const frontWall = new THREE.Mesh(wallGeometry, wallMaterial);
    frontWall.position.set(-3, 1.5, 4);
    frontWall.castShadow = true;
    frontWall.receiveShadow = true;
    modelGroup.add(frontWall);

    // Back wall
    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.position.set(3, 1.5, 4);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    modelGroup.add(backWall);

    // Side walls
    const sideWallGeometry = new THREE.BoxGeometry(6, 3, 0.3);
    const sideWall1 = new THREE.Mesh(sideWallGeometry, wallMaterial);
    sideWall1.position.set(0, 1.5, 0);
    sideWall1.castShadow = true;
    sideWall1.receiveShadow = true;
    modelGroup.add(sideWall1);

    const sideWall2 = new THREE.Mesh(sideWallGeometry, wallMaterial);
    sideWall2.position.set(0, 1.5, 8);
    sideWall2.castShadow = true;
    sideWall2.receiveShadow = true;
    modelGroup.add(sideWall2);

    // Pitched roof (two triangles)
    const roofGeometry = new THREE.ConeGeometry(5, 2, 4);
    const roofMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.red,
      metalness: 0.05,
      roughness: 0.95,
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, 3.3, 4);
    roof.rotation.z = Math.PI / 4;
    roof.castShadow = true;
    roof.receiveShadow = true;
    modelGroup.add(roof);

    // Door
    const doorGeometry = new THREE.BoxGeometry(0.8, 2, 0.1);
    const doorMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.purple,
      metalness: 0.3,
      roughness: 0.7,
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 1, 4.05);
    door.castShadow = true;
    door.receiveShadow = true;
    modelGroup.add(door);

    scene.add(modelGroup);

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      // Rotate model based on mouse position
      if (modelGroup) {
        modelGroup.rotation.y = cameraRotation.y;
        modelGroup.rotation.x = cameraRotation.x;
      }

      // Update camera based on zoom
      if (cameraRef.current) {
        const direction = new THREE.Vector3(0, 0, 0).sub(cameraRef.current.position).normalize();
        const distance = cameraZoom;
        cameraRef.current.position.lerp(
          new THREE.Vector3(direction.x * -distance, 3, direction.z * distance),
          0.05
        );
        cameraRef.current.lookAt(0, 1, 0);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (!canvasRef.current) return;
      const width = canvasRef.current.clientWidth;
      const height = canvasRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      renderer.dispose();
    };
  }, [cameraRotation, cameraZoom]);

  // Mouse controls for 3D rotation
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    setMouseDown(true);
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!mouseDown) return;

    const deltaMove = {
      x: e.clientX - mousePosition.x,
      y: e.clientY - mousePosition.y,
    };

    setCameraRotation((prev) => ({
      x: prev.x + deltaMove.y * 0.01,
      y: prev.y + deltaMove.x * 0.01,
    }));

    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleCanvasMouseUp = () => {
    setMouseDown(false);
  };

  const handleCanvasWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setCameraZoom((prev) => Math.max(2, Math.min(15, prev + e.deltaY * 0.01)));
  };

  // File upload handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      processFiles(files);
    }
  };

  const processFiles = async (files: File[]) => {
    const validFiles = files.filter((file) => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      return validTypes.includes(file.type);
    });

    if (validFiles.length === 0) {
      alert('Please upload valid image files (JPG, PNG, WebP)');
      return;
    }

    setIsProcessing(true);
    setCurrentStageIndex(0);

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const reader = new FileReader();

      reader.onload = (event) => {
        const preview = event.target?.result as string;
        const newFile: UploadedFile = {
          file,
          preview,
          id: Math.random().toString(36).substr(2, 9),
        };

        setUploadedFiles((prev) => [...prev, newFile]);

        // Simulate upload progress
        setUploadProgress((i + 1) / validFiles.length * 100);
      };

      reader.readAsDataURL(file);
    }

    // Simulate pipeline processing
    for (let stage = 0; stage < pipelineStages.length; stage++) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setCurrentStageIndex(stage + 1);
    }

    setIsProcessing(false);
    setUploadProgress(0);
    setShowMaterials(true);
  };

  const handleRemoveFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f5f5 0%, #e8f5e9 100%)',
        padding: '40px 20px',
        fontFamily: 'Archivo, sans-serif',
      }}
    >
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          textAlign: 'center',
          marginBottom: '50px',
        }}
      >
        <h1
          style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: COLORS.green,
            marginBottom: '12px',
            fontFamily: 'Archivo Black, sans-serif',
            letterSpacing: '-1px',
          }}
        >
          Walk Through Your Future Home
        </h1>
        <p
          style={{
            fontSize: '18px',
            color: '#666',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.6',
          }}
        >
          Transform your space into a 3D experience. Upload images, analyze materials, and explore your design possibilities.
        </p>
      </motion.div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 3fr 1fr',
          gap: '30px',
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        {/* Left Sidebar - Materials */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            height: 'fit-content',
          }}
        >
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: COLORS.green,
              marginBottom: '16px',
              marginTop: 0,
            }}
          >
            Detected Materials
          </h3>

          <AnimatePresence>
            {showMaterials ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                {mockMaterials.map((material, index) => (
                  <motion.div
                    key={material.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: '#f9f9f9',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                    }}
                    whileHover={{ x: 4 }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: material.color,
                        border: '2px solid #eee',
                      }}
                    />
                    <span style={{ fontSize: '13px', color: '#333', fontWeight: 500 }}>
                      {material.name}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <p style={{ color: '#999', fontSize: '13px', margin: 0 }}>
                Upload images to detect materials
              </p>
            )}
          </AnimatePresence>

          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #eee' }}>
            <h4
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#333',
                marginBottom: '12px',
                marginTop: 0,
              }}
            >
              Dimensions
            </h4>
            {showDimensions ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                {mockDimensions.map((dim, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    style={{
                      fontSize: '12px',
                      color: '#666',
                      padding: '8px',
                      background: '#f0f8f5',
                      borderRadius: '4px',
                    }}
                  >
                    <div style={{ fontWeight: 500, color: COLORS.green }}>
                      {dim.label}
                    </div>
                    <div style={{ fontSize: '11px', marginTop: '2px' }}>
                      {dim.value}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <p style={{ color: '#999', fontSize: '12px', margin: 0 }}>
                Dimensions will appear here
              </p>
            )}
          </div>

          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #eee' }}>
            <h4
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#333',
                marginBottom: '12px',
                marginTop: 0,
              }}
            >
              Voice Commands
            </h4>
            <button
              onClick={() => setIsListeningVoice(!isListeningVoice)}
              style={{
                width: '100%',
                padding: '12px',
                background: isListeningVoice ? COLORS.red : COLORS.green,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                marginBottom: '12px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 4px 12px rgba(29, 158, 117, 0.3)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              🎤 {isListeningVoice ? 'Stop' : 'Start'} Listening
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {voiceCommands.map((cmd, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  style={{
                    fontSize: '11px',
                    color: '#666',
                    padding: '8px',
                    background: '#f0f8f5',
                    borderRadius: '4px',
                    borderLeft: `3px solid ${COLORS.green}`,
                  }}
                >
                  {cmd}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Center - Main 3D Viewer and Upload */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* 3D Viewer */}
          <motion.div
            style={{
              position: 'relative',
              background: 'white',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              aspectRatio: '16/10',
            }}
            whileHover={{ boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
          >
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
              }}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onWheel={handleCanvasWheel}
            />

            {/* API Status Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '10px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  background: COLORS.gold,
                  borderRadius: '50%',
                  animation: 'pulse 2s infinite',
                }}
              />
              Waiting for API
            </motion.div>

            {/* Mouse control hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 2 }}
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                background: 'rgba(0, 0, 0, 0.5)',
                color: '#ccc',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '11px',
              }}
            >
              Drag to rotate • Scroll to zoom
            </motion.div>
          </motion.div>

          {/* Pipeline Visualization */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#333',
                marginTop: 0,
                marginBottom: '20px',
              }}
            >
              Processing Pipeline
            </h3>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              {pipelineStages.map((stage, index) => (
                <React.Fragment key={stage.id}>
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{
                      scale: index <= currentStageIndex ? 1 : 0.8,
                      opacity: 1,
                    }}
                    transition={{ delay: index * 0.1 }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      flex: 1,
                    }}
                  >
                    <motion.div
                      animate={index < currentStageIndex ? { backgroundColor: COLORS.green } : {}}
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        background:
                          index < currentStageIndex
                            ? COLORS.green
                            : index === currentStageIndex && isProcessing
                            ? COLORS.gold
                            : '#e0e0e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        color: index <= currentStageIndex ? 'white' : '#999',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border:
                          index === currentStageIndex && isProcessing
                            ? `2px solid ${COLORS.gold}`
                            : 'none',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {index < currentStageIndex && '✓'}
                      {index === currentStageIndex && isProcessing && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          style={{ fontSize: '20px' }}
                        >
                          {stage.icon}
                        </motion.div>
                      )}
                      {index > currentStageIndex && stage.icon}
                    </motion.div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: index <= currentStageIndex ? COLORS.green : '#999',
                        textAlign: 'center',
                      }}
                    >
                      {stage.label}
                    </span>
                  </motion.div>

                  {index < pipelineStages.length - 1 && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{
                        scaleX: index < currentStageIndex ? 1 : 0,
                        opacity: index < currentStageIndex ? 1 : 0.3,
                      }}
                      transition={{ duration: 0.5 }}
                      style={{
                        height: '2px',
                        background: COLORS.green,
                        flex: 1,
                        originX: 0,
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </motion.div>

          {/* Upload Zone */}
          <motion.div
            ref={dragRef}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            animate={isDragging ? { borderColor: COLORS.green, backgroundColor: '#f0f8f5' } : {}}
            style={{
              border: `2px dashed ${isDragging ? COLORS.green : '#ddd'}`,
              borderRadius: '12px',
              padding: '40px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              background: isDragging ? '#f0f8f5' : 'white',
            }}
          >
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
              id="file-input"
            />

            <label
              htmlFor="file-input"
              style={{
                cursor: 'pointer',
                display: 'block',
              }}
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                style={{
                  fontSize: '48px',
                  marginBottom: '16px',
                }}
              >
                📸
              </motion.div>

              <h4
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: COLORS.green,
                  margin: '0 0 8px 0',
                }}
              >
                Drag & Drop Your Images
              </h4>

              <p
                style={{
                  fontSize: '14px',
                  color: '#666',
                  margin: '0 0 16px 0',
                  lineHeight: '1.5',
                }}
              >
                or click to browse. Supports JPG, PNG, WebP (max 10MB each)
              </p>
            </label>

            {/* Upload Progress */}
            {isProcessing && uploadProgress > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginTop: '24px',
                }}
              >
                <div
                  style={{
                    height: '6px',
                    background: '#e0e0e0',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    marginBottom: '12px',
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    style={{
                      height: '100%',
                      background: `linear-gradient(90deg, ${COLORS.green}, ${COLORS.gold})`,
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p
                  style={{
                    fontSize: '12px',
                    color: '#666',
                    margin: 0,
                  }}
                >
                  {uploadProgress.toFixed(0)}% Uploaded
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* File Previews */}
          {uploadedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#333',
                  marginTop: 0,
                  marginBottom: '16px',
                }}
              >
                Uploaded Files ({uploadedFiles.length})
              </h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                  gap: '16px',
                }}
              >
                {uploadedFiles.map((file, index) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    style={{
                      position: 'relative',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      aspectRatio: '1',
                      background: '#f5f5f5',
                      border: '2px solid #e0e0e0',
                    }}
                    whileHover={{ borderColor: COLORS.green }}
                  >
                    <img
                      src={file.preview}
                      alt={file.file.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleRemoveFile(file.id)}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        width: '24px',
                        height: '24px',
                        background: 'rgba(0, 0, 0, 0.6)',
                        border: 'none',
                        borderRadius: '50%',
                        color: 'white',
                        fontSize: '16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                      }}
                    >
                      ✕
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Right Sidebar - Export Options */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            height: 'fit-content',
          }}
        >
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: COLORS.green,
              marginBottom: '20px',
              marginTop: 0,
            }}
          >
            Export Options
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Share Link', icon: '🔗' },
              { label: 'Export .glb', icon: '📦' },
              { label: 'View in AR', icon: '📱' },
            ].map((option, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                style={{
                  padding: '12px 16px',
                  background: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#666',
                  cursor: 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease',
                }}
                whileHover={{ opacity: 0.7 }}
                disabled
              >
                <span>{option.icon}</span>
                {option.label}
              </motion.button>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              marginTop: '20px',
              padding: '12px',
              background: '#fff8e1',
              border: `1px solid ${COLORS.gold}`,
              borderRadius: '8px',
              fontSize: '11px',
              color: '#666',
              lineHeight: '1.5',
            }}
          >
            <strong style={{ color: COLORS.gold }}>Coming Soon</strong> — Export features
            will be enabled once the World Labs API is integrated.
          </motion.div>
        </motion.div>
      </div>

      {/* Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        style={{
          marginTop: '40px',
          padding: '16px 20px',
          background: '#f5f5f5',
          border: `1px solid #ddd`,
          borderRadius: '8px',
          fontSize: '13px',
          color: '#666',
          maxWidth: '1400px',
          margin: '40px auto 0',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>⚙️</span>
          <strong>Status:</strong> World Labs Marble API integration pending — 3D generation
          will activate when API key is configured in environment variables.
        </span>
      </motion.div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}

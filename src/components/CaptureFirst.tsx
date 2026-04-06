'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

const BRAND_COLORS = {
  green: '#1D9E75',
  gold: '#D85A30',
  red: '#E8443A',
  purple: '#7F77DD',
  blue: '#378ADD',
  lightGray: '#F5F5F5',
  darkGray: '#333333',
  white: '#FFFFFF',
};

const PIPELINE_STAGES = [
  { id: 1, label: 'Capture', icon: '📹' },
  { id: 2, label: 'Point Cloud', icon: '☁️' },
  { id: 3, label: 'Mesh Generation', icon: '🔷' },
  { id: 4, label: 'Texture Mapping', icon: '🎨' },
  { id: 5, label: '3D Model', icon: '🎭' },
];

const TIPS = [
  'Walk slowly and deliberately through the space',
  'Cover all corners and edges for complete data',
  'Good lighting helps with texture accuracy',
  'Overlap your shots for better reconstruction',
  'Keep the camera steady for best results',
];

interface CapturedPhoto {
  id: string;
  data: string;
  timestamp: number;
}

interface MaterialDetection {
  name: string;
  confidence: number;
  color: string;
}

export default function CaptureFirst() {
  const [mode, setMode] = useState<'idle' | 'video' | 'photos'>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [currentStage, setCurrentStage] = useState(1);
  const [stageProgress, setStageProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [demolitionLevel, setDemolitionLevel] = useState(100);
  const [isStripped, setIsStripped] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [spaceMetrics, setSpaceMetrics] = useState({
    squareFeet: 0,
    ceilingHeight: 0,
    wallLengths: [0, 0, 0, 0],
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const isDraggingRef = useRef(false);
  const previousMouseRef = useRef({ x: 0, y: 0 });

  const materialDetections: MaterialDetection[] = [
    { name: 'Drywall', confidence: 0.94, color: BRAND_COLORS.lightGray },
    { name: 'Wood Flooring', confidence: 0.87, color: '#8B4513' },
    { name: 'Paint (Off-white)', confidence: 0.91, color: '#FAF9F7' },
    { name: 'Metal Frame', confidence: 0.78, color: '#C0C0C0' },
    { name: 'Glass/Window', confidence: 0.82, color: BRAND_COLORS.blue },
  ];

  // Initialize Three.js point cloud scene
  useEffect(() => {
    if (!sceneContainerRef.current) return;

    const width = sceneContainerRef.current.clientWidth;
    const height = sceneContainerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BRAND_COLORS.white);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    sceneContainerRef.current.appendChild(renderer.domElement);

    // Create point cloud (mock data)
    const geometry = new THREE.BufferGeometry();
    const particleCount = 5000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    // Generate room-like point cloud
    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 8;
      const y = (Math.random() - 0.5) * 6;
      const z = (Math.random() - 0.5) * 8;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Color gradient from floor green to ceiling blue
      const yNorm = (y + 3) / 6;
      const greenValue = yNorm;
      const blueValue = 1 - yNorm;

      colors[i * 3] = 0.1;
      colors[i * 3 + 1] = greenValue;
      colors[i * 3 + 2] = blueValue;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particlesRef.current = particles;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.4);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // Mouse controls
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !particlesRef.current) return;

      const deltaX = e.clientX - previousMouseRef.current.x;
      const deltaY = e.clientY - previousMouseRef.current.y;

      particlesRef.current.rotation.y += deltaX * 0.01;
      particlesRef.current.rotation.x += deltaY * 0.01;

      previousMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!cameraRef.current) return;
      const zoomSpeed = 0.1;
      if (e.deltaY > 0) {
        cameraRef.current.position.z += zoomSpeed;
      } else {
        cameraRef.current.position.z = Math.max(
          1,
          cameraRef.current.position.z - zoomSpeed
        );
      }
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      if (particlesRef.current && !isDraggingRef.current) {
        particlesRef.current.rotation.y += 0.0002;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      const newWidth = sceneContainerRef.current?.clientWidth || width;
      const newHeight = sceneContainerRef.current?.clientHeight || height;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      sceneContainerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!countdownActive) return;

    if (countdown > 0) {
      countdownIntervalRef.current = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else {
      setCountdownActive(false);
      setIsRecording(true);
      setRecordingTime(0);
    }

    return () => {
      if (countdownIntervalRef.current) clearTimeout(countdownIntervalRef.current);
    };
  }, [countdown, countdownActive]);

  // Recording timer
  useEffect(() => {
    if (!isRecording) return;

    recordingIntervalRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev >= 30) {
          setIsRecording(false);
          stopRecording();
          return 30;
        }
        return prev + 1;
      });
    }, 1000);

    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    };
  }, [isRecording]);

  const startVideoCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        mediaStreamRef.current = stream;
      }

      setMode('video');
      setCountdownActive(true);
      setCountdown(3);
    } catch (err) {
      console.error('Camera access denied:', err);
      alert('Please grant camera permissions to use this feature.');
    }
  };

  const stopRecording = async () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setMode('idle');
    setRecordingTime(0);

    // Simulate processing pipeline
    simulateProcessing();
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(
      videoRef.current,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    const imageData = canvasRef.current.toDataURL('image/jpeg');
    const newPhoto: CapturedPhoto = {
      id: `photo_${Date.now()}`,
      data: imageData,
      timestamp: Date.now(),
    };

    setCapturedPhotos((prev) => [...prev, newPhoto]);
  };

  const startPhotoMode = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        mediaStreamRef.current = stream;
      }

      setMode('photos');
      setCapturedPhotos([]);
    } catch (err) {
      console.error('Camera access denied:', err);
      alert('Please grant camera permissions to use this feature.');
    }
  };

  const stopPhotoMode = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (capturedPhotos.length >= 8) {
      setMode('idle');
      simulateProcessing();
    } else {
      alert(`Please capture at least 8 photos. You have ${capturedPhotos.length}.`);
    }
  };

  const simulateProcessing = () => {
    setIsProcessing(true);
    setCurrentStage(1);
    setStageProgress(0);

    // Simulate processing through all stages
    PIPELINE_STAGES.forEach((stage, index) => {
      setTimeout(() => {
        setCurrentStage(stage.id);
        setStageProgress(0);

        const progressInterval = setInterval(() => {
          setStageProgress((prev) => {
            if (prev >= 100) {
              clearInterval(progressInterval);
              return 100;
            }
            return prev + Math.random() * 30;
          });
        }, 200);

        return () => clearInterval(progressInterval);
      }, index * 3000);
    });

    setTimeout(() => {
      setIsProcessing(false);
      setCurrentStage(1);
      setStageProgress(0);
      setSpaceMetrics({
        squareFeet: Math.round(Math.random() * 200 + 150),
        ceilingHeight: Math.round((Math.random() * 1.5 + 8) * 10) / 10,
        wallLengths: [
          Math.round((Math.random() * 5 + 15) * 10) / 10,
          Math.round((Math.random() * 5 + 12) * 10) / 10,
          Math.round((Math.random() * 5 + 15) * 10) / 10,
          Math.round((Math.random() * 5 + 12) * 10) / 10,
        ],
      });
    }, PIPELINE_STAGES.length * 3000 + 1000);
  };

  const handleTipNavigation = (direction: 'prev' | 'next') => {
    setCurrentTipIndex((prev) => {
      if (direction === 'next') {
        return (prev + 1) % TIPS.length;
      } else {
        return (prev - 1 + TIPS.length) % TIPS.length;
      }
    });
  };

  const progressPercentage = (recordingTime / 30) * 100;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: BRAND_COLORS.white,
        padding: '20px',
        fontFamily: 'Archivo, sans-serif',
        color: BRAND_COLORS.darkGray,
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          marginBottom: '30px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '2.5rem',
            fontFamily: 'Archivo Black, sans-serif',
            color: BRAND_COLORS.green,
            margin: '0 0 10px 0',
          }}
        >
          Capture First
        </h1>
        <p
          style={{
            fontSize: '1rem',
            color: BRAND_COLORS.darkGray,
            margin: 0,
          }}
        >
          3D Reconstruction from Photos & Video
        </p>
      </motion.div>

      {/* API Integration Banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          background: '#FFF3CD',
          border: `2px solid ${BRAND_COLORS.gold}`,
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '30px',
          fontSize: '0.9rem',
          color: BRAND_COLORS.darkGray,
          textAlign: 'center',
        }}
      >
        Status: API integration pending. Using mock data for demonstration.
      </motion.div>

      {/* Mode Selection */}
      {mode === 'idle' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            marginBottom: '30px',
          }}
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startVideoCapture}
            style={{
              padding: '40px 20px',
              background: BRAND_COLORS.green,
              color: BRAND_COLORS.white,
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.2rem',
              fontFamily: 'Archivo, sans-serif',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
          >
            📹 Record Walkthrough
            <div style={{ fontSize: '0.8rem', marginTop: '8px', opacity: 0.9 }}>
              30-second max
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startPhotoMode}
            style={{
              padding: '40px 20px',
              background: BRAND_COLORS.blue,
              color: BRAND_COLORS.white,
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.2rem',
              fontFamily: 'Archivo, sans-serif',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
          >
            📸 Take Photos
            <div style={{ fontSize: '0.8rem', marginTop: '8px', opacity: 0.9 }}>
              Min 8 photos
            </div>
          </motion.button>
        </motion.div>
      )}

      {/* Video Recording Interface */}
      {mode === 'video' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            background: BRAND_COLORS.lightGray,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '30px',
            maxWidth: '600px',
            margin: '0 auto 30px',
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              borderRadius: '8px',
              marginBottom: '20px',
              background: '#000',
            }}
          />

          {/* Countdown Overlay */}
          {countdownActive && (
            <motion.div
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              style={{
                position: 'absolute',
                fontSize: '4rem',
                fontFamily: 'Archivo Black, sans-serif',
                color: BRAND_COLORS.red,
                textAlign: 'center',
              }}
            >
              {countdown}
            </motion.div>
          )}

          {/* Recording Status */}
          {isRecording && (
            <motion.div
              style={{
                textAlign: 'center',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  marginBottom: '15px',
                }}
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: BRAND_COLORS.red,
                  }}
                />
                <span
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    color: BRAND_COLORS.red,
                  }}
                >
                  Recording: {recordingTime}s / 30s
                </span>
              </div>

              {/* Circular Progress Indicator */}
              <div
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: `conic-gradient(${BRAND_COLORS.green} 0deg ${
                    progressPercentage * 3.6
                  }deg, ${BRAND_COLORS.lightGray} ${
                    progressPercentage * 3.6
                  }deg 360deg)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: '110px',
                    height: '110px',
                    borderRadius: '50%',
                    background: BRAND_COLORS.white,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    fontWeight: 'bold',
                    color: BRAND_COLORS.green,
                  }}
                >
                  {Math.round(progressPercentage)}%
                </div>
              </div>
            </motion.div>
          )}

          <button
            onClick={stopRecording}
            style={{
              width: '100%',
              padding: '12px',
              background: BRAND_COLORS.red,
              color: BRAND_COLORS.white,
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 'bold',
              fontFamily: 'Archivo, sans-serif',
              cursor: 'pointer',
            }}
          >
            Stop Recording
          </button>
        </motion.div>
      )}

      {/* Photo Capture Interface */}
      {mode === 'photos' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            background: BRAND_COLORS.lightGray,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '30px',
            maxWidth: '600px',
            margin: '0 auto 30px',
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              borderRadius: '8px',
              marginBottom: '20px',
              background: '#000',
            }}
          />

          <div
            style={{
              marginBottom: '20px',
              padding: '12px',
              background: BRAND_COLORS.white,
              borderRadius: '8px',
              textAlign: 'center',
              fontSize: '0.95rem',
              color: BRAND_COLORS.darkGray,
            }}
          >
            Photos captured: {capturedPhotos.length} / 8 (minimum)
          </div>

          {/* Photo Grid Preview */}
          {capturedPhotos.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                marginBottom: '20px',
              }}
            >
              {capturedPhotos.map((photo) => (
                <img
                  key={photo.id}
                  src={photo.data}
                  alt={`Captured ${photo.id}`}
                  style={{
                    width: '100%',
                    height: '80px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    border: `2px solid ${BRAND_COLORS.green}`,
                  }}
                />
              ))}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
            }}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={capturePhoto}
              style={{
                padding: '12px',
                background: BRAND_COLORS.green,
                color: BRAND_COLORS.white,
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 'bold',
                fontFamily: 'Archivo, sans-serif',
                cursor: 'pointer',
              }}
            >
              📸 Capture Photo
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={stopPhotoMode}
              disabled={capturedPhotos.length < 8}
              style={{
                padding: '12px',
                background:
                  capturedPhotos.length >= 8 ? BRAND_COLORS.blue : '#CCCCCC',
                color: BRAND_COLORS.white,
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 'bold',
                fontFamily: 'Archivo, sans-serif',
                cursor:
                  capturedPhotos.length >= 8 ? 'pointer' : 'not-allowed',
              }}
            >
              ✓ Complete
            </motion.button>
          </div>
        </motion.div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Processing Pipeline */}
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            background: BRAND_COLORS.lightGray,
            borderRadius: '12px',
            padding: '30px',
            marginBottom: '30px',
          }}
        >
          <h2
            style={{
              fontSize: '1.3rem',
              fontFamily: 'Archivo Black, sans-serif',
              marginBottom: '20px',
              color: BRAND_COLORS.green,
            }}
          >
            Processing Pipeline
          </h2>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '30px',
              flexWrap: 'wrap',
            }}
          >
            {PIPELINE_STAGES.map((stage, index) => (
              <div
                key={stage.id}
                style={{
                  textAlign: 'center',
                  flex: '1 1 auto',
                  minWidth: '100px',
                }}
              >
                <motion.div
                  animate={
                    currentStage === stage.id
                      ? { scale: 1.2 }
                      : { scale: 1 }
                  }
                  style={{
                    fontSize: '2rem',
                    marginBottom: '8px',
                    color:
                      currentStage >= stage.id
                        ? BRAND_COLORS.green
                        : BRAND_COLORS.lightGray,
                  }}
                >
                  {stage.icon}
                </motion.div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color:
                      currentStage >= stage.id
                        ? BRAND_COLORS.darkGray
                        : '#AAAAAA',
                  }}
                >
                  {stage.label}
                </div>

                {index < PIPELINE_STAGES.length - 1 && (
                  <motion.div
                    animate={
                      currentStage > stage.id
                        ? { opacity: 1, x: 0 }
                        : { opacity: 0.3, x: -10 }
                    }
                    style={{
                      position: 'absolute',
                      width: '40px',
                      height: '2px',
                      background: BRAND_COLORS.green,
                      marginTop: '-15px',
                      marginLeft: '55px',
                      arrow: 'right',
                    }}
                  >
                    →
                  </motion.div>
                )}
              </div>
            ))}
          </div>

          {/* Current Stage Progress */}
          {currentStage <= PIPELINE_STAGES.length && (
            <div
              style={{
                marginTop: '20px',
              }}
            >
              <div
                style={{
                  fontSize: '0.9rem',
                  marginBottom: '8px',
                  color: BRAND_COLORS.darkGray,
                }}
              >
                {PIPELINE_STAGES.find((s) => s.id === currentStage)?.label}:{' '}
                {Math.min(Math.round(stageProgress), 100)}%
              </div>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  background: BRAND_COLORS.lightGray,
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  animate={{ width: `${Math.min(stageProgress, 100)}%` }}
                  transition={{ duration: 0.3 }}
                  style={{
                    height: '100%',
                    background: BRAND_COLORS.green,
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Point Cloud Viewer */}
      {!isProcessing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            background: BRAND_COLORS.lightGray,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '30px',
          }}
        >
          <h2
            style={{
              fontSize: '1.3rem',
              fontFamily: 'Archivo Black, sans-serif',
              marginBottom: '15px',
              color: BRAND_COLORS.green,
            }}
          >
            Point Cloud Preview
          </h2>
          <div
            ref={sceneContainerRef}
            style={{
              width: '100%',
              height: '400px',
              borderRadius: '8px',
              overflow: 'hidden',
              background: BRAND_COLORS.white,
              border: `2px solid ${BRAND_COLORS.lightGray}`,
              marginBottom: '15px',
            }}
          />
          <div
            style={{
              fontSize: '0.9rem',
              color: BRAND_COLORS.darkGray,
              padding: '10px',
              background: BRAND_COLORS.white,
              borderRadius: '6px',
              textAlign: 'center',
            }}
          >
            Point Count: 5,000 | Drag to rotate | Scroll to zoom
          </div>
        </motion.div>
      )}

      {/* Strip to Studs Toggle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          background: BRAND_COLORS.lightGray,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '30px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <h3
            style={{
              fontSize: '1.1rem',
              fontFamily: 'Archivo Black, sans-serif',
              color: BRAND_COLORS.green,
              margin: 0,
            }}
          >
            Virtual Demolition
          </h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsStripped(!isStripped)}
            style={{
              padding: '8px 16px',
              background: isStripped ? BRAND_COLORS.red : BRAND_COLORS.green,
              color: BRAND_COLORS.white,
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              fontFamily: 'Archivo, sans-serif',
              cursor: 'pointer',
            }}
          >
            {isStripped ? '🏗️ Strip to Studs' : '🏠 View Finished'}
          </motion.button>
        </div>

        <div>
          <label
            style={{
              fontSize: '0.85rem',
              color: BRAND_COLORS.darkGray,
              marginBottom: '8px',
              display: 'block',
            }}
          >
            Demolition Level: {demolitionLevel}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={demolitionLevel}
            onChange={(e) => setDemolitionLevel(Number(e.target.value))}
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '4px',
              background: BRAND_COLORS.lightGray,
              outline: 'none',
              WebkitAppearance: 'slider-horizontal',
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#999',
              marginTop: '6px',
            }}
          >
            <span>0% (Studs)</span>
            <span>100% (Finished)</span>
          </div>
        </div>
      </motion.div>

      {/* Material Identification Panel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          background: BRAND_COLORS.lightGray,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '30px',
        }}
      >
        <h2
          style={{
            fontSize: '1.3rem',
            fontFamily: 'Archivo Black, sans-serif',
            marginBottom: '15px',
            color: BRAND_COLORS.green,
          }}
        >
          Material Identification
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '15px',
          }}
        >
          {materialDetections.map((material) => (
            <motion.div
              key={material.name}
              whileHover={{ scale: 1.05 }}
              style={{
                background: BRAND_COLORS.white,
                borderRadius: '8px',
                padding: '12px',
                border: `2px solid ${material.color}`,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '40px',
                  background: material.color,
                  borderRadius: '4px',
                  marginBottom: '8px',
                }}
              />
              <div
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  color: BRAND_COLORS.darkGray,
                  marginBottom: '4px',
                }}
              >
                {material.name}
              </div>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: BRAND_COLORS.green,
                }}
              >
                Confidence: {Math.round(material.confidence * 100)}%
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Space Metrics */}
      {spaceMetrics.squareFeet > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            background: BRAND_COLORS.lightGray,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '30px',
          }}
        >
          <h2
            style={{
              fontSize: '1.3rem',
              fontFamily: 'Archivo Black, sans-serif',
              marginBottom: '15px',
              color: BRAND_COLORS.green,
            }}
          >
            Space Metrics
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '15px',
            }}
          >
            <div
              style={{
                background: BRAND_COLORS.white,
                borderRadius: '8px',
                padding: '15px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '0.8rem',
                  color: '#999',
                  marginBottom: '5px',
                }}
              >
                Square Footage
              </div>
              <div
                style={{
                  fontSize: '1.8rem',
                  fontWeight: 'bold',
                  color: BRAND_COLORS.green,
                }}
              >
                {spaceMetrics.squareFeet}
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#999',
                }}
              >
                sq ft
              </div>
            </div>

            <div
              style={{
                background: BRAND_COLORS.white,
                borderRadius: '8px',
                padding: '15px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '0.8rem',
                  color: '#999',
                  marginBottom: '5px',
                }}
              >
                Ceiling Height
              </div>
              <div
                style={{
                  fontSize: '1.8rem',
                  fontWeight: 'bold',
                  color: BRAND_COLORS.blue,
                }}
              >
                {spaceMetrics.ceilingHeight}
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#999',
                }}
              >
                feet
              </div>
            </div>

            {spaceMetrics.wallLengths.map((length, index) => (
              <div
                key={`wall_${index}`}
                style={{
                  background: BRAND_COLORS.white,
                  borderRadius: '8px',
                  padding: '15px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: '#999',
                    marginBottom: '5px',
                  }}
                >
                  Wall {index + 1}
                </div>
                <div
                  style={{
                    fontSize: '1.8rem',
                    fontWeight: 'bold',
                    color: BRAND_COLORS.purple,
                  }}
                >
                  {length}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#999',
                  }}
                >
                  feet
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Tips Carousel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          background: BRAND_COLORS.lightGray,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '30px',
        }}
      >
        <h2
          style={{
            fontSize: '1.3rem',
            fontFamily: 'Archivo Black, sans-serif',
            marginBottom: '15px',
            color: BRAND_COLORS.green,
          }}
        >
          Tips for Best Results
        </h2>

        <div
          style={{
            background: BRAND_COLORS.white,
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '15px',
            minHeight: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTipIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                fontSize: '1.1rem',
                color: BRAND_COLORS.darkGray,
              }}
            >
              {TIPS[currentTipIndex]}
            </motion.div>
          </AnimatePresence>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleTipNavigation('prev')}
            style={{
              padding: '8px 12px',
              background: BRAND_COLORS.green,
              color: BRAND_COLORS.white,
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              cursor: 'pointer',
              fontFamily: 'Archivo, sans-serif',
            }}
          >
            ← Previous
          </motion.button>

          <div
            style={{
              fontSize: '0.85rem',
              color: '#999',
            }}
          >
            Tip {currentTipIndex + 1} / {TIPS.length}
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleTipNavigation('next')}
            style={{
              padding: '8px 12px',
              background: BRAND_COLORS.green,
              color: BRAND_COLORS.white,
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              cursor: 'pointer',
              fontFamily: 'Archivo, sans-serif',
            }}
          >
            Next →
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

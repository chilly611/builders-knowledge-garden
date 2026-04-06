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

const VIEW_MODES = {
  DESKTOP: 'desktop',
  VR_READY: 'vr',
  AR_READY: 'ar',
};

const QUALITY_SETTINGS = {
  LOW: { shadowMapSize: 512, lodBias: 2, name: 'Low' },
  MEDIUM: { shadowMapSize: 1024, lodBias: 1, name: 'Medium' },
  HIGH: { shadowMapSize: 2048, lodBias: 0, name: 'High' },
};

interface Hotspot {
  id: string;
  position: [number, number, number];
  label: string;
  cameraTarget: [number, number, number];
}

interface Annotation {
  id: string;
  position: [number, number, number];
  label: string;
  number: number;
}

interface Measurement {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  distance: number;
}

const HOTSPOTS: Hotspot[] = [
  {
    id: 'entrance',
    position: [0, 1, -4],
    label: 'Entrance',
    cameraTarget: [0, 1, 2],
  },
  {
    id: 'window',
    position: [4, 1.5, 0],
    label: 'Window',
    cameraTarget: [-3, 1, 0],
  },
  {
    id: 'corner',
    position: [-3, 1, 3],
    label: 'Corner Detail',
    cameraTarget: [2, 1, -2],
  },
];

export default function WebXRViewer() {
  const [viewMode, setViewMode] = useState<string>(VIEW_MODES.DESKTOP);
  const [isXRAvailable, setIsXRAvailable] = useState(false);
  const [isARAvailable, setIsARAvailable] = useState(false);
  const [isVRActive, setIsVRActive] = useState(false);
  const [quality, setQuality] = useState<keyof typeof QUALITY_SETTINGS>('MEDIUM');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementStart, setMeasurementStart] = useState<
    [number, number, number] | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const roomGroupRef = useRef<THREE.Group | null>(null);
  const hotspotsRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const annotationsRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const measurementLinesRef = useRef<Map<string, THREE.LineSegments>>(new Map());
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const isDraggingRef = useRef(false);
  const previousMouseRef = useRef({ x: 0, y: 0 });
  const orbitCenterRef = useRef(new THREE.Vector3(0, 1, 0));
  const cameraDistanceRef = useRef(6);
  const cameraThetaRef = useRef(Math.PI / 4);
  const cameraPhiRef = useRef(Math.PI / 3);

  // Check WebXR availability
  useEffect(() => {
    const checkXRSupport = async () => {
      try {
        if (navigator.xr) {
          const vrSupport = await navigator.xr.isSessionSupported('immersive-vr');
          const arSupport = await navigator.xr.isSessionSupported(
            'immersive-ar'
          );
          setIsXRAvailable(vrSupport);
          setIsARAvailable(arSupport);
        }
      } catch (err) {
        console.log('WebXR not supported:', err);
      }

      // Simulate loading completion
      setTimeout(() => {
        setIsLoading(false);
      }, 2000);
    };

    checkXRSupport();
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BRAND_COLORS.lightGray);
    scene.fog = new THREE.Fog(BRAND_COLORS.lightGray, 15, 25);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 1.6, 6);
    cameraRef.current = camera;

    // Renderer setup
    const canvas = document.createElement('canvas');
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowShadowMap;
    rendererRef.current = renderer;
    containerRef.current.appendChild(canvas);
    canvasRef.current = canvas;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(2, 4, 2);
    pointLight.castShadow = true;
    pointLight.shadow.mapSize.width = QUALITY_SETTINGS[quality].shadowMapSize;
    pointLight.shadow.mapSize.height = QUALITY_SETTINGS[quality].shadowMapSize;
    scene.add(pointLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(-5, 8, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = QUALITY_SETTINGS[quality].shadowMapSize;
    directionalLight.shadow.mapSize.height = QUALITY_SETTINGS[quality].shadowMapSize;
    directionalLight.shadow.camera.far = 20;
    scene.add(directionalLight);

    // Create room from primitives
    const roomGroup = new THREE.Group();
    sceneRef.current.add(roomGroup);
    roomGroupRef.current = roomGroup;

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(8, 8);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: BRAND_COLORS.green,
      metalness: 0.1,
      roughness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.castShadow = false;
    roomGroup.add(floor);

    // Ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(8, 8);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: '#EFEFEF',
      metalness: 0,
      roughness: 0.9,
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.position.y = 3;
    ceiling.rotation.x = Math.PI / 2;
    ceiling.receiveShadow = true;
    ceiling.castShadow = false;
    roomGroup.add(ceiling);

    // Walls
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: '#F5F5DC',
      metalness: 0,
      roughness: 0.9,
    });

    // Wall 1 (back)
    const wall1Geometry = new THREE.PlaneGeometry(8, 3);
    const wall1 = new THREE.Mesh(wall1Geometry, wallMaterial);
    wall1.position.z = -4;
    wall1.position.y = 1.5;
    wall1.receiveShadow = true;
    roomGroup.add(wall1);

    // Wall 2 (front)
    const wall2 = new THREE.Mesh(wall1Geometry, wallMaterial);
    wall2.position.z = 4;
    wall2.position.y = 1.5;
    wall2.receiveShadow = true;
    roomGroup.add(wall2);

    // Wall 3 (left)
    const wall3Geometry = new THREE.PlaneGeometry(8, 3);
    const wall3 = new THREE.Mesh(wall3Geometry, wallMaterial);
    wall3.rotation.y = Math.PI / 2;
    wall3.position.x = -4;
    wall3.position.y = 1.5;
    wall3.receiveShadow = true;
    roomGroup.add(wall3);

    // Wall 4 (right)
    const wall4 = new THREE.Mesh(wall3Geometry, wallMaterial);
    wall4.rotation.y = Math.PI / 2;
    wall4.position.x = 4;
    wall4.position.y = 1.5;
    wall4.receiveShadow = true;
    roomGroup.add(wall4);

    // Window frame (back wall)
    const windowFrameGeometry = new THREE.PlaneGeometry(2, 1.5);
    const windowFrameMaterial = new THREE.MeshStandardMaterial({
      color: BRAND_COLORS.blue,
      metalness: 0.3,
      roughness: 0.4,
    });
    const windowFrame = new THREE.Mesh(windowFrameGeometry, windowFrameMaterial);
    windowFrame.position.set(0, 2, -3.99);
    windowFrame.receiveShadow = true;
    roomGroup.add(windowFrame);

    // Table (center)
    const tableTopGeometry = new THREE.BoxGeometry(2, 0.08, 1.5);
    const tableTopMaterial = new THREE.MeshStandardMaterial({
      color: BRAND_COLORS.purple,
      metalness: 0.2,
      roughness: 0.6,
    });
    const tableTop = new THREE.Mesh(tableTopGeometry, tableTopMaterial);
    tableTop.position.y = 0.75;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    roomGroup.add(tableTop);

    // Table legs
    const legGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.75, 16);
    const legMaterial = new THREE.MeshStandardMaterial({
      color: '#3C2415',
      metalness: 0,
      roughness: 0.8,
    });

    const legPositions = [
      [-0.9, 0.375, -0.6],
      [0.9, 0.375, -0.6],
      [-0.9, 0.375, 0.6],
      [0.9, 0.375, 0.6],
    ];

    legPositions.forEach((pos) => {
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      leg.receiveShadow = true;
      roomGroup.add(leg);
    });

    // Chairs
    const chairGeometry = new THREE.BoxGeometry(0.5, 0.05, 0.5);
    const chairMaterial = new THREE.MeshStandardMaterial({
      color: BRAND_COLORS.red,
      metalness: 0.1,
      roughness: 0.7,
    });

    const chairPositions = [
      [-1.2, 0.4, 0],
      [1.2, 0.4, 0],
    ];

    chairPositions.forEach((pos) => {
      const chair = new THREE.Mesh(chairGeometry, chairMaterial);
      chair.position.set(pos[0], pos[1], pos[2]);
      chair.castShadow = true;
      chair.receiveShadow = true;
      roomGroup.add(chair);
    });

    // Bookshelf
    const shelfGeometry = new THREE.BoxGeometry(1.5, 2, 0.4);
    const shelfMaterial = new THREE.MeshStandardMaterial({
      color: BRAND_COLORS.gold,
      metalness: 0,
      roughness: 0.8,
    });
    const bookshelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
    bookshelf.position.set(3, 1, 0);
    bookshelf.castShadow = true;
    bookshelf.receiveShadow = true;
    roomGroup.add(bookshelf);

    // Create hotspot markers
    const createHotspotMarker = (hotspot: Hotspot) => {
      const group = new THREE.Group();

      // Sphere indicator
      const sphereGeometry = new THREE.SphereGeometry(0.15, 16, 16);
      const sphereMaterial = new THREE.MeshStandardMaterial({
        color: BRAND_COLORS.green,
        emissive: BRAND_COLORS.green,
        emissiveIntensity: 0.4,
        metalness: 0.4,
        roughness: 0.6,
      });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.userData.hotspotId = hotspot.id;
      group.add(sphere);

      // Ring around hotspot
      const ringGeometry = new THREE.TorusGeometry(0.25, 0.02, 16, 16);
      const ringMaterial = new THREE.MeshStandardMaterial({
        color: BRAND_COLORS.gold,
        emissive: BRAND_COLORS.gold,
        emissiveIntensity: 0.3,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.userData.hotspotId = hotspot.id;
      group.add(ring);

      group.position.set(hotspot.position[0], hotspot.position[1], hotspot.position[2]);
      group.userData.hotspotId = hotspot.id;
      group.userData.cameraTarget = hotspot.cameraTarget;
      group.userData.label = hotspot.label;

      roomGroup.add(group);
      hotspotsRef.current.set(hotspot.id, group);
    };

    HOTSPOTS.forEach(createHotspotMarker);

    // Mouse interaction
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / width) * 2 - 1;
      mouseRef.current.y = -(e.clientY / height) * 2 + 1;

      if (!isDraggingRef.current) return;

      const deltaX = e.clientX - previousMouseRef.current.x;
      const deltaY = e.clientY - previousMouseRef.current.y;

      cameraThetaRef.current += deltaX * 0.01;
      cameraPhiRef.current -= deltaY * 0.01;
      cameraPhiRef.current = Math.max(0.1, Math.min(Math.PI - 0.1, cameraPhiRef.current));

      previousMouseRef.current = { x: e.clientX, y: e.clientY };

      updateCameraPosition();
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSpeed = 0.3;
      if (e.deltaY > 0) {
        cameraDistanceRef.current = Math.min(
          15,
          cameraDistanceRef.current + zoomSpeed
        );
      } else {
        cameraDistanceRef.current = Math.max(
          1,
          cameraDistanceRef.current - zoomSpeed
        );
      }
      updateCameraPosition();
    };

    const onClick = (e: MouseEvent) => {
      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      const hotspotsArray = Array.from(hotspotsRef.current.values());
      const intersects = raycasterRef.current.intersectObjects(hotspotsArray, true);

      if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        let hotspotId = clickedObject.userData.hotspotId;

        // Traverse up to find hotspot group
        let current = clickedObject.parent;
        while (current && !hotspotId) {
          hotspotId = current.userData?.hotspotId;
          current = current.parent;
        }

        if (hotspotId) {
          const hotspot = hotspotsRef.current.get(hotspotId);
          if (hotspot) {
            setActiveHotspot(hotspotId);
            const targetPos = hotspot.userData.cameraTarget;
            animateCameraTo(targetPos);
          }
        }
      } else if (isMeasuring) {
        // Measure mode: click to place points
        const intersects = raycasterRef.current.intersectObject(floor);
        if (intersects.length > 0) {
          const point = intersects[0].point;
          const pointTuple: [number, number, number] = [
            point.x,
            point.y,
            point.z,
          ];

          if (!measurementStart) {
            setMeasurementStart(pointTuple);
          } else {
            const distance = Math.sqrt(
              Math.pow(pointTuple[0] - measurementStart[0], 2) +
                Math.pow(pointTuple[1] - measurementStart[1], 2) +
                Math.pow(pointTuple[2] - measurementStart[2], 2)
            );

            const measurement: Measurement = {
              id: `measurement_${Date.now()}`,
              start: measurementStart,
              end: pointTuple,
              distance,
            };

            setMeasurements((prev) => [...prev, measurement]);
            drawMeasurementLine(measurement);
            setMeasurementStart(null);
          }
        }
      } else {
        // Annotation mode: click to place pins
        const intersects = raycasterRef.current.intersectObject(floor);
        if (intersects.length > 0) {
          const point = intersects[0].point;
          const newAnnotation: Annotation = {
            id: `annotation_${Date.now()}`,
            position: [point.x, point.y, point.z],
            label: `Pin ${annotations.length + 1}`,
            number: annotations.length + 1,
          };
          setAnnotations((prev) => [...prev, newAnnotation]);
          createAnnotationPin(newAnnotation);
        }
      }
    };

    const updateCameraPosition = () => {
      if (!cameraRef.current) return;

      const x =
        orbitCenterRef.current.x +
        cameraDistanceRef.current *
          Math.sin(cameraPhiRef.current) *
          Math.sin(cameraThetaRef.current);
      const y =
        orbitCenterRef.current.y +
        cameraDistanceRef.current * Math.cos(cameraPhiRef.current);
      const z =
        orbitCenterRef.current.z +
        cameraDistanceRef.current *
          Math.sin(cameraPhiRef.current) *
          Math.cos(cameraThetaRef.current);

      cameraRef.current.position.set(x, y, z);
      cameraRef.current.lookAt(orbitCenterRef.current);
    };

    const animateCameraTo = (target: [number, number, number]) => {
      const startPos = camera.position.clone();
      const targetPos = new THREE.Vector3(target[0], target[1], target[2]);
      const duration = 1000;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        camera.position.lerpVectors(startPos, targetPos, progress);
        camera.lookAt(orbitCenterRef.current);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      animate();
    };

    const createAnnotationPin = (annotation: Annotation) => {
      const group = new THREE.Group();

      // Pin sphere
      const pinGeometry = new THREE.SphereGeometry(0.1, 16, 16);
      const pinMaterial = new THREE.MeshStandardMaterial({
        color: BRAND_COLORS.red,
        emissive: BRAND_COLORS.red,
        emissiveIntensity: 0.3,
      });
      const pin = new THREE.Mesh(pinGeometry, pinMaterial);
      pin.userData.annotationId = annotation.id;
      group.add(pin);

      // Number badge (using a simple box for now)
      const badgeGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.02);
      const badgeMaterial = new THREE.MeshStandardMaterial({
        color: BRAND_COLORS.white,
      });
      const badge = new THREE.Mesh(badgeGeometry, badgeMaterial);
      badge.position.z = 0.1;
      group.add(badge);

      group.position.set(annotation.position[0], annotation.position[1], annotation.position[2]);
      roomGroup.add(group);
      annotationsRef.current.set(annotation.id, group);
    };

    const drawMeasurementLine = (measurement: Measurement) => {
      const points = [
        new THREE.Vector3(
          measurement.start[0],
          measurement.start[1],
          measurement.start[2]
        ),
        new THREE.Vector3(measurement.end[0], measurement.end[1], measurement.end[2]),
      ];

      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: BRAND_COLORS.blue,
        linewidth: 3,
      });
      const line = new THREE.LineSegments(lineGeometry, lineMaterial);
      roomGroup.add(line);
      measurementLinesRef.current.set(measurement.id, line);
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    renderer.domElement.addEventListener('click', onClick);

    // Animation loop
    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);

      // Animate hotspots
      hotspotsRef.current.forEach((hotspot) => {
        hotspot.rotation.y += 0.005;
      });

      renderer.render(scene, camera);
    };

    animate();
    updateCameraPosition();

    // Handle window resize
    const handleResize = () => {
      const newWidth = containerRef.current?.clientWidth || width;
      const newHeight = containerRef.current?.clientHeight || height;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Simulate loading
    const loadingInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        const next = prev + Math.random() * 30;
        if (next >= 100) {
          clearInterval(loadingInterval);
          return 100;
        }
        return next;
      });
    }, 300);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('click', onClick);
      cancelAnimationFrame(frameId);
      clearInterval(loadingInterval);
      containerRef.current?.removeChild(canvas);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!canvasRef.current) return;

    if (!document.fullscreenElement) {
      canvasRef.current.parentElement?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleEnterVR = async () => {
    if (!navigator.xr || !isXRAvailable) return;

    try {
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor'],
      });
      setIsVRActive(true);
      // In a real implementation, switch renderer to XR mode
    } catch (err) {
      console.error('Failed to enter VR:', err);
    }
  };

  const handleEnterAR = async () => {
    if (!navigator.xr || !isARAvailable) return;

    try {
      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
      });
      setIsVRActive(true);
      // In a real implementation, switch renderer to AR mode
    } catch (err) {
      console.error('Failed to enter AR:', err);
    }
  };

  const captureScreenshot = () => {
    if (!canvasRef.current) return;

    const link = document.createElement('a');
    link.href = canvasRef.current.toDataURL('image/png');
    link.download = `3d-viewer-${Date.now()}.png`;
    link.click();
  };

  const clearAnnotations = () => {
    setAnnotations([]);
    annotationsRef.current.forEach((annotation) => {
      annotation.parent?.remove();
    });
    annotationsRef.current.clear();
  };

  const clearMeasurements = () => {
    setMeasurements([]);
    measurementLinesRef.current.forEach((line) => {
      line.parent?.remove();
    });
    measurementLinesRef.current.clear();
    setMeasurementStart(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: BRAND_COLORS.white,
        fontFamily: 'Archivo, sans-serif',
        color: BRAND_COLORS.darkGray,
      }}
    >
      {/* Loading bar */}
      {isLoading && (
        <motion.div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: BRAND_COLORS.lightGray,
            zIndex: 1000,
          }}
        >
          <motion.div
            animate={{ width: `${loadingProgress}%` }}
            transition={{ duration: 0.3 }}
            style={{
              height: '100%',
              background: `linear-gradient(90deg, ${BRAND_COLORS.green}, ${BRAND_COLORS.blue})`,
            }}
          />
        </motion.div>
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: '15px 20px',
          background: BRAND_COLORS.white,
          borderBottom: `1px solid ${BRAND_COLORS.lightGray}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.8rem',
              fontFamily: 'Archivo Black, sans-serif',
              color: BRAND_COLORS.green,
              margin: 0,
            }}
          >
            3D Viewer
          </h1>
          <p
            style={{
              fontSize: '0.8rem',
              color: '#999',
              margin: '4px 0 0 0',
            }}
          >
            WebXR-Ready VR/AR Experience
          </p>
        </div>

        {/* Device Compatibility Indicators */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <div
            title="Desktop Browser"
            style={{
              fontSize: '1.5rem',
              opacity: viewMode === VIEW_MODES.DESKTOP ? 1 : 0.5,
            }}
          >
            💻
          </div>
          <div
            title="Meta Quest Compatible"
            style={{
              fontSize: '1.5rem',
              opacity: isXRAvailable ? 1 : 0.3,
            }}
          >
            🥽
          </div>
          <div
            title="Apple Vision Pro Compatible"
            style={{
              fontSize: '1.5rem',
              opacity: isXRAvailable ? 1 : 0.3,
            }}
          >
            👓
          </div>
        </div>
      </motion.div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 300px',
          height: 'calc(100vh - 100px)',
          gap: 0,
        }}
      >
        {/* 3D Canvas Area */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            background: BRAND_COLORS.white,
            position: 'relative',
            overflow: 'hidden',
          }}
        />

        {/* Control Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            background: BRAND_COLORS.lightGray,
            borderLeft: `1px solid #DDD`,
            overflowY: 'auto',
            padding: '15px',
          }}
        >
          {/* View Mode Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                color: '#999',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              View Mode
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setViewMode(VIEW_MODES.DESKTOP)}
                style={{
                  padding: '8px',
                  background:
                    viewMode === VIEW_MODES.DESKTOP
                      ? BRAND_COLORS.green
                      : BRAND_COLORS.white,
                  color:
                    viewMode === VIEW_MODES.DESKTOP
                      ? BRAND_COLORS.white
                      : BRAND_COLORS.darkGray,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontFamily: 'Archivo, sans-serif',
                  cursor: 'pointer',
                }}
              >
                💻 Desktop
              </motion.button>

              {isXRAvailable && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setViewMode(VIEW_MODES.VR_READY);
                    handleEnterVR();
                  }}
                  style={{
                    padding: '8px',
                    background:
                      viewMode === VIEW_MODES.VR_READY
                        ? BRAND_COLORS.blue
                        : BRAND_COLORS.white,
                    color:
                      viewMode === VIEW_MODES.VR_READY
                        ? BRAND_COLORS.white
                        : BRAND_COLORS.darkGray,
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontFamily: 'Archivo, sans-serif',
                    cursor: 'pointer',
                  }}
                >
                  🥽 Enter VR
                </motion.button>
              )}

              {isARAvailable && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setViewMode(VIEW_MODES.AR_READY);
                    handleEnterAR();
                  }}
                  style={{
                    padding: '8px',
                    background:
                      viewMode === VIEW_MODES.AR_READY
                        ? BRAND_COLORS.purple
                        : BRAND_COLORS.white,
                    color:
                      viewMode === VIEW_MODES.AR_READY
                        ? BRAND_COLORS.white
                        : BRAND_COLORS.darkGray,
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontFamily: 'Archivo, sans-serif',
                    cursor: 'pointer',
                  }}
                >
                  📱 Enter AR
                </motion.button>
              )}

              {!isXRAvailable && !isARAvailable && (
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#999',
                    padding: '8px',
                    background: '#FFF',
                    borderRadius: '4px',
                    textAlign: 'center',
                  }}
                >
                  WebXR not available. Try Chrome/Edge on VR headset.
                </div>
              )}
            </div>
          </div>

          {/* Quality Settings */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                color: '#999',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              Quality
            </label>
            <select
              value={quality}
              onChange={(e) =>
                setQuality(e.target.value as keyof typeof QUALITY_SETTINGS)
              }
              style={{
                width: '100%',
                padding: '8px',
                background: BRAND_COLORS.white,
                border: `1px solid #DDD`,
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontFamily: 'Archivo, sans-serif',
              }}
            >
              <option value="LOW">Low (Fast)</option>
              <option value="MEDIUM">Medium (Balanced)</option>
              <option value="HIGH">High (Best)</option>
            </select>
          </div>

          {/* Tools */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                color: '#999',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              Tools
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsMeasuring(!isMeasuring)}
                style={{
                  padding: '8px',
                  background: isMeasuring
                    ? BRAND_COLORS.gold
                    : BRAND_COLORS.white,
                  color: isMeasuring
                    ? BRAND_COLORS.white
                    : BRAND_COLORS.darkGray,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontFamily: 'Archivo, sans-serif',
                  cursor: 'pointer',
                }}
              >
                📏 {isMeasuring ? 'Measuring...' : 'Measure'}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={captureScreenshot}
                style={{
                  padding: '8px',
                  background: BRAND_COLORS.white,
                  color: BRAND_COLORS.darkGray,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontFamily: 'Archivo, sans-serif',
                  cursor: 'pointer',
                }}
              >
                📷 Screenshot
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={toggleFullscreen}
                style={{
                  padding: '8px',
                  background: isFullscreen
                    ? BRAND_COLORS.green
                    : BRAND_COLORS.white,
                  color: isFullscreen
                    ? BRAND_COLORS.white
                    : BRAND_COLORS.darkGray,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontFamily: 'Archivo, sans-serif',
                  cursor: 'pointer',
                }}
              >
                {isFullscreen ? '🗗' : '⛶'} Fullscreen
              </motion.button>
            </div>
          </div>

          {/* Measurements */}
          {measurements.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  color: '#999',
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Measurements</span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={clearMeasurements}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    color: BRAND_COLORS.red,
                  }}
                >
                  ✕
                </motion.button>
              </div>
              <div
                style={{
                  background: BRAND_COLORS.white,
                  borderRadius: '6px',
                  padding: '8px',
                  fontSize: '0.75rem',
                  maxHeight: '120px',
                  overflowY: 'auto',
                }}
              >
                {measurements.map((m) => (
                  <div key={m.id} style={{ marginBottom: '4px' }}>
                    Distance: {m.distance.toFixed(2)}m
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Annotations */}
          {annotations.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  color: '#999',
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Pins ({annotations.length})</span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={clearAnnotations}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    color: BRAND_COLORS.red,
                  }}
                >
                  ✕
                </motion.button>
              </div>
              <div
                style={{
                  background: BRAND_COLORS.white,
                  borderRadius: '6px',
                  padding: '8px',
                  fontSize: '0.75rem',
                  maxHeight: '120px',
                  overflowY: 'auto',
                }}
              >
                {annotations.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      marginBottom: '4px',
                      paddingBottom: '4px',
                      borderBottom: '1px solid #EEE',
                    }}
                  >
                    <strong>{a.label}</strong>
                    <br />
                    <span style={{ color: '#999' }}>
                      ({a.position[0].toFixed(1)}, {a.position[1].toFixed(1)})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hotspots */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                color: '#999',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              Hotspots
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {HOTSPOTS.map((hotspot) => (
                <motion.button
                  key={hotspot.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setActiveHotspot(hotspot.id);
                    const group = hotspotsRef.current.get(hotspot.id);
                    if (group) {
                      animateCameraTo(group.userData.cameraTarget);
                    }
                  }}
                  style={{
                    padding: '8px',
                    background:
                      activeHotspot === hotspot.id
                        ? BRAND_COLORS.green
                        : BRAND_COLORS.white,
                    color:
                      activeHotspot === hotspot.id
                        ? BRAND_COLORS.white
                        : BRAND_COLORS.darkGray,
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontFamily: 'Archivo, sans-serif',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  📍 {hotspot.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div
            style={{
              background: BRAND_COLORS.white,
              borderRadius: '6px',
              padding: '12px',
              fontSize: '0.75rem',
              color: '#999',
              lineHeight: '1.4',
            }}
          >
            <strong>Controls:</strong>
            <div style={{ marginTop: '6px' }}>
              • Drag to rotate
              <br />• Scroll to zoom
              <br />• Click hotspots
              <br />• Enable measure/annotate
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

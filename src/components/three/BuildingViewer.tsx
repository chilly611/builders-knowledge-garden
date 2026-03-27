"use client";

import { useRef, useState, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, Html } from "@react-three/drei";
import * as THREE from "three";

/**
 * BuildingViewer — Interactive 3D procedural building
 * 
 * Generates a building from parameters and renders with React Three Fiber.
 * Orbit controls for rotation/zoom. Click surfaces to select.
 * 
 * Usage:
 *   <BuildingViewer stories={2} width={12} depth={10} roofPitch={6} />
 */

interface BuildingParams {
  stories?: number;
  width?: number;      // meters
  depth?: number;      // meters
  storyHeight?: number; // meters per story
  roofPitch?: number;  // degrees (0 = flat, 45 = steep)
  roofType?: "gable" | "hip" | "flat";
  wallColor?: string;
  roofColor?: string;
  windowColor?: string;
  showGround?: boolean;
}

interface Props extends BuildingParams {
  height?: number | string;
  onSurfaceClick?: (surface: string) => void;
}

// Generate window positions for a wall face
function generateWindows(
  wallWidth: number, wallHeight: number, stories: number, storyH: number
): { x: number; y: number; w: number; h: number }[] {
  const windows: { x: number; y: number; w: number; h: number }[] = [];
  const winW = 0.9, winH = 1.2, spacing = 2.4;
  const count = Math.max(1, Math.floor((wallWidth - 1) / spacing));
  const startX = -(count - 1) * spacing / 2;

  for (let s = 0; s < stories; s++) {
    const baseY = s * storyH + storyH * 0.45;
    for (let i = 0; i < count; i++) {
      windows.push({ x: startX + i * spacing, y: baseY, w: winW, h: winH });
    }
  }
  return windows;
}

// The 3D building mesh
function Building({
  stories = 2, width = 12, depth = 10, storyHeight = 3,
  roofPitch = 25, roofType = "gable",
  wallColor = "#e8e0d4", roofColor = "#5a4a3a", windowColor = "#7eb8d8",
  onSurfaceClick,
}: BuildingParams & { onSurfaceClick?: (s: string) => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const totalWallH = stories * storyHeight;
  const roofH = roofType === "flat" ? 0.3 : Math.tan(roofPitch * Math.PI / 180) * (width / 2);

  // Gentle rotation on idle
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
    }
  });

  // Gable roof geometry
  const roofGeo = useMemo(() => {
    if (roofType === "flat") return null;
    const shape = new THREE.Shape();
    const hw = width / 2;
    shape.moveTo(-hw - 0.4, 0);
    shape.lineTo(0, roofH);
    shape.lineTo(hw + 0.4, 0);
    shape.lineTo(-hw - 0.4, 0);
    const extrudeSettings = { depth: depth + 0.6, bevelEnabled: false };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [width, depth, roofH, roofType]);

  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: wallColor, roughness: 0.85, metalness: 0.05,
  }), [wallColor]);

  const roofMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: roofColor, roughness: 0.7, metalness: 0.1,
  }), [roofColor]);

  const winMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: windowColor, roughness: 0.1, metalness: 0.3,
    transparent: true, opacity: 0.7,
  }), [windowColor]);

  const frontWin = generateWindows(width, totalWallH, stories, storyHeight);
  const sideWin = generateWindows(depth, totalWallH, stories, storyHeight);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Main body */}
      <mesh
        position={[0, totalWallH / 2, 0]}
        material={wallMat}
        onClick={() => onSurfaceClick?.("walls")}
        onPointerOver={() => setHovered("walls")}
        onPointerOut={() => setHovered(null)}
      >
        <boxGeometry args={[width, totalWallH, depth]} />
      </mesh>

      {/* Floor lines between stories */}
      {Array.from({ length: stories - 1 }, (_, i) => (
        <mesh key={`floor-${i}`} position={[0, (i + 1) * storyHeight, 0]}>
          <boxGeometry args={[width + 0.05, 0.15, depth + 0.05]} />
          <meshStandardMaterial color="#c8c0b4" roughness={0.9} />
        </mesh>
      ))}

      {/* Front windows */}
      {frontWin.map((w, i) => (
        <mesh key={`fw-${i}`} position={[w.x, w.y, depth / 2 + 0.02]} material={winMat}>
          <planeGeometry args={[w.w, w.h]} />
        </mesh>
      ))}
      {/* Back windows */}
      {frontWin.map((w, i) => (
        <mesh key={`bw-${i}`} position={[w.x, w.y, -depth / 2 - 0.02]} rotation={[0, Math.PI, 0]} material={winMat}>
          <planeGeometry args={[w.w, w.h]} />
        </mesh>
      ))}
      {/* Left windows */}
      {sideWin.map((w, i) => (
        <mesh key={`lw-${i}`} position={[-width / 2 - 0.02, w.y, w.x]} rotation={[0, -Math.PI / 2, 0]} material={winMat}>
          <planeGeometry args={[w.w, w.h]} />
        </mesh>
      ))}
      {/* Right windows */}
      {sideWin.map((w, i) => (
        <mesh key={`rw-${i}`} position={[width / 2 + 0.02, w.y, w.x]} rotation={[0, Math.PI / 2, 0]} material={winMat}>
          <planeGeometry args={[w.w, w.h]} />
        </mesh>
      ))}

      {/* Front door */}
      <mesh position={[0, 1.1, depth / 2 + 0.02]}>
        <planeGeometry args={[1.0, 2.2]} />
        <meshStandardMaterial color="#4a3828" roughness={0.8} />
      </mesh>

      {/* Roof */}
      {roofType !== "flat" && roofGeo ? (
        <mesh
          geometry={roofGeo}
          material={roofMat}
          position={[0, totalWallH, -depth / 2 - 0.3]}
          onClick={() => onSurfaceClick?.("roof")}
          onPointerOver={() => setHovered("roof")}
          onPointerOut={() => setHovered(null)}
        />
      ) : (
        <mesh position={[0, totalWallH + 0.15, 0]} material={roofMat}
          onClick={() => onSurfaceClick?.("roof")}>
          <boxGeometry args={[width + 0.8, 0.3, depth + 0.8]} />
        </mesh>
      )}

      {/* Foundation base */}
      <mesh position={[0, -0.15, 0]}>
        <boxGeometry args={[width + 0.3, 0.3, depth + 0.3]} />
        <meshStandardMaterial color="#888880" roughness={0.95} />
      </mesh>
    </group>
  );
}

// Loading fallback
function Loader() {
  return (
    <Html center>
      <div style={{ color: "#1D9E75", fontSize: 14, fontWeight: 500, textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🏗️</div>
        Loading 3D view...
      </div>
    </Html>
  );
}

export default function BuildingViewer({
  stories = 2, width = 12, depth = 10, storyHeight = 3,
  roofPitch = 25, roofType = "gable",
  wallColor = "#e8e0d4", roofColor = "#5a4a3a", windowColor = "#7eb8d8",
  showGround = true, height = 400,
  onSurfaceClick,
}: Props) {
  const camDistance = Math.max(width, depth) * 1.4;

  return (
    <div style={{
      height, borderRadius: 16, overflow: "hidden",
      border: "1px solid var(--border, #e5e5e5)",
      background: "linear-gradient(180deg, #dce8f0 0%, #c4d8e4 40%, #a8c4a0 100%)",
    }}>
      <Canvas
        camera={{ position: [camDistance, camDistance * 0.7, camDistance], fov: 45 }}
        shadows
        dpr={[1, 2]}
      >
        <Suspense fallback={<Loader />}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[20, 30, 15]} intensity={1.2} castShadow
            shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
          <directionalLight position={[-10, 20, -10]} intensity={0.3} />

          {/* The building */}
          <Building
            stories={stories} width={width} depth={depth}
            storyHeight={storyHeight} roofPitch={roofPitch} roofType={roofType}
            wallColor={wallColor} roofColor={roofColor} windowColor={windowColor}
            onSurfaceClick={onSurfaceClick}
          />

          {/* Ground plane */}
          {showGround && (
            <>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]} receiveShadow>
                <planeGeometry args={[60, 60]} />
                <meshStandardMaterial color="#8aaa70" roughness={1} />
              </mesh>
              <ContactShadows position={[0, -0.29, 0]} opacity={0.4} scale={40} blur={2} />
            </>
          )}

          {/* Sky environment */}
          <Environment preset="sunset" />
          <OrbitControls
            enablePan={false}
            minDistance={camDistance * 0.5}
            maxDistance={camDistance * 3}
            minPolarAngle={0.2}
            maxPolarAngle={Math.PI / 2.1}
            autoRotate={false}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";

const BuildingViewer = dynamic(() => import("@/components/three/BuildingViewer"), {
  ssr: false,
  loading: () => (
    <div style={{ height: 400, borderRadius: 16, background: "linear-gradient(180deg, #dce8f0, #a8c4a0)", display: "flex", alignItems: "center", justifyContent: "center", color: "#666", fontSize: 14 }}>
      Loading 3D viewer...
    </div>
  ),
});

/**
 * BuildingDesigner — 3D building with live parametric sliders
 * 
 * Users adjust stories, width, depth, roof pitch, colors
 * and watch the 3D model update in real-time.
 */

interface Props {
  initialStories?: number;
  initialWidth?: number;
  initialDepth?: number;
  initialRoofPitch?: number;
  initialRoofType?: "gable" | "hip" | "flat";
  onParamsChange?: (params: BuildingParams) => void;
}

interface BuildingParams {
  stories: number;
  width: number;
  depth: number;
  roofPitch: number;
  roofType: "gable" | "hip" | "flat";
  wallColor: string;
  roofColor: string;
}

const WALL_PRESETS = [
  { label: "White Stucco", color: "#f0ece4" },
  { label: "Warm Stone", color: "#e8e0d4" },
  { label: "Cedar", color: "#c4a882" },
  { label: "Dark Brick", color: "#7a5c4a" },
  { label: "Modern Gray", color: "#b8b4ac" },
  { label: "Navy", color: "#3a4a5c" },
];

const ROOF_PRESETS = [
  { label: "Dark Shingle", color: "#5a4a3a" },
  { label: "Standing Seam", color: "#4a5a5a" },
  { label: "Terracotta", color: "#b86a4a" },
  { label: "Slate", color: "#6a6a6a" },
  { label: "Green", color: "#5a7a5a" },
  { label: "Copper", color: "#8a6a4a" },
];

function Slider({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: "var(--fg-secondary)" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent, #1D9E75)" }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--accent, #1D9E75)", height: 4, cursor: "pointer" }} />
    </div>
  );
}

export default function BuildingDesigner({
  initialStories = 2, initialWidth = 12, initialDepth = 10,
  initialRoofPitch = 25, initialRoofType = "gable",
  onParamsChange,
}: Props) {
  const [stories, setStories] = useState(initialStories);
  const [width, setWidth] = useState(initialWidth);
  const [depth, setDepth] = useState(initialDepth);
  const [roofPitch, setRoofPitch] = useState(initialRoofPitch);
  const [roofType, setRoofType] = useState<"gable" | "hip" | "flat">(initialRoofType);
  const [wallColor, setWallColor] = useState("#e8e0d4");
  const [roofColor, setRoofColor] = useState("#5a4a3a");
  const [selectedSurface, setSelectedSurface] = useState<string | null>(null);

  const update = useCallback((key: string, val: number | string) => {
    const params = { stories, width, depth, roofPitch, roofType, wallColor, roofColor, [key]: val };
    onParamsChange?.(params as BuildingParams);
  }, [stories, width, depth, roofPitch, roofType, wallColor, roofColor, onParamsChange]);

  const sqft = Math.round(width * depth * stories * 10.764); // m² to ft²
  const estCost = sqft * 250; // rough $/sf

  return (
    <div style={{ borderRadius: 20, overflow: "hidden", border: "1px solid var(--border, #e5e5e5)", background: "var(--bg, #fff)" }}>
      {/* 3D Viewer */}
      <BuildingViewer
        stories={stories} width={width} depth={depth}
        roofPitch={roofPitch} roofType={roofType}
        wallColor={wallColor} roofColor={roofColor}
        height={380}
        onSurfaceClick={setSelectedSurface}
      />

      {/* Controls panel */}
      <div style={{ padding: "20px 20px 24px" }}>
        {/* Live stats bar */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            { label: "Area", value: `${sqft.toLocaleString()} sf` },
            { label: "Stories", value: `${stories}` },
            { label: "Est. Cost", value: `$${(estCost / 1000).toFixed(0)}K` },
            { label: "Footprint", value: `${Math.round(width * 3.28)}' × ${Math.round(depth * 3.28)}'` },
          ].map(s => (
            <div key={s.label} style={{ padding: "6px 12px", borderRadius: 10, background: "var(--bg-secondary, #f8f8f8)", border: "1px solid var(--border, #e5e5e5)" }}>
              <div style={{ fontSize: 9, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--accent, #1D9E75)" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Parametric sliders */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
          <Slider label="Stories" value={stories} min={1} max={5} step={1} unit=""
            onChange={v => { setStories(v); update("stories", v); }} />
          <Slider label="Roof Pitch" value={roofPitch} min={0} max={45} step={5} unit="°"
            onChange={v => { setRoofPitch(v); update("roofPitch", v); }} />
          <Slider label="Width" value={width} min={6} max={30} step={1} unit="m"
            onChange={v => { setWidth(v); update("width", v); }} />
          <Slider label="Depth" value={depth} min={6} max={25} step={1} unit="m"
            onChange={v => { setDepth(v); update("depth", v); }} />
        </div>

        {/* Roof type selector */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--fg-secondary)", marginBottom: 6 }}>Roof Type</div>
          <div style={{ display: "flex", gap: 6 }}>
            {(["gable", "hip", "flat"] as const).map(rt => (
              <button key={rt} onClick={() => { setRoofType(rt); update("roofType", rt); }}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 10, border: "none", cursor: "pointer",
                  background: roofType === rt ? "var(--accent, #1D9E75)" : "var(--bg-secondary, #f0f0f0)",
                  color: roofType === rt ? "#fff" : "var(--fg-secondary)",
                  fontSize: 12, fontWeight: 600, transition: "all 0.2s",
                  textTransform: "capitalize",
                }}>
                {rt}
              </button>
            ))}
          </div>
        </div>

        {/* Wall color presets */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--fg-secondary)", marginBottom: 6 }}>
            Wall Material {selectedSurface === "walls" && <span style={{ color: "var(--accent)", fontSize: 10 }}>— selected</span>}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {WALL_PRESETS.map(p => (
              <button key={p.color} onClick={() => { setWallColor(p.color); update("wallColor", p.color); }}
                title={p.label}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: wallColor === p.color ? "2px solid var(--accent)" : "2px solid transparent",
                  background: p.color, cursor: "pointer", transition: "all 0.15s",
                  boxShadow: wallColor === p.color ? "0 0 0 2px var(--bg), 0 0 0 4px var(--accent)" : "none",
                }} />
            ))}
          </div>
        </div>

        {/* Roof color presets */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--fg-secondary)", marginBottom: 6 }}>
            Roof Material {selectedSurface === "roof" && <span style={{ color: "var(--accent)", fontSize: 10 }}>— selected</span>}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {ROOF_PRESETS.map(p => (
              <button key={p.color} onClick={() => { setRoofColor(p.color); update("roofColor", p.color); }}
                title={p.label}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: roofColor === p.color ? "2px solid var(--accent)" : "2px solid transparent",
                  background: p.color, cursor: "pointer", transition: "all 0.15s",
                  boxShadow: roofColor === p.color ? "0 0 0 2px var(--bg), 0 0 0 4px var(--accent)" : "none",
                }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

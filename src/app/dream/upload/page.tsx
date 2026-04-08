'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UploadedFile {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'audio' | 'video' | 'sketch';
  label: string;
  size: string;
  color: string;
}

interface Annotation {
  id: string;
  x: number;
  y: number;
  text: string;
}

const mockFiles: UploadedFile[] = [
  { id: '1', name: 'kitchen-photo.jpg', type: 'image', label: 'KITCHEN', size: '2.4 MB', color: '#D85A30' },
  { id: '2', name: 'floor-plan.pdf', type: 'pdf', label: 'FLOOR PLAN', size: '1.1 MB', color: '#2E6699' },
  { id: '3', name: 'voice-note.m4a', type: 'audio', label: 'VOICE NOTE', size: '0.8 MB', color: '#00B8D4' },
  { id: '4', name: 'sketch.png', type: 'image', label: 'SKETCH', size: '0.5 MB', color: '#7F77DD' },
];

const mockAnnotations: Annotation[] = [
  { id: 'a1', x: 28, y: 35, text: 'Cabinet height: 36"' },
  { id: 'a2', x: 55, y: 55, text: "Island: 4'×8'" },
  { id: 'a3', x: 72, y: 28, text: 'Window: double-hung' },
];

const mockBrief = `PROJECT BRIEF — Kitchen Remodel
================================
Scope: Full kitchen renovation
Est. Budget: $18,000 - $32,000
Timeline: 6-10 weeks

Key Elements:
• Kitchen island (4'×8') with seating
• Custom cabinetry — shaker style
• Quartz countertops
• Pendant lighting over island
• Hardwood flooring throughout

Recommended Trades:
• General Contractor (lead)
• Cabinet Maker
• Electrician (lighting)
• Flooring Specialist`;

const fileTypeEmoji: Record<string, string> = {
  image: '📷',
  pdf: '📄',
  audio: '🎵',
  video: '🎬',
  sketch: '✏️',
};

const fileTypeGradient: Record<string, string> = {
  image: 'linear-gradient(135deg, #D85A30 0%, #FFA726 50%, #FDF8F0 100%)',
  pdf: 'linear-gradient(135deg, #2E6699 0%, #7BAAD4 60%, #EBF2FA 100%)',
  audio: 'linear-gradient(135deg, #00B8D4 0%, #A8CAE8 70%, #FDF8F0 100%)',
  video: 'linear-gradient(135deg, #1B3A5C 0%, #4A89BE 60%, #EBF2FA 100%)',
  sketch: 'linear-gradient(135deg, #7F77DD 0%, #D4E5F4 70%, #FDF8F0 100%)',
};

export default function DreamUploadStudio() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadedFile[]>(mockFiles);
  const [selectedFile, setSelectedFile] = useState<UploadedFile>(mockFiles[0]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [brief, setBrief] = useState('');
  const [measurementMode, setMeasurementMode] = useState(false);
  const [annotations] = useState<Annotation[]>(mockAnnotations);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    const newFiles: UploadedFile[] = droppedFiles.map((f, i) => ({
      id: `drop-${Date.now()}-${i}`,
      name: f.name,
      type: f.type.startsWith('image/') ? 'image'
        : f.type === 'application/pdf' ? 'pdf'
        : f.type.startsWith('audio/') ? 'audio'
        : f.type.startsWith('video/') ? 'video'
        : 'sketch',
      label: f.name.split('.')[0].toUpperCase().slice(0, 10),
      size: `${(f.size / 1024 / 1024).toFixed(1)} MB`,
      color: '#4A89BE',
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    const newFiles: UploadedFile[] = selected.map((f, i) => ({
      id: `input-${Date.now()}-${i}`,
      name: f.name,
      type: f.type.startsWith('image/') ? 'image'
        : f.type === 'application/pdf' ? 'pdf'
        : f.type.startsWith('audio/') ? 'audio'
        : f.type.startsWith('video/') ? 'video'
        : 'sketch',
      label: f.name.split('.')[0].toUpperCase().slice(0, 10),
      size: `${(f.size / 1024 / 1024).toFixed(1)} MB`,
      color: '#4A89BE',
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const next = prev.filter(f => f.id !== id);
      if (selectedFile.id === id && next.length > 0) {
        setSelectedFile(next[0]);
      }
      return next;
    });
  }, [selectedFile.id]);

  const handleGenerateBrief = () => {
    setIsGenerating(true);
    setBrief('');
    setTimeout(() => {
      setBrief(mockBrief);
      setIsGenerating(false);
    }, 1500);
  };

  const cornerMarkStyle = (pos: 'tl' | 'tr' | 'bl' | 'br'): React.CSSProperties => ({
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: 'var(--bp-ink-400)',
    borderStyle: 'solid',
    borderTopWidth: pos === 'tl' || pos === 'tr' ? 2 : 0,
    borderBottomWidth: pos === 'bl' || pos === 'br' ? 2 : 0,
    borderLeftWidth: pos === 'tl' || pos === 'bl' ? 2 : 0,
    borderRightWidth: pos === 'tr' || pos === 'br' ? 2 : 0,
    top: pos === 'tl' || pos === 'tr' ? 8 : undefined,
    bottom: pos === 'bl' || pos === 'br' ? 8 : undefined,
    left: pos === 'tl' || pos === 'bl' ? 8 : undefined,
    right: pos === 'tr' || pos === 'br' ? 8 : undefined,
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bp-paper-cream)',
      fontFamily: 'var(--bp-font-mono)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Keyframe styles */}
      <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
          70% { box-shadow: 0 0 0 12px rgba(220, 38, 38, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
        }
        @keyframes dots {
          0% { content: '.'; }
          33% { content: '..'; }
          66% { content: '...'; }
          100% { content: '.'; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .recording-btn { animation: pulse-ring 1.5s ease-out infinite; }
        .analyzing-dots::after {
          content: '...';
          animation: blink 1s step-start infinite;
        }
      `}</style>

      {/* STICKY HEADER */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--bp-ink-900)',
        borderBottom: '2px solid var(--bp-ink-700)',
        padding: '0 24px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        {/* Left: back + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/dream" style={{
            color: 'var(--bp-ink-300)',
            textDecoration: 'none',
            fontSize: 12,
            fontFamily: 'var(--bp-font-mono)',
            letterSpacing: '0.05em',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            ← BACK TO DREAM
          </Link>
          <div style={{ width: 1, height: 24, background: 'var(--bp-ink-700)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Blueprint corner decoration */}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M2 2 L8 2 L8 4 L4 4 L4 8 L2 8 Z" fill="var(--bp-ink-400)" />
              <path d="M18 2 L12 2 L12 4 L16 4 L16 8 L18 8 Z" fill="var(--bp-ink-400)" />
              <path d="M2 18 L8 18 L8 16 L4 16 L4 12 L2 12 Z" fill="var(--bp-ink-400)" />
              <path d="M18 18 L12 18 L12 16 L16 16 L16 12 L18 12 Z" fill="var(--bp-ink-400)" />
            </svg>
            <span style={{
              color: 'var(--bp-paper-cream)',
              fontSize: 16,
              fontFamily: 'var(--bp-font-mono)',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>
              DREAM UPLOAD STUDIO
            </span>
          </div>
        </div>

        {/* Right: badge + CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            background: 'var(--bp-ink-700)',
            color: 'var(--bp-ink-200)',
            fontSize: 11,
            fontFamily: 'var(--bp-font-mono)',
            padding: '3px 10px',
            borderRadius: 2,
            letterSpacing: '0.08em',
          }}>
            {files.length} FILE{files.length !== 1 ? 'S' : ''}
          </span>
          <button
            onClick={() => router.push('/dream/design')}
            style={{
              background: 'linear-gradient(135deg, #FFA726, #E65100)',
              color: '#fff',
              border: 'none',
              padding: '8px 20px',
              fontFamily: 'var(--bp-font-mono)',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              borderRadius: 2,
            }}
          >
            GENERATE BLUEPRINT →
          </button>
        </div>
      </header>

      {/* MAIN 3-PANEL AREA */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        minHeight: 0,
      }}>

        {/* LEFT PANEL */}
        <div style={{
          width: 320,
          flexShrink: 0,
          borderRight: '1px solid var(--bp-paper-border)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bp-paper-warm)',
          overflow: 'hidden',
        }}>

          {/* Upload Zone */}
          <div style={{ padding: 16, borderBottom: '1px solid var(--bp-paper-border)' }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: isDragOver ? '2px dashed var(--bp-cyan-main)' : '2px dashed var(--bp-ink-300)',
                background: isDragOver ? 'var(--bp-ink-50)' : 'var(--bp-paper-cream)',
                boxShadow: isDragOver ? '0 0 0 3px rgba(0,184,212,0.15)' : 'none',
                borderRadius: 4,
                padding: 24,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                minHeight: 160,
                transition: 'all 0.15s ease',
              }}
            >
              {/* Crosshair SVG */}
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="10" stroke="var(--bp-ink-400)" strokeWidth="1.5" fill="none" />
                <line x1="24" y1="2" x2="24" y2="14" stroke="var(--bp-ink-400)" strokeWidth="1.5" />
                <line x1="24" y1="34" x2="24" y2="46" stroke="var(--bp-ink-400)" strokeWidth="1.5" />
                <line x1="2" y1="24" x2="14" y2="24" stroke="var(--bp-ink-400)" strokeWidth="1.5" />
                <line x1="34" y1="24" x2="46" y2="24" stroke="var(--bp-ink-400)" strokeWidth="1.5" />
                <circle cx="24" cy="24" r="2" fill="var(--bp-ink-400)" />
              </svg>
              <span style={{
                color: 'var(--bp-ink-600)',
                fontSize: 13,
                fontFamily: 'var(--bp-font-mono)',
                fontWeight: 700,
                letterSpacing: '0.1em',
              }}>
                DROP FILES HERE
              </span>
              <span style={{
                color: 'var(--bp-ink-400)',
                fontSize: 10,
                fontFamily: 'var(--bp-font-mono)',
                letterSpacing: '0.06em',
                textAlign: 'center',
              }}>
                IMG · PDF · AUDIO · VIDEO · SVG
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,audio/*,video/*,.svg"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
          </div>

          {/* Media Gallery */}
          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <span style={{
                color: 'var(--bp-ink-600)',
                fontSize: 11,
                fontFamily: 'var(--bp-font-mono)',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}>
                UPLOADED FILES
              </span>
              <span style={{
                background: 'var(--bp-ink-100)',
                color: 'var(--bp-ink-600)',
                fontSize: 10,
                fontFamily: 'var(--bp-font-mono)',
                padding: '2px 8px',
                borderRadius: 2,
              }}>
                {files.length}
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
            }}>
              {files.map(file => (
                <div
                  key={file.id}
                  onClick={() => setSelectedFile(file)}
                  style={{
                    background: 'var(--bp-paper-cream)',
                    border: selectedFile.id === file.id
                      ? '2px solid var(--bp-ink-700)'
                      : '1px solid var(--bp-paper-border)',
                    boxShadow: selectedFile.id === file.id
                      ? '0 2px 8px rgba(11,29,51,0.18)'
                      : 'none',
                    borderRadius: 3,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.12s ease',
                  }}
                >
                  {/* Colored top border */}
                  <div style={{ height: 3, background: file.color }} />
                  <div style={{ padding: '8px 8px 6px' }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{fileTypeEmoji[file.type] ?? '📁'}</div>
                    <div style={{
                      color: 'var(--bp-ink-700)',
                      fontSize: 10,
                      fontFamily: 'var(--bp-font-mono)',
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: 4,
                    }}>
                      {file.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{
                        background: file.color + '22',
                        color: file.color,
                        fontSize: 8,
                        fontFamily: 'var(--bp-font-mono)',
                        fontWeight: 700,
                        padding: '1px 4px',
                        borderRadius: 1,
                        letterSpacing: '0.05em',
                      }}>
                        {file.label}
                      </span>
                      <span style={{
                        color: 'var(--bp-ink-400)',
                        fontSize: 8,
                        fontFamily: 'var(--bp-font-mono)',
                      }}>
                        {file.size}
                      </span>
                    </div>
                  </div>
                  {/* Remove button */}
                  <button
                    onClick={e => { e.stopPropagation(); removeFile(file.id); }}
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 4,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--bp-ink-400)',
                      cursor: 'pointer',
                      fontSize: 12,
                      lineHeight: 1,
                      padding: '0 2px',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER PANEL */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bp-paper-cream)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Center top toolbar */}
          <div style={{
            padding: '10px 16px',
            borderBottom: '1px solid var(--bp-paper-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bp-paper-warm)',
            flexShrink: 0,
          }}>
            <span style={{
              color: 'var(--bp-ink-600)',
              fontSize: 11,
              fontFamily: 'var(--bp-font-mono)',
              fontWeight: 700,
              letterSpacing: '0.1em',
            }}>
              {selectedFile.label} — {selectedFile.name}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{
                background: 'var(--bp-ink-100)',
                border: '1px solid var(--bp-ink-300)',
                color: 'var(--bp-ink-700)',
                padding: '5px 12px',
                fontSize: 10,
                fontFamily: 'var(--bp-font-mono)',
                fontWeight: 700,
                letterSpacing: '0.08em',
                cursor: 'pointer',
                borderRadius: 2,
              }}>
                + ADD ANNOTATION
              </button>
              <button
                onClick={() => setMeasurementMode(m => !m)}
                style={{
                  background: measurementMode ? 'var(--bp-cyan-main)' : 'transparent',
                  border: `1px solid ${measurementMode ? 'var(--bp-cyan-main)' : 'var(--bp-ink-300)'}`,
                  color: measurementMode ? '#fff' : 'var(--bp-ink-600)',
                  padding: '5px 12px',
                  fontSize: 10,
                  fontFamily: 'var(--bp-font-mono)',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  borderRadius: 2,
                  transition: 'all 0.12s ease',
                }}
              >
                {measurementMode ? '⊕ MEAS. ON' : '⊕ MEASUREMENT MODE'}
              </button>
            </div>
          </div>

          {/* Preview area */}
          <div style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            backgroundImage: `
              linear-gradient(rgba(46,102,153,0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(46,102,153,0.08) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
            backgroundPosition: '0 0',
          }}>
            {/* Corner marks */}
            <div style={cornerMarkStyle('tl')} />
            <div style={cornerMarkStyle('tr')} />
            <div style={cornerMarkStyle('bl')} />
            <div style={cornerMarkStyle('br')} />

            {/* File preview gradient */}
            <div style={{
              position: 'absolute',
              top: '10%',
              left: '10%',
              right: '10%',
              bottom: '18%',
              background: fileTypeGradient[selectedFile.type] ?? fileTypeGradient['image'],
              borderRadius: 2,
              border: '1px solid var(--bp-paper-border)',
              opacity: 0.7,
            }} />

            {/* File type emoji centered */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 64,
              opacity: 0.25,
              pointerEvents: 'none',
              userSelect: 'none',
            }}>
              {fileTypeEmoji[selectedFile.type] ?? '📁'}
            </div>

            {/* Annotation markers */}
            {annotations.map(ann => (
              <div key={ann.id} style={{
                position: 'absolute',
                left: `${ann.x}%`,
                top: `${ann.y}%`,
                pointerEvents: 'none',
              }}>
                <svg
                  width="60"
                  height="40"
                  viewBox="0 0 60 40"
                  style={{ overflow: 'visible' }}
                >
                  {/* Circle with crosshair */}
                  <circle cx="8" cy="8" r="7" fill="none" stroke="var(--bp-amber-main)" strokeWidth="1.5" />
                  <line x1="8" y1="2" x2="8" y2="6" stroke="var(--bp-amber-main)" strokeWidth="1" />
                  <line x1="8" y1="10" x2="8" y2="14" stroke="var(--bp-amber-main)" strokeWidth="1" />
                  <line x1="2" y1="8" x2="6" y2="8" stroke="var(--bp-amber-main)" strokeWidth="1" />
                  <line x1="10" y1="8" x2="14" y2="8" stroke="var(--bp-amber-main)" strokeWidth="1" />
                  {/* Line to callout */}
                  <line x1="15" y1="8" x2="30" y2="8" stroke="var(--bp-amber-main)" strokeWidth="1" strokeDasharray="3 2" />
                </svg>
                {/* Callout box */}
                <div style={{
                  position: 'absolute',
                  left: 32,
                  top: -2,
                  background: 'var(--bp-ink-900)',
                  border: '1px solid var(--bp-amber-main)',
                  padding: '3px 8px',
                  borderRadius: 2,
                  whiteSpace: 'nowrap',
                  color: 'var(--bp-amber-main)',
                  fontSize: 10,
                  fontFamily: 'var(--bp-font-mono)',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}>
                  {ann.text}
                </div>
              </div>
            ))}

            {/* Scale bar */}
            <div style={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(253,248,240,0.85)',
              border: '1px solid var(--bp-paper-border)',
              padding: '4px 12px',
              borderRadius: 2,
            }}>
              <div style={{
                width: 60,
                height: 4,
                background: 'var(--bp-ink-700)',
                position: 'relative',
              }}>
                <div style={{ position: 'absolute', left: 0, top: -4, width: 1, height: 12, background: 'var(--bp-ink-700)' }} />
                <div style={{ position: 'absolute', right: 0, top: -4, width: 1, height: 12, background: 'var(--bp-ink-700)' }} />
              </div>
              <span style={{
                color: 'var(--bp-ink-600)',
                fontSize: 10,
                fontFamily: 'var(--bp-font-mono)',
                letterSpacing: '0.04em',
              }}>
                SCALE: 1/4&quot; = 1&apos;-0&quot;
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{
          width: 280,
          flexShrink: 0,
          borderLeft: '1px solid var(--bp-paper-border)',
          background: 'var(--bp-paper-warm)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}>

          {/* AI Analysis */}
          <div style={{
            padding: 16,
            borderBottom: '1px solid var(--bp-paper-border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{
                color: 'var(--bp-ink-700)',
                fontSize: 11,
                fontFamily: 'var(--bp-font-mono)',
                fontWeight: 700,
                letterSpacing: '0.1em',
              }}>
                AI ANALYSIS
              </span>
              <span style={{
                background: 'var(--bp-cyan-main)',
                color: '#fff',
                fontSize: 9,
                fontFamily: 'var(--bp-font-mono)',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 2,
                letterSpacing: '0.06em',
              }}>
                LIVE
              </span>
            </div>

            <div style={{
              color: 'var(--bp-ink-500)',
              fontSize: 10,
              fontFamily: 'var(--bp-font-mono)',
              fontWeight: 700,
              letterSpacing: '0.06em',
              marginBottom: 8,
            }}>
              DETECTED ELEMENTS
            </div>

            {[
              { label: 'Kitchen Island', pct: 94 },
              { label: 'Pendant Lighting', pct: 87 },
              { label: 'Hardwood Flooring', pct: 91 },
              { label: 'Open Plan Layout', pct: 78 },
            ].map(item => (
              <div key={item.label} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ color: 'var(--bp-ink-600)', fontSize: 10, fontFamily: 'var(--bp-font-mono)' }}>
                    {item.label}
                  </span>
                  <span style={{ color: 'var(--bp-ink-500)', fontSize: 10, fontFamily: 'var(--bp-font-mono)', fontWeight: 700 }}>
                    {item.pct}%
                  </span>
                </div>
                <div style={{ height: 4, background: 'var(--bp-ink-100)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${item.pct}%`,
                    background: 'var(--bp-ink-400)',
                    borderRadius: 2,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>
            ))}

            <div style={{
              marginTop: 12,
              padding: '8px 10px',
              background: 'var(--bp-ink-50)',
              border: '1px solid var(--bp-ink-200)',
              borderRadius: 2,
              marginBottom: 10,
            }}>
              <div style={{
                color: 'var(--bp-ink-400)',
                fontSize: 9,
                fontFamily: 'var(--bp-font-mono)',
                letterSpacing: '0.08em',
                marginBottom: 3,
              }}>
                PROJECT TYPE
              </div>
              <div style={{
                color: 'var(--bp-ink-700)',
                fontSize: 13,
                fontFamily: 'var(--bp-font-mono)',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}>
                Kitchen Remodel
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
              {['#kitchen', '#remodel', '#residential', '#15-30k'].map(tag => (
                <span key={tag} style={{
                  background: 'var(--bp-ink-100)',
                  color: 'var(--bp-ink-500)',
                  fontSize: 9,
                  fontFamily: 'var(--bp-font-mono)',
                  padding: '2px 6px',
                  borderRadius: 2,
                }}>
                  {tag}
                </span>
              ))}
            </div>

            <button style={{
              background: 'transparent',
              border: '1px solid var(--bp-ink-300)',
              color: 'var(--bp-ink-500)',
              padding: '4px 10px',
              fontSize: 9,
              fontFamily: 'var(--bp-font-mono)',
              fontWeight: 700,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              borderRadius: 2,
            }}>
              ↺ RE-ANALYZE
            </button>
          </div>

          {/* Voice Notes */}
          <div style={{
            padding: 16,
            borderBottom: '1px solid var(--bp-paper-border)',
          }}>
            <div style={{
              color: 'var(--bp-ink-700)',
              fontSize: 11,
              fontFamily: 'var(--bp-font-mono)',
              fontWeight: 700,
              letterSpacing: '0.1em',
              marginBottom: 12,
            }}>
              VOICE NOTES
            </div>

            {/* Record button */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <button
                onClick={() => setIsRecording(r => !r)}
                className={isRecording ? 'recording-btn' : ''}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: isRecording ? '#DC2626' : '#EF4444',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s ease',
                }}
              >
                <div style={{
                  width: isRecording ? 16 : 14,
                  height: isRecording ? 16 : 14,
                  borderRadius: isRecording ? 2 : '50%',
                  background: '#fff',
                  transition: 'all 0.15s ease',
                }} />
              </button>
            </div>

            {/* Mock voice notes */}
            {[
              { text: 'Expand the kitchen island...', duration: '0:23', time: '2 min ago', transcript: 'Expand the kitchen island by 2 feet on the north side.' },
              { text: 'Move pantry to the north wall', duration: '0:15', time: '5 min ago', transcript: 'Move the pantry to the north wall, adjacent to the fridge.' },
            ].map((note, i) => (
              <div key={i} style={{
                background: 'var(--bp-paper-cream)',
                border: '1px solid var(--bp-paper-border)',
                borderRadius: 3,
                padding: 10,
                marginBottom: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <button style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'var(--bp-ink-600)',
                    border: 'none',
                    color: '#fff',
                    fontSize: 9,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    ▶
                  </button>
                  {/* Waveform decoration */}
                  <svg width="80" height="16" viewBox="0 0 80 16">
                    {Array.from({ length: 20 }, (_, j) => {
                      const h = 4 + Math.sin(j * 0.8 + i) * 4 + Math.cos(j * 1.3) * 3;
                      return (
                        <rect
                          key={j}
                          x={j * 4}
                          y={(16 - h) / 2}
                          width="2"
                          height={h}
                          fill="var(--bp-ink-300)"
                          rx="1"
                        />
                      );
                    })}
                  </svg>
                  <span style={{ color: 'var(--bp-ink-500)', fontSize: 9, fontFamily: 'var(--bp-font-mono)', marginLeft: 'auto', flexShrink: 0 }}>
                    {note.duration}
                  </span>
                </div>
                <div style={{ color: 'var(--bp-ink-600)', fontSize: 10, fontFamily: 'var(--bp-font-mono)', marginBottom: 3 }}>
                  {note.text}
                </div>
                <div style={{ color: 'var(--bp-ink-400)', fontSize: 9, fontFamily: 'var(--bp-font-mono)', fontStyle: 'italic', marginBottom: 3 }}>
                  {note.transcript}
                </div>
                <div style={{ color: 'var(--bp-ink-300)', fontSize: 9, fontFamily: 'var(--bp-font-mono)' }}>
                  {note.time}
                </div>
              </div>
            ))}
          </div>

          {/* Project Brief Generator */}
          <div style={{ padding: 16 }}>
            <button
              onClick={handleGenerateBrief}
              disabled={isGenerating}
              style={{
                width: '100%',
                background: isGenerating ? 'var(--bp-ink-200)' : 'var(--bp-ink-700)',
                border: 'none',
                color: '#fff',
                padding: '10px 16px',
                fontFamily: 'var(--bp-font-mono)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                borderRadius: 2,
                marginBottom: 12,
                transition: 'background 0.15s ease',
              }}
            >
              {isGenerating
                ? <span className="analyzing-dots">ANALYZING</span>
                : 'GENERATE PROJECT BRIEF'}
            </button>

            {brief && (
              <>
                <textarea
                  readOnly
                  value={brief}
                  rows={8}
                  style={{
                    width: '100%',
                    background: 'var(--bp-paper-cream)',
                    border: '1px solid var(--bp-paper-border)',
                    color: 'var(--bp-ink-700)',
                    fontFamily: 'var(--bp-font-mono)',
                    fontSize: 10,
                    lineHeight: 1.6,
                    padding: '8px 10px',
                    borderRadius: 2,
                    resize: 'none',
                    marginBottom: 8,
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(brief).catch(() => console.log('Brief copied'));
                    }}
                    style={{
                      flex: 1,
                      background: 'var(--bp-ink-100)',
                      border: '1px solid var(--bp-ink-300)',
                      color: 'var(--bp-ink-600)',
                      padding: '6px 0',
                      fontFamily: 'var(--bp-font-mono)',
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      cursor: 'pointer',
                      borderRadius: 2,
                    }}
                  >
                    COPY BRIEF
                  </button>
                  <button
                    onClick={() => console.log('EXPORT PDF:', brief)}
                    style={{
                      flex: 1,
                      background: 'var(--bp-ink-100)',
                      border: '1px solid var(--bp-ink-300)',
                      color: 'var(--bp-ink-600)',
                      padding: '6px 0',
                      fontFamily: 'var(--bp-font-mono)',
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      cursor: 'pointer',
                      borderRadius: 2,
                    }}
                  >
                    EXPORT PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* STICKY BOTTOM ACTION BAR */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 50,
        background: 'var(--bp-ink-900)',
        borderTop: '2px solid var(--bp-ink-700)',
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Left: file count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 160 }}>
          <span style={{
            background: 'var(--bp-ink-700)',
            color: 'var(--bp-ink-200)',
            fontSize: 11,
            fontFamily: 'var(--bp-font-mono)',
            fontWeight: 700,
            padding: '4px 12px',
            borderRadius: 2,
            letterSpacing: '0.08em',
          }}>
            {files.length} FILE{files.length !== 1 ? 'S' : ''} UPLOADED
          </span>
        </div>

        {/* Center: Generate Blueprint CTA */}
        <button
          onClick={() => router.push('/dream/design')}
          style={{
            background: 'linear-gradient(135deg, #FFA726, #E65100)',
            color: '#fff',
            border: 'none',
            padding: '10px 32px',
            fontFamily: 'var(--bp-font-mono)',
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.1em',
            cursor: 'pointer',
            borderRadius: 2,
            textTransform: 'uppercase',
          }}
        >
          GENERATE BLUEPRINT →
        </button>

        {/* Right: Export / Clear */}
        <div style={{ display: 'flex', gap: 8, minWidth: 160, justifyContent: 'flex-end' }}>
          <button
            onClick={() => console.log('EXPORT ALL', files)}
            style={{
              background: 'transparent',
              border: '1px solid var(--bp-ink-600)',
              color: 'var(--bp-ink-300)',
              padding: '6px 14px',
              fontFamily: 'var(--bp-font-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              borderRadius: 2,
            }}
          >
            EXPORT ALL
          </button>
          <button
            onClick={() => { setFiles([]); }}
            style={{
              background: 'transparent',
              border: '1px solid var(--bp-ink-600)',
              color: 'var(--bp-ink-300)',
              padding: '6px 14px',
              fontFamily: 'var(--bp-font-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              borderRadius: 2,
            }}
          >
            CLEAR
          </button>
        </div>
      </div>
    </div>
  );
}

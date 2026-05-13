'use client';

// MediaCaptureFAB — Brief 2 (refactor of PhotoCaptureFAB)
//
// Tap-to-capture photo OR video using <input type="file"> with the
// `capture` attribute. Same brass / robin success / red error states as
// the original photo FAB. Behaviour branches on the detected MIME type:
//
// - photo path: read base64, parse JPEG EXIF GPS inline (fallback to
//   browser geolocation), POST to /api/v1/crm/photo (unchanged).
// - video path: enforce <= 60s duration via the <video>.loadedmetadata
//   event AND <= 100 MB file size; reject with a friendly toast if
//   either limit is breached. Then POST to /api/v1/crm/photo (the route
//   accepts video MIME types as of Brief 2 and skips Claude Vision).
//
// `mediaKind` lets callers narrow the picker:
//   - 'photo' → accept="image/*"
//   - 'video' → accept="video/*"
//   - 'both'  → accept="image/*,video/*" (default)
//
// All button copy / label hints adapt to the chosen kind.

import { useCallback, useRef, useState } from 'react';
import {
  recordContact,
  type ContactWriteOkResult,
  type CapturePhotoExif,
} from '@/lib/crm-spine';

type FabState = 'idle' | 'reading' | 'uploading' | 'success' | 'error';
type MediaKind = 'photo' | 'video' | 'both';

interface MediaCaptureFABProps {
  projectId: string;
  onSuccess: (result: ContactWriteOkResult) => void;
  onError: (reason: string, detail?: string) => void;
  mediaKind?: MediaKind;
}

// ─── Palette (W7.Q.4 + design constitution) ────────────────────────────────
const BRASS = '#B6873A';
const ROBIN = '#81D8D0';
const INK = '#1A1A1A';
const PAPER = '#FFFDF7';
const RED = '#E8443A';

// ─── Limits ────────────────────────────────────────────────────────────────
const MAX_VIDEO_DURATION_S = 60;
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

// ─── EXIF GPS extraction (JPEG only, no external lib) ──────────────────────

function readUint16(view: DataView, offset: number, little: boolean): number {
  return view.getUint16(offset, little);
}
function readUint32(view: DataView, offset: number, little: boolean): number {
  return view.getUint32(offset, little);
}

interface ParsedGps {
  lat: number;
  lon: number;
  timestamp?: string;
}

function parseRational(view: DataView, offset: number, little: boolean): number {
  const num = readUint32(view, offset, little);
  const den = readUint32(view, offset + 4, little);
  return den === 0 ? 0 : num / den;
}

function dmsToDecimal(d: number, m: number, s: number, ref: string): number {
  let dec = d + m / 60 + s / 3600;
  if (ref === 'S' || ref === 'W') dec = -dec;
  return dec;
}

function extractExifGps(buffer: ArrayBuffer): ParsedGps | null {
  try {
    const view = new DataView(buffer);
    if (view.getUint16(0) !== 0xffd8) return null;

    let offset = 2;
    while (offset < view.byteLength) {
      const marker = view.getUint16(offset);
      if (marker === 0xffe1) {
        const segLength = view.getUint16(offset + 2);
        const exifStart = offset + 4;
        if (
          view.getUint32(exifStart) === 0x45786966 &&
          view.getUint16(exifStart + 4) === 0x0000
        ) {
          const tiffStart = exifStart + 6;
          const byteOrder = view.getUint16(tiffStart);
          const little = byteOrder === 0x4949;
          if (byteOrder !== 0x4949 && byteOrder !== 0x4d4d) return null;
          if (readUint16(view, tiffStart + 2, little) !== 0x002a) return null;
          const ifd0Offset = readUint32(view, tiffStart + 4, little);
          const ifd0 = tiffStart + ifd0Offset;
          const numEntries = readUint16(view, ifd0, little);
          let gpsIfdOffset = 0;
          for (let i = 0; i < numEntries; i++) {
            const entry = ifd0 + 2 + i * 12;
            const tag = readUint16(view, entry, little);
            if (tag === 0x8825) {
              gpsIfdOffset = readUint32(view, entry + 8, little);
              break;
            }
          }
          if (!gpsIfdOffset) return null;
          const gpsIfd = tiffStart + gpsIfdOffset;
          const gpsEntries = readUint16(view, gpsIfd, little);
          let latRef = 'N';
          let lonRef = 'E';
          let latVals: number[] = [];
          let lonVals: number[] = [];
          for (let i = 0; i < gpsEntries; i++) {
            const entry = gpsIfd + 2 + i * 12;
            const tag = readUint16(view, entry, little);
            const valueOffset = readUint32(view, entry + 8, little);
            const valueLoc = tiffStart + valueOffset;
            if (tag === 0x0001) {
              latRef = String.fromCharCode(view.getUint8(entry + 8));
            } else if (tag === 0x0002) {
              latVals = [
                parseRational(view, valueLoc, little),
                parseRational(view, valueLoc + 8, little),
                parseRational(view, valueLoc + 16, little),
              ];
            } else if (tag === 0x0003) {
              lonRef = String.fromCharCode(view.getUint8(entry + 8));
            } else if (tag === 0x0004) {
              lonVals = [
                parseRational(view, valueLoc, little),
                parseRational(view, valueLoc + 8, little),
                parseRational(view, valueLoc + 16, little),
              ];
            }
          }
          if (latVals.length === 3 && lonVals.length === 3) {
            return {
              lat: dmsToDecimal(latVals[0], latVals[1], latVals[2], latRef),
              lon: dmsToDecimal(lonVals[0], lonVals[1], lonVals[2], lonRef),
            };
          }
        }
        offset += 2 + segLength;
      } else if ((marker & 0xff00) === 0xff00) {
        const segLength = view.getUint16(offset + 2);
        offset += 2 + segLength;
      } else {
        break;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function getBrowserGeolocation(): Promise<[number, number] | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
      () => resolve(null),
      { timeout: 5000, maximumAge: 60_000 }
    );
  });
}

// ─── File reading helpers ──────────────────────────────────────────────────

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Probe a video file's duration (seconds) by loading metadata into a
 * detached <video> element. Returns null if the metadata never resolves
 * (corrupt file, unsupported codec).
 */
function probeVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      // Best-effort; some browsers (Safari) want load() to release
      try {
        video.load();
      } catch {
        // ignore
      }
    };
    video.onloadedmetadata = () => {
      const d = Number.isFinite(video.duration) ? video.duration : null;
      cleanup();
      resolve(d);
    };
    video.onerror = () => {
      cleanup();
      resolve(null);
    };
    // Timeout safety — never block the FAB forever
    window.setTimeout(() => {
      cleanup();
      resolve(null);
    }, 8000);
    video.src = url;
  });
}

// ─── MIME helpers ──────────────────────────────────────────────────────────

function isVideoMime(mime: string): boolean {
  return mime.startsWith('video/');
}

function isImageMime(mime: string): boolean {
  return mime.startsWith('image/');
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function MediaCaptureFAB({
  projectId,
  onSuccess,
  onError,
  mediaKind = 'both',
}: MediaCaptureFABProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fabState, setFabState] = useState<FabState>('idle');

  const handleFile = useCallback(
    async (file: File) => {
      setFabState('reading');
      try {
        const mime = file.type || 'application/octet-stream';
        const isVideo = isVideoMime(mime);
        const isImage = isImageMime(mime);

        if (!isVideo && !isImage) {
          setFabState('error');
          onError('unsupported-media', `Got ${mime} — pick a photo or video.`);
          window.setTimeout(() => setFabState('idle'), 2500);
          return;
        }

        // ── Video gating ──────────────────────────────────────────────
        let mediaDurationSeconds: number | undefined;
        if (isVideo) {
          if (file.size > MAX_VIDEO_SIZE_BYTES) {
            setFabState('error');
            onError(
              'video-too-large',
              'Videos need to be under 100 MB — try a shorter clip.'
            );
            window.setTimeout(() => setFabState('idle'), 2500);
            return;
          }
          const duration = await probeVideoDuration(file);
          if (duration === null) {
            setFabState('error');
            onError(
              'video-read-failed',
              "Couldn't read that video. Try recording again.",
            );
            window.setTimeout(() => setFabState('idle'), 2500);
            return;
          }
          if (duration > MAX_VIDEO_DURATION_S) {
            setFabState('error');
            onError(
              'video-too-long',
              'Videos need to be 60 seconds or less — try again with a shorter clip.'
            );
            window.setTimeout(() => setFabState('idle'), 2500);
            return;
          }
          mediaDurationSeconds = duration;
        }

        // ── Read file ────────────────────────────────────────────────
        const dataUrl = await readFileAsDataUrl(file);
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

        // ── EXIF GPS (photos only) + geolocation fallback ───────────
        let gps: [number, number] | null = null;
        if (isImage) {
          if (mime === 'image/jpeg' || mime === 'image/jpg') {
            try {
              const buffer = await readFileAsArrayBuffer(file);
              const exifGps = extractExifGps(buffer);
              if (exifGps) gps = [exifGps.lat, exifGps.lon];
            } catch {
              // fall through to geolocation
            }
          }
        }
        if (!gps) {
          gps = await getBrowserGeolocation();
        }

        const exif: CapturePhotoExif | undefined = gps
          ? { gps, timestamp: new Date().toISOString() }
          : undefined;

        setFabState('uploading');
        const result = await recordContact({
          source: 'photo',
          photoBase64: base64,
          photoMimeType: mime,
          photoExif: exif,
          mediaDurationSeconds,
          projectId,
        });

        if (result.ok) {
          setFabState('success');
          onSuccess(result);
          window.setTimeout(() => setFabState('idle'), 1500);
        } else {
          setFabState('error');
          onError(result.reason, result.detail);
          window.setTimeout(() => setFabState('idle'), 2500);
        }
      } catch (err) {
        setFabState('error');
        onError(
          'media-read-failed',
          err instanceof Error ? err.message : 'unknown'
        );
        window.setTimeout(() => setFabState('idle'), 2500);
      }
    },
    [projectId, onSuccess, onError]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      void handleFile(file);
      // Reset so the same file can be picked again later.
      e.target.value = '';
    },
    [handleFile]
  );

  const accept =
    mediaKind === 'photo'
      ? 'image/*'
      : mediaKind === 'video'
        ? 'video/*'
        : 'image/*,video/*';

  const icon =
    fabState === 'success'
      ? 'OK'
      : mediaKind === 'photo'
        ? '📸'
        : mediaKind === 'video'
          ? '🎥'
          : '📷';

  const idleLabel =
    mediaKind === 'photo'
      ? 'Tap to photo'
      : mediaKind === 'video'
        ? 'Tap to record (≤60s)'
        : 'Tap to photo or video';

  const bg =
    fabState === 'success'
      ? ROBIN
      : fabState === 'error'
        ? RED
        : fabState === 'reading' || fabState === 'uploading'
          ? '#6B6655'
          : BRASS;

  const label =
    fabState === 'reading'
      ? 'Reading media…'
      : fabState === 'uploading'
        ? 'Saving…'
        : fabState === 'success'
          ? 'Saved'
          : fabState === 'error'
            ? 'Try again'
            : idleLabel;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 4,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        capture="environment"
        onChange={handleChange}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      <button
        type="button"
        aria-label={label}
        onClick={() => inputRef.current?.click()}
        disabled={fabState === 'reading' || fabState === 'uploading'}
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: bg,
          color: PAPER,
          border: 'none',
          cursor: 'pointer',
          fontSize: 28,
          boxShadow: '0 6px 22px rgba(0,0,0,0.25)',
          transition: 'background 200ms ease',
        }}
      >
        {icon}
      </button>
      <span
        style={{
          fontSize: 11,
          color: INK,
          background: PAPER,
          padding: '2px 8px',
          borderRadius: 999,
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </div>
  );
}

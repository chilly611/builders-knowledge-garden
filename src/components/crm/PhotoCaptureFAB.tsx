'use client';

// PhotoCaptureFAB — Brief 1
// Tap-to-photo using <input type="file" accept="image/*" capture="environment">.
// Reads the file as base64, attempts to parse EXIF GPS tags inline (no library
// dependency — `exifr` is not in package.json). Falls back to the browser
// geolocation API if EXIF GPS is absent and the user grants permission.
// Posts via recordContact({ source: 'photo', ... }).

import { useCallback, useRef, useState } from 'react';
import { recordContact, type ContactWriteOkResult, type CapturePhotoExif } from '@/lib/crm-spine';

type FabState = 'idle' | 'reading' | 'uploading' | 'success' | 'error';

interface PhotoCaptureFABProps {
  projectId: string;
  onSuccess: (result: ContactWriteOkResult) => void;
  onError: (reason: string, detail?: string) => void;
}

const BRASS = '#B6873A';
const ROBIN = '#81D8D0';
const INK = '#1A1A1A';
const PAPER = '#FFFDF7';
const RED = '#E8443A';

// ─── EXIF GPS extraction (minimal, JPEG only) ──────────────────────────────
// Parses the GPS IFD from a JPEG's APP1 segment. No external library.

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
    // JPEG SOI
    if (view.getUint16(0) !== 0xffd8) return null;

    let offset = 2;
    while (offset < view.byteLength) {
      const marker = view.getUint16(offset);
      if (marker === 0xffe1) {
        // APP1 (Exif)
        const segLength = view.getUint16(offset + 2);
        const exifStart = offset + 4;
        // 'Exif\0\0'
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
              // GPSLatitudeRef
              latRef = String.fromCharCode(view.getUint8(entry + 8));
            } else if (tag === 0x0002) {
              // GPSLatitude (rational[3])
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

// ─── Component ─────────────────────────────────────────────────────────────

export default function PhotoCaptureFAB({
  projectId,
  onSuccess,
  onError,
}: PhotoCaptureFABProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fabState, setFabState] = useState<FabState>('idle');

  const handleFile = useCallback(
    async (file: File) => {
      setFabState('reading');
      try {
        const [dataUrl, buffer] = await Promise.all([
          readFileAsDataUrl(file),
          readFileAsArrayBuffer(file),
        ]);
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

        let gps: [number, number] | null = null;
        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
          const exifGps = extractExifGps(buffer);
          if (exifGps) gps = [exifGps.lat, exifGps.lon];
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
          photoMimeType: file.type || 'image/jpeg',
          photoExif: exif,
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
        onError('photo-read-failed', err instanceof Error ? err.message : 'unknown');
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
      ? 'Reading photo…'
      : fabState === 'uploading'
        ? 'Saving…'
        : fabState === 'success'
          ? 'Saved'
          : fabState === 'error'
            ? 'Try again'
            : 'Tap to photo';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
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
        {fabState === 'success' ? 'OK' : 'CAM'}
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

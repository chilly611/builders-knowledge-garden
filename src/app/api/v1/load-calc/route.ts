/**
 * GET /api/v1/load-calc
 * ======================
 *
 * Deterministic NEC 220 service-load calculator. No LLM. No DB.
 * Pure math from src/lib/mep-load-calc.ts.
 *
 * Query params:
 *   buildingType   (required) — keyof VA_PER_SQFT or custom string
 *   sqft           (required) — number, total sqft of conditioned space
 *   smallAppliance (optional) — count of 1500-VA SA branch circuits
 *   laundry        (optional) — count of 1500-VA laundry branch circuits
 *   hvacKW         (optional) — kW of largest HVAC / motor
 *   waterHeaterKW  (optional) — kW
 *   rangeKW        (optional) — kW
 *   evChargerKW    (optional) — kW
 *   method         (optional) — '220.83' | 'standard'
 *
 * Returns LoadCalcResult JSON.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  calculateElectricalLoad,
  calculateHvacTons,
  calculatePlumbingFixtures,
  type LoadCalcInput,
} from '@/lib/mep-load-calc';

function num(searchParams: URLSearchParams, key: string): number | undefined {
  const raw = searchParams.get(key);
  if (raw === null || raw === '') return undefined;
  const v = Number(raw);
  if (Number.isNaN(v)) return undefined;
  return v;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const buildingType = sp.get('buildingType') ?? '';
  const sqft = num(sp, 'sqft');

  if (!buildingType || sqft === undefined || sqft <= 0) {
    return NextResponse.json(
      {
        error: 'buildingType and sqft (>0) are required',
        usage:
          '/api/v1/load-calc?buildingType=office&sqft=4200&hvacKW=12&waterHeaterKW=4.5',
      },
      { status: 400 }
    );
  }

  const methodParam = sp.get('method');
  const method: '220.83' | 'standard' | undefined =
    methodParam === '220.83' || methodParam === 'standard' ? methodParam : undefined;

  const input: LoadCalcInput = {
    buildingType,
    sqft,
    smallAppliance: num(sp, 'smallAppliance'),
    laundry: num(sp, 'laundry'),
    hvacKW: num(sp, 'hvacKW'),
    waterHeaterKW: num(sp, 'waterHeaterKW'),
    rangeKW: num(sp, 'rangeKW'),
    evChargerKW: num(sp, 'evChargerKW'),
    method,
  };

  const electrical = calculateElectricalLoad(input);

  // Bonus: surface HVAC tonnage + plumbing fixtures in the same response
  // so the panel-schedule page can also show MEP cross-domain context
  // without a second round-trip.
  const hvac = calculateHvacTons(buildingType, sqft);
  const plumbing = calculatePlumbingFixtures(buildingType, sqft);

  return NextResponse.json({
    input,
    electrical,
    hvac,
    plumbing,
    citations: [
      'NEC 220.12 — general lighting load',
      'NEC 220.50 / 430.24 — motor 25% addition',
      'NEC 220.52 — small-appliance / laundry branch loads',
      'NEC 220.55 — range demand factors',
      'NEC 220.83 — existing dwelling optional method',
      'NEC 240.4(D) — small-conductor overcurrent limits',
      'NEC 310.16 — conductor ampacity (THHN/THWN @ 75°C)',
      'NEC 625.42 — EV charger continuous load',
      'ASHRAE 90.1 — energy standard for commercial buildings',
      'UPC 422.1 — minimum plumbing fixture count',
    ],
  });
}

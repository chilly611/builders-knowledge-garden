/**
 * Verify a signing packet (STAGE 5).
 * ===================================
 *
 * GET  /api/v1/signatures/:id/verify
 *   Build the packet from STORED data, re-hash the document, and walk the
 *   chain. Returns { valid, summary, events_verified, checks, failures }.
 *   AUTH: same access gate as the packet export.
 *
 * POST /api/v1/signatures/:id/verify
 *   Body: { packet }. Verify a packet the caller already holds (e.g. a
 *   previously-exported file), entirely offline. The path id must match
 *   packet.signed_document_id. Any authenticated user may verify a packet they
 *   possess — verification reads nothing new from the database.
 *
 * `valid` is true only when the document bytes hash to the stored document_hash
 * AND every event recomputes AND the prev-links and sequence numbers are
 * unbroken. A single altered byte or a single reordered event flips it false.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getServiceClient, unauthorizedResponse } from '@/lib/auth-server';
import {
  verifyStoredDocument,
  verifySigningPacket,
  SigningChainError,
  type SigningPacket,
} from '@/lib/signing-chain';
import { callerCanAccessDocument } from '@/lib/signing-access';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const sb = getServiceClient();

    let outcome;
    try {
      outcome = await verifyStoredDocument(id, { client: sb });
    } catch (e) {
      if (e instanceof SigningChainError && e.code === 'signed_document_not_found') {
        return NextResponse.json({ error: 'Signed document not found' }, { status: 404 });
      }
      throw e;
    }

    const allowed = await callerCanAccessDocument(
      sb,
      user,
      outcome.packet.document,
      outcome.packet.events,
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'You do not have access to this signing packet' },
        { status: 403 },
      );
    }

    return NextResponse.json(outcome.result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const packet = (body && (body.packet ?? body)) as SigningPacket | null;

    if (!packet || typeof packet !== 'object' || !Array.isArray(packet.events)) {
      return NextResponse.json(
        { error: 'Request body must contain a signing packet ({ packet: {...} })' },
        { status: 400 },
      );
    }
    if (packet.signed_document_id !== id) {
      return NextResponse.json(
        {
          error: `Packet is for document ${packet.signed_document_id}, not ${id}`,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(verifySigningPacket(packet));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

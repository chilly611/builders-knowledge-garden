'use client';

/**
 * Client helper for the receipt-OCR endpoint.
 * Mirrors the shape of POST /api/v1/projects/[id]/attachments/[attachmentId]/extract-receipt.
 */

import { supabase } from '@/lib/supabase';

export interface ReceiptExtraction {
  vendor: string | null;
  total: number | null;
  currency: string;
  lineItems?: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount: number;
  }>;
  confidence: number;
  notes?: string | null;
}

export interface ExtractReceiptResponse {
  extraction: ReceiptExtraction;
  attachmentId: string;
  modelUsed?: string;
  extractionAt?: string;
  error?: string;
}

export async function extractReceipt(
  projectId: string,
  attachmentId: string
): Promise<ExtractReceiptResponse | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      console.warn('extractReceipt: not authenticated, skipping');
      return null;
    }
    const res = await fetch(
      `/api/v1/projects/${encodeURIComponent(projectId)}/attachments/${encodeURIComponent(attachmentId)}/extract-receipt`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error('extractReceipt failed:', body);
      return null;
    }
    return (await res.json()) as ExtractReceiptResponse;
  } catch (e) {
    console.error('extractReceipt error:', e);
    return null;
  }
}

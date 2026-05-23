/**
 * Tests for src/lib/documenso.ts (2026-05-24).
 * =============================================
 *
 * Mock-fetch verification of the v1 wire contract. The shapes verified
 * here come from a live POST against app.documenso.com on 2026-05-24
 * (see DOCUMENSO-WIRE handoff). If Documenso changes their API surface,
 * these tests are the first thing that should fail.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createDocumensoDocument,
  uploadDocumensoPdf,
  sendDocumensoForSignature,
  getDocumensoStatus,
  cancelDocumensoDocument,
  createSignatureRequest,
  isDocumensoConfigured,
  DocumensoError,
} from '../documenso';

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_KEY = process.env.DOCUMENSO_API_KEY;
const ORIGINAL_BASE = process.env.DOCUMENSO_API_BASE_URL;

beforeEach(() => {
  process.env.DOCUMENSO_API_KEY = 'api_test_key';
  process.env.DOCUMENSO_API_BASE_URL = 'https://app.documenso.test/api/v1';
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  if (ORIGINAL_KEY === undefined) delete process.env.DOCUMENSO_API_KEY;
  else process.env.DOCUMENSO_API_KEY = ORIGINAL_KEY;
  if (ORIGINAL_BASE === undefined) delete process.env.DOCUMENSO_API_BASE_URL;
  else process.env.DOCUMENSO_API_BASE_URL = ORIGINAL_BASE;
  vi.restoreAllMocks();
});

function mockResponse(body: unknown, init: { status?: number } = {}) {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('isDocumensoConfigured', () => {
  it('returns true when API key is set', () => {
    expect(isDocumensoConfigured()).toBe(true);
  });
  it('returns false when API key is unset', () => {
    delete process.env.DOCUMENSO_API_KEY;
    expect(isDocumensoConfigured()).toBe(false);
  });
});

describe('createDocumensoDocument', () => {
  it('POSTs to /documents with raw API key auth (no Bearer prefix)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse({
        documentId: 1349683,
        uploadUrl: 'https://s3.eu-central-1.amazonaws.com/abc',
        recipients: [
          {
            recipientId: 2281111,
            name: 'Owner',
            email: 'owner@example.com',
            token: 'tok',
            signingUrl: 'https://app.documenso.test/sign/tok',
            signingOrder: null,
            role: 'SIGNER',
          },
        ],
      })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const res = await createDocumensoDocument({
      title: 'Contract',
      recipients: [{ name: 'Owner', email: 'owner@example.com', role: 'SIGNER' }],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://app.documenso.test/api/v1/documents');
    expect(init.method).toBe('POST');
    // Documenso quirk: Authorization header is the raw key, NOT "Bearer …".
    expect(init.headers.Authorization).toBe('api_test_key');
    expect(init.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(init.body as string);
    expect(body.title).toBe('Contract');
    expect(body.recipients).toEqual([
      { name: 'Owner', email: 'owner@example.com', role: 'SIGNER' },
    ]);
    expect(res.documentId).toBe(1349683);
    expect(res.recipients[0].signingUrl).toContain('/sign/tok');
  });

  it('throws DocumensoError on 401', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(mockResponse({ error: 'bad key' }, { status: 401 })) as unknown as typeof fetch;
    await expect(
      createDocumensoDocument({
        title: 'X',
        recipients: [{ name: 'A', email: 'a@b.c' }],
      })
    ).rejects.toBeInstanceOf(DocumensoError);
  });

  it('throws DocumensoError when response shape is wrong', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(mockResponse({ nope: true })) as unknown as typeof fetch;
    await expect(
      createDocumensoDocument({
        title: 'X',
        recipients: [{ name: 'A', email: 'a@b.c' }],
      })
    ).rejects.toBeInstanceOf(DocumensoError);
  });

  it('rejects empty title/recipients before hitting the network', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await expect(
      createDocumensoDocument({ title: '', recipients: [{ name: 'A', email: 'a@b.c' }] })
    ).rejects.toBeInstanceOf(DocumensoError);
    await expect(
      createDocumensoDocument({ title: 'X', recipients: [] })
    ).rejects.toBeInstanceOf(DocumensoError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('uploadDocumensoPdf', () => {
  it('PUTs the bytes to the pre-signed URL with application/pdf', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const pdf = Buffer.from('%PDF-1.4 fake');
    await uploadDocumensoPdf('https://s3.eu-central-1.amazonaws.com/abc', pdf);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://s3.eu-central-1.amazonaws.com/abc');
    expect(init.method).toBe('PUT');
    expect(init.headers['Content-Type']).toBe('application/pdf');
    // Auth header MUST NOT be sent to S3 — the signature is in the URL.
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.body).toBe(pdf);
  });

  it('throws DocumensoError on S3 failure', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response('access denied', { status: 403 })) as unknown as typeof fetch;
    await expect(
      uploadDocumensoPdf('https://s3.example.com/bucket', Buffer.from('x'))
    ).rejects.toBeInstanceOf(DocumensoError);
  });
});

describe('sendDocumensoForSignature', () => {
  it('POSTs to /documents/:id/send with sendEmail=true', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ ok: true }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await sendDocumensoForSignature(1349683);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://app.documenso.test/api/v1/documents/1349683/send');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ sendEmail: true });
  });
});

describe('getDocumensoStatus', () => {
  it('normalizes the recipients array shape', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        documentId: 1349683,
        status: 'PENDING',
        recipients: [
          {
            recipientId: 2281111,
            name: 'Owner',
            email: 'owner@example.com',
            signingStatus: 'SIGNED',
            signedAt: '2026-05-24T10:00:00Z',
          },
        ],
      })
    ) as unknown as typeof fetch;
    const s = await getDocumensoStatus(1349683);
    expect(s.documentId).toBe(1349683);
    expect(s.status).toBe('PENDING');
    expect(s.recipients[0].signingStatus).toBe('SIGNED');
    expect(s.recipients[0].signedAt).toBe('2026-05-24T10:00:00Z');
  });
});

describe('cancelDocumensoDocument', () => {
  it('DELETEs /documents/:id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await cancelDocumensoDocument(1349683);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://app.documenso.test/api/v1/documents/1349683');
    expect(init.method).toBe('DELETE');
  });

  it('tolerates 404 (already gone)', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 404 })) as unknown as typeof fetch;
    await expect(cancelDocumensoDocument(999)).resolves.toBeUndefined();
  });
});

describe('createSignatureRequest (end-to-end)', () => {
  it('chains create → upload → field → send', async () => {
    const fetchMock = vi
      .fn()
      // 1: create
      .mockResolvedValueOnce(
        mockResponse({
          documentId: 42,
          uploadUrl: 'https://s3.example.com/u',
          recipients: [
            {
              recipientId: 1,
              name: 'A',
              email: 'a@b.c',
              token: 't',
              signingUrl: 'https://app.documenso.test/sign/t',
              signingOrder: null,
              role: 'SIGNER',
            },
          ],
        })
      )
      // 2: upload
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      // 3: place field
      .mockResolvedValueOnce(mockResponse({ fields: [{ id: 1 }] }))
      // 4: send
      .mockResolvedValueOnce(mockResponse({ ok: true }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const res = await createSignatureRequest({
      title: 'Test',
      pdfBytes: Buffer.from('x'),
      recipients: [{ name: 'A', email: 'a@b.c' }],
    });

    expect(res.documentId).toBe(42);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[0][0]).toContain('/documents');
    expect(fetchMock.mock.calls[1][0]).toBe('https://s3.example.com/u');
    expect(fetchMock.mock.calls[2][0]).toContain('/documents/42/fields');
    expect(fetchMock.mock.calls[3][0]).toContain('/documents/42/send');
    // Field body has the signature placement defaults.
    const fieldBody = JSON.parse(fetchMock.mock.calls[2][1].body as string);
    expect(fieldBody.recipientId).toBe(1);
    expect(fieldBody.type).toBe('SIGNATURE');
  });
});

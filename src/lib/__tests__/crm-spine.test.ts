// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Stub journey-progress before importing the spine so emitJourneyEvent is observable.
const emitJourneyEventMock = vi.fn();
vi.mock('@/lib/journey-progress', () => ({
  emitJourneyEvent: emitJourneyEventMock,
  resolveProjectId: () => 'default',
}));

import { recordContact, dispatchCrmChanged } from '../crm-spine';

const ACTIVE_PROJECT_KEY = 'bkg-active-project';

describe('crm-spine recordContact', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let dispatchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.localStorage.clear();
    emitJourneyEventMock.mockClear();
    fetchMock = vi.fn();
    // @ts-expect-error — override the global for the test
    global.fetch = fetchMock;
    dispatchSpy = vi.spyOn(window, 'dispatchEvent');
  });

  afterEach(() => {
    dispatchSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('returns validation failure on empty input', async () => {
    // @ts-expect-error — intentionally invalid
    const result = await recordContact({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('validation');
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns no-active-project when no project in localStorage and none in input', async () => {
    const result = await recordContact({
      source: 'voice',
      transcript: 'Hi there, this is a real transcript.',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('no-active-project');
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POSTs the correct shape to /api/v1/crm/capture for voice', async () => {
    window.localStorage.setItem(ACTIVE_PROJECT_KEY, 'proj-1');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        contactId: 'c-1',
        timeMachineHandle: 'tm-1',
        jsonld: { name: 'X' },
        _run_id: 'r-1',
      }),
    });

    const result = await recordContact({
      source: 'voice',
      transcript: 'New lead Maria Rodriguez 4421 Brickell roof leak',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/crm/capture');
    expect((init as RequestInit).method).toBe('POST');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.source).toBe('voice');
    expect(body.transcript).toContain('Maria');
    expect(body.projectId).toBe('proj-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.contactId).toBe('c-1');
      expect(result.timeMachineHandle).toBe('tm-1');
    }
  });

  it('returns network failure on 500 response', async () => {
    window.localStorage.setItem(ACTIVE_PROJECT_KEY, 'proj-1');
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'boom' }),
    });
    const result = await recordContact({
      source: 'voice',
      transcript: 'Test transcript',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('network');
    }
  });

  it('dispatches bkg:crm:changed on success', async () => {
    window.localStorage.setItem(ACTIVE_PROJECT_KEY, 'proj-1');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        contactId: 'c-2',
        timeMachineHandle: 'tm-2',
      }),
    });

    await recordContact({
      source: 'voice',
      transcript: 'Some transcript',
    });

    const calls = dispatchSpy.mock.calls
      .map((c) => c[0])
      .filter((e): e is CustomEvent => e instanceof CustomEvent);
    const changed = calls.find((e) => e.type === 'bkg:crm:changed');
    expect(changed).toBeDefined();
    expect((changed as CustomEvent).detail).toMatchObject({
      contactId: 'c-2',
      source: 'voice',
      timeMachineHandle: 'tm-2',
    });
  });

  it('emits journey step_completed with workflowId=who-is-asking on success', async () => {
    window.localStorage.setItem(ACTIVE_PROJECT_KEY, 'proj-1');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        contactId: 'c-3',
        timeMachineHandle: 'tm-3',
      }),
    });

    await recordContact({
      source: 'voice',
      transcript: 'Hello world',
    });

    expect(emitJourneyEventMock).toHaveBeenCalledTimes(1);
    const event = emitJourneyEventMock.mock.calls[0][0];
    expect(event.type).toBe('step_completed');
    expect(event.workflowId).toBe('who-is-asking');
    expect(event.stepId).toBe('voice');
  });

  it('photo source POSTs to /api/v1/crm/photo with photoBase64', async () => {
    window.localStorage.setItem(ACTIVE_PROJECT_KEY, 'proj-1');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        contactId: 'c-4',
        timeMachineHandle: 'tm-4',
      }),
    });

    await recordContact({
      source: 'photo',
      photoBase64: 'AAAAfakeBase64Data='.repeat(8),
      photoMimeType: 'image/jpeg',
      photoExif: { gps: [25.7521, -80.2074] },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/crm/photo');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.photoBase64).toContain('fakeBase64');
    expect(body.photoExif.gps).toEqual([25.7521, -80.2074]);
  });
});

describe('dispatchCrmChanged', () => {
  it('fires a CustomEvent with the right detail', () => {
    const spy = vi.spyOn(window, 'dispatchEvent');
    dispatchCrmChanged({ contactId: 'c-9', source: 'manual' });
    const evt = spy.mock.calls.find(
      (c) => c[0] instanceof CustomEvent && (c[0] as CustomEvent).type === 'bkg:crm:changed'
    )?.[0] as CustomEvent | undefined;
    expect(evt).toBeDefined();
    expect(evt?.detail).toMatchObject({ contactId: 'c-9', source: 'manual' });
    spy.mockRestore();
  });
});

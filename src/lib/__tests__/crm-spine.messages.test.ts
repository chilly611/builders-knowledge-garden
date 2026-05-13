// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Stub journey-progress before importing the spine.
const emitJourneyEventMock = vi.fn();
vi.mock('@/lib/journey-progress', () => ({
  emitJourneyEvent: emitJourneyEventMock,
  resolveProjectId: () => 'default',
}));

import {
  listInboxMessages,
  draftReply,
  sendReply,
  undoSendReply,
} from '../crm-spine';

describe('crm-spine messages', () => {
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

  // ─── listInboxMessages ────────────────────────────────────────────────

  describe('listInboxMessages', () => {
    it('returns the messages array on a 200 response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          messages: [
            {
              id: 'm-1',
              contactId: 'c-1',
              direction: 'inbound',
              channel: 'sms',
              body: 'hello',
              aiDrafted: false,
              status: 'received',
              timeMachineHandle: 't-1',
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      });
      const result = await listInboxMessages();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('m-1');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/v1/crm/messages?inbox=1');
    });

    it('returns empty array on fetch error (does not throw)', async () => {
      fetchMock.mockRejectedValueOnce(new Error('boom'));
      const result = await listInboxMessages();
      expect(result).toEqual([]);
    });

    it('returns empty array on non-ok response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'boom' }),
      });
      const result = await listInboxMessages();
      expect(result).toEqual([]);
    });

    it('returns empty array on missing messages field', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });
      const result = await listInboxMessages();
      expect(result).toEqual([]);
    });
  });

  // ─── draftReply ────────────────────────────────────────────────────────

  describe('draftReply', () => {
    it('returns ok with body + reasoning on 200', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          draftMessageId: 'd-1',
          body: 'Yeah, Wednesday works. — Carlos',
          reasoning: 'matched the warm signoff',
          toneUsed: 'warm',
          voiceMatchScore: 0.85,
          containsCommitment: true,
          containsPrice: false,
          suggestedSendDelayMs: 0,
          intentTags: ['scheduling'],
          timeMachineHandle: 't-7',
        }),
      });
      const result = await draftReply({
        contactId: 'c-1',
        inboundMessageId: 'm-1',
        tone: 'warm',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.body).toContain('Wednesday');
        expect(result.voiceMatchScore).toBe(0.85);
        expect(result.containsCommitment).toBe(true);
      }
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/v1/crm/messages/draft');
      expect((init as RequestInit).method).toBe('POST');
    });

    it('returns failure on validation when inputs are missing', async () => {
      // @ts-expect-error — intentional invalid
      const result = await draftReply({});
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('validation');
      }
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns network failure on 500', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'boom' }),
      });
      const result = await draftReply({
        contactId: 'c-1',
        inboundMessageId: 'm-1',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('network');
      }
    });

    it('emits journey step_completed for quick-reply on success', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          draftMessageId: 'd-2',
          body: 'ok',
          reasoning: '',
          toneUsed: 'warm',
          voiceMatchScore: 0.6,
          containsCommitment: false,
          containsPrice: false,
          suggestedSendDelayMs: 0,
          intentTags: [],
          timeMachineHandle: 't-2',
        }),
      });
      await draftReply({ contactId: 'c-1', inboundMessageId: 'm-1' });
      expect(emitJourneyEventMock).toHaveBeenCalledTimes(1);
      const event = emitJourneyEventMock.mock.calls[0][0];
      expect(event.workflowId).toBe('quick-reply');
      expect(event.type).toBe('step_completed');
    });

    it('dispatches bkg:crm:message:drafted on success', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          draftMessageId: 'd-3',
          body: 'ok',
          reasoning: '',
          toneUsed: 'brief',
          voiceMatchScore: 0.5,
          containsCommitment: false,
          containsPrice: false,
          suggestedSendDelayMs: 0,
          intentTags: [],
          timeMachineHandle: 't-3',
        }),
      });
      await draftReply({ contactId: 'c-1', inboundMessageId: 'm-1' });
      const calls = dispatchSpy.mock.calls
        .map((c) => c[0])
        .filter((e): e is CustomEvent => e instanceof CustomEvent);
      const evt = calls.find((e) => e.type === 'bkg:crm:message:drafted');
      expect(evt).toBeDefined();
      expect((evt as CustomEvent).detail).toMatchObject({
        messageId: 'd-3',
        contactId: 'c-1',
        toneUsed: 'brief',
      });
    });
  });

  // ─── sendReply ─────────────────────────────────────────────────────────

  describe('sendReply', () => {
    it('queues with timestamp and dispatches bkg:crm:message:queued', async () => {
      const queuedUntil = new Date(Date.now() + 90_000).toISOString();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          messageId: 'd-1',
          timeMachineHandle: 't-1',
          queuedUntil,
        }),
      });
      const result = await sendReply({ draftMessageId: 'd-1' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.messageId).toBe('d-1');
        expect(result.timeMachineHandle).toBe('t-1');
      }
      const calls = dispatchSpy.mock.calls
        .map((c) => c[0])
        .filter((e): e is CustomEvent => e instanceof CustomEvent);
      const evt = calls.find((e) => e.type === 'bkg:crm:message:queued');
      expect(evt).toBeDefined();
      expect((evt as CustomEvent).detail.queuedUntil).toBe(queuedUntil);
    });

    it('returns validation failure when draftMessageId is missing', async () => {
      // @ts-expect-error — intentional
      const result = await sendReply({});
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('validation');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns send-failed on 400-class response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: 'invalid_state' }),
      });
      const result = await sendReply({ draftMessageId: 'd-99' });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('send-failed');
    });
  });

  // ─── undoSendReply ─────────────────────────────────────────────────────

  describe('undoSendReply', () => {
    it('succeeds within the 90s window', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          messageId: 'd-1',
          timeMachineHandle: 't-1',
        }),
      });
      const result = await undoSendReply('d-1');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.messageId).toBe('d-1');
      const calls = dispatchSpy.mock.calls
        .map((c) => c[0])
        .filter((e): e is CustomEvent => e instanceof CustomEvent);
      const evt = calls.find((e) => e.type === 'bkg:crm:message:undone');
      expect(evt).toBeDefined();
    });

    it('returns undo-window-expired on 409', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          ok: false,
          reason: 'undo-window-expired',
          detail: 'too late',
        }),
      });
      const result = await undoSendReply('d-1');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('undo-window-expired');
      }
    });

    it('returns validation failure when messageId is empty', async () => {
      const result = await undoSendReply('');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('validation');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});

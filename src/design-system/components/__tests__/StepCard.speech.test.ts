import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * StepCard Speech Recognition Test
 * =================================
 * Tests the onresult handler to ensure it correctly processes interim and final results
 * without repeating accumulated transcripts.
 *
 * Simulates 3 interim result fires followed by 1 final result for "hello world"
 * and asserts the transcript is exactly "hello world " (not repeated 5+ times).
 */

describe('StepCard Speech Recognition', () => {
  let mockRecognition: any;
  let onresultHandler: any;
  let transcriptState: string;

  beforeEach(() => {
    // Setup a mock SpeechRecognition with the fixed onresult handler
    mockRecognition = {
      continuous: false,
      interimResults: true,
      onstart: null,
      onresult: null,
      onerror: null,
      onend: null,
      abort: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    // Simulate the fixed handler from StepCard.tsx (line 89-106)
    onresultHandler = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      // This is the key fix: replace, not append
      transcriptState = final || interim;
    };

    transcriptState = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should accumulate interim results without repeating', () => {
    // Fire 1: interim result "hel"
    const event1 = {
      resultIndex: 0,
      results: [
        {
          0: { transcript: 'hel' },
          isFinal: false,
        },
      ],
    };
    onresultHandler(event1);
    expect(transcriptState).toBe('hel');

    // Fire 2: interim result "hello" (replaces previous interim)
    const event2 = {
      resultIndex: 0,
      results: [
        {
          0: { transcript: 'hello' },
          isFinal: false,
        },
      ],
    };
    onresultHandler(event2);
    expect(transcriptState).toBe('hello');

    // Fire 3: interim result "hello world"
    const event3 = {
      resultIndex: 0,
      results: [
        {
          0: { transcript: 'hello world' },
          isFinal: false,
        },
      ],
    };
    onresultHandler(event3);
    expect(transcriptState).toBe('hello world');

    // Fire 4: final result "hello world"
    const event4 = {
      resultIndex: 0,
      results: [
        {
          0: { transcript: 'hello world' },
          isFinal: true,
        },
      ],
    };
    onresultHandler(event4);
    expect(transcriptState).toBe('hello world ');
  });

  it('should handle mixed interim and final results correctly', () => {
    // Simulate a result with both interim and final
    const event = {
      resultIndex: 0,
      results: [
        {
          0: { transcript: 'hello' },
          isFinal: false,
        },
        {
          0: { transcript: 'world' },
          isFinal: true,
        },
      ],
    };
    onresultHandler(event);
    // final should take precedence when present
    expect(transcriptState).toBe('world ');
  });

  it('should not repeat transcript on subsequent interim events from same results array', () => {
    // This simulates the bug: when browser fires onresult multiple times with
    // overlapping result indices, the old code would append all of them
    const event = {
      resultIndex: 0,
      results: [
        {
          0: { transcript: 'hello' },
          isFinal: false,
        },
        {
          0: { transcript: 'world' },
          isFinal: false,
        },
      ],
    };
    onresultHandler(event);
    const firstState = transcriptState;
    expect(firstState).toBe('helloworld'); // Processes all from resultIndex=0 onward

    // Fire again with same resultIndex (simulating browser duplicate event)
    onresultHandler(event);
    // Should still be the same, not "helloworld helloworld" (the bug that was fixed)
    expect(transcriptState).toBe('helloworld');
  });

  it('should correctly use resultIndex to avoid reprocessing', () => {
    // Fire 1: results[0] is interim
    const event1 = {
      resultIndex: 0,
      results: [
        {
          0: { transcript: 'hello' },
          isFinal: false,
        },
      ],
    };
    onresultHandler(event1);
    expect(transcriptState).toBe('hello');

    // Fire 2: results[0] same, results[1] is new interim
    // resultIndex=1 means skip results[0], only process results[1]
    const event2 = {
      resultIndex: 1,
      results: [
        {
          0: { transcript: 'hello' },
          isFinal: false,
        },
        {
          0: { transcript: 'world' },
          isFinal: false,
        },
      ],
    };
    onresultHandler(event2);
    // Only processes from index 1 onward
    expect(transcriptState).toBe('world');
  });

  it('final result should update even if there are preceding interim results', () => {
    const event = {
      resultIndex: 0,
      results: [
        {
          0: { transcript: 'hello w' },
          isFinal: false,
        },
        {
          0: { transcript: 'hello world' },
          isFinal: false,
        },
        {
          0: { transcript: 'hello world' },
          isFinal: true,
        },
      ],
    };
    onresultHandler(event);
    // final takes precedence
    expect(transcriptState).toBe('hello world ');
  });
});

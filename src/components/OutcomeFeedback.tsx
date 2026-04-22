'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Edit2, Check, AlertCircle } from 'lucide-react';

interface OutcomeFeedbackProps {
  specialistRunId: string;
}

type FeedbackSignal = 'thumbs_up' | 'thumbs_down' | 'correction';
type FeedbackState = 'idle' | 'loading' | 'success' | 'error';

export default function OutcomeFeedback({ specialistRunId }: OutcomeFeedbackProps) {
  const [state, setFeedbackState] = useState<FeedbackState>('idle');
  const [showCorrectionInput, setShowCorrectionInput] = useState(false);
  const [correctionText, setCorrectionText] = useState('');
  const [lastSignal, setLastSignal] = useState<FeedbackSignal | null>(null);

  const sendFeedback = async (signal: FeedbackSignal) => {
    setFeedbackState('loading');
    setLastSignal(signal);

    const payload: Record<string, unknown> = {
      specialistRunId,
      signal,
    };

    if (signal === 'correction' && correctionText) {
      payload.note = correctionText;
    }

    try {
      const response = await fetch('/api/v1/rsi/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      setFeedbackState('success');
      setCorrectionText('');
      setShowCorrectionInput(false);

      // Reset success state after 2 seconds
      setTimeout(() => setFeedbackState('idle'), 2000);
    } catch (err) {
      console.error('[OutcomeFeedback] Error:', err);
      setFeedbackState('error');

      // Reset error state after 3 seconds
      setTimeout(() => setFeedbackState('idle'), 3000);
    }
  };

  // Base button styles
  const baseButtonClass =
    'inline-flex items-center gap-1 px-3 py-2 rounded text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

  // State-specific styles
  const stateClass = (() => {
    switch (state) {
      case 'loading':
        return 'opacity-75';
      case 'success':
        return 'ring-2 ring-emerald-400 bg-emerald-50';
      case 'error':
        return 'ring-2 ring-red-300 bg-red-50';
      default:
        return '';
    }
  })();

  const isDisabled = state === 'loading' || state === 'success' || state === 'error';

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-drafting-brass-200 bg-drafting-brass-50 p-4">
      {/* Main feedback buttons */}
      <div className="flex items-center gap-2">
        {/* Thumbs Up */}
        <button
          onClick={() => sendFeedback('thumbs_up')}
          disabled={isDisabled}
          className={`${baseButtonClass} text-drafting-brass-700 hover:bg-drafting-brass-100 hover:text-drafting-brass-900 ${stateClass}`}
          title="This answer was helpful"
          aria-label="Thumbs up"
        >
          <ThumbsUp size={16} />
          <span className="hidden sm:inline">Good</span>
        </button>

        {/* Thumbs Down */}
        <button
          onClick={() => sendFeedback('thumbs_down')}
          disabled={isDisabled}
          className={`${baseButtonClass} text-drafting-brass-700 hover:bg-drafting-brass-100 hover:text-drafting-brass-900 ${stateClass}`}
          title="This answer was not helpful"
          aria-label="Thumbs down"
        >
          <ThumbsDown size={16} />
          <span className="hidden sm:inline">Not helpful</span>
        </button>

        {/* Correction */}
        <button
          onClick={() => {
            setShowCorrectionInput(!showCorrectionInput);
            setCorrectionText('');
          }}
          disabled={isDisabled}
          className={`${baseButtonClass} text-drafting-brass-700 hover:bg-drafting-brass-100 hover:text-drafting-brass-900 ${stateClass}`}
          title="Provide a correction"
          aria-label="Correction"
        >
          <Edit2 size={16} />
          <span className="hidden sm:inline">Correct</span>
        </button>

        {/* Status indicators */}
        {state === 'success' && (
          <div className="flex items-center gap-1 text-emerald-700">
            <Check size={16} />
            <span className="text-xs">Recorded</span>
          </div>
        )}

        {state === 'error' && (
          <div className="flex items-center gap-1 text-red-600">
            <AlertCircle size={16} />
            <span className="text-xs">Error</span>
          </div>
        )}
      </div>

      {/* Correction textarea */}
      {showCorrectionInput && (
        <div className="flex flex-col gap-2">
          <textarea
            value={correctionText}
            onChange={(e) => setCorrectionText(e.target.value)}
            placeholder="Describe what should have been said..."
            className="min-h-20 w-full rounded border border-drafting-brass-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 placeholder:text-slate-400 focus:border-robins-egg-400 focus:outline-none focus:ring-1 focus:ring-robins-egg-400"
            disabled={isDisabled}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowCorrectionInput(false);
                setCorrectionText('');
              }}
              disabled={isDisabled}
              className="px-3 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => sendFeedback('correction')}
              disabled={isDisabled || !correctionText.trim()}
              className="inline-flex items-center gap-1 rounded bg-robins-egg-400 px-3 py-1 text-xs font-medium text-white hover:bg-robins-egg-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Check size={14} />
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Default CaptureStructurer — voice via Whisper, photo/text via Claude.
//
// The ONLY file that names a model. Swap a deprecated model by changing the constants
// (or replace this class entirely); nothing else in the capture pipeline changes.
import Anthropic from '@anthropic-ai/sdk';
import {
  CaptureError,
  type CaptureStructurer,
  type StructureInput,
  type StructuredRecord,
  type TranscribeInput,
  CAPTURE_CATEGORIES,
} from './structurer';

// ── swap points ─────────────────────────────────────────────────────────────
const WHISPER_MODEL = 'whisper-1';
const STRUCTURING_MODEL = 'claude-sonnet-4-6';
// ─────────────────────────────────────────────────────────────────────────────

const FIELD_REPORT_TOOL = {
  name: 'record_field_report',
  description: 'Record a structured construction field report extracted from a voice note or jobsite photo.',
  input_schema: {
    type: 'object' as const,
    properties: {
      category: { type: 'string', enum: [...CAPTURE_CATEGORIES], description: 'Best-fit category.' },
      cost_code: { type: ['string', 'null'], description: 'MasterFormat code from the provided list when category=expense; else null.' },
      amount: { type: ['number', 'null'], description: 'USD amount when category=expense; else null.' },
      vendor: { type: ['string', 'null'] },
      occurred_on: { type: ['string', 'null'], description: 'ISO date (YYYY-MM-DD) the event happened; use today if unstated.' },
      summary: { type: 'string', description: 'One concise line a GC would log.' },
      confidence: { type: 'number', description: '0..1 confidence in the extraction.' },
    },
    required: ['category', 'summary', 'confidence'],
  },
};

function structuringSystem(knownCostCodes: string[] | undefined, nowISO: string): string {
  const codes = knownCostCodes?.length ? knownCostCodes.join(', ') : '(none provided)';
  return [
    'You structure construction field reports for a general contractor.',
    `Today is ${nowISO}. If the report does not state a date, use today for occurred_on.`,
    'Classify into exactly one category. Only set amount + cost_code when it is clearly an expense/cost.',
    `When it is an expense, map cost_code to the closest of these MasterFormat codes: ${codes}.`,
    'Never invent a dollar amount that was not stated or clearly implied. Lower confidence when unsure.',
    'Call record_field_report exactly once.',
  ].join(' ');
}

export class DefaultStructurer implements CaptureStructurer {
  async transcribe(input: TranscribeInput): Promise<{ transcript: string; model: string }> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new CaptureError('OPENAI_API_KEY not set — voice transcription unavailable');
    let bytes: Buffer;
    if (input.base64) bytes = Buffer.from(input.base64, 'base64');
    else if (input.storageUrl) {
      const r = await fetch(input.storageUrl);
      if (!r.ok) throw new CaptureError(`could not fetch audio (${r.status})`);
      bytes = Buffer.from(await r.arrayBuffer());
    } else throw new CaptureError('voice capture needs storageUrl or base64');

    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(bytes)], { type: input.mimeType || 'audio/m4a' }), 'audio');
    form.append('model', WHISPER_MODEL);
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) throw new CaptureError(`transcription failed (${res.status})`);
    const j = (await res.json()) as { text?: string };
    if (!j.text) throw new CaptureError('empty transcript');
    return { transcript: j.text, model: WHISPER_MODEL };
  }

  async structure(input: StructureInput): Promise<StructuredRecord> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new CaptureError('ANTHROPIC_API_KEY not set — structuring unavailable');
    const anthropic = new Anthropic({ apiKey });

    const content: Anthropic.ContentBlockParam[] = [];
    if (input.kind === 'photo') {
      if (input.imageBase64) {
        content.push({
          type: 'image',
          source: { type: 'base64', media_type: (input.mimeType as 'image/jpeg') || 'image/jpeg', data: input.imageBase64 },
        });
      } else if (input.imageUrl) {
        content.push({ type: 'image', source: { type: 'url', url: input.imageUrl } });
      } else {
        throw new CaptureError('photo capture needs imageUrl or imageBase64');
      }
      content.push({ type: 'text', text: 'Structure this jobsite photo as a field report.' });
    } else {
      if (!input.transcript) throw new CaptureError('voice structuring needs a transcript');
      content.push({ type: 'text', text: `Structure this field report:\n"""${input.transcript}"""` });
    }

    const msg = await anthropic.messages.create({
      model: STRUCTURING_MODEL,
      max_tokens: 512,
      tools: [FIELD_REPORT_TOOL],
      tool_choice: { type: 'tool', name: 'record_field_report' },
      system: structuringSystem(input.knownCostCodes, input.nowISO),
      messages: [{ role: 'user', content }],
    });
    const tool = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    if (!tool) throw new CaptureError('model returned no structured output');
    const r = tool.input as Partial<StructuredRecord>;
    return {
      category: (r.category ?? 'note') as StructuredRecord['category'],
      cost_code: r.cost_code ?? null,
      amount: typeof r.amount === 'number' ? r.amount : null,
      vendor: r.vendor ?? null,
      occurred_on: r.occurred_on ?? input.nowISO.slice(0, 10),
      summary: r.summary ?? '',
      confidence: typeof r.confidence === 'number' ? r.confidence : 0.5,
      model: STRUCTURING_MODEL,
    };
  }
}

# Specialist Runner — Week 1 AI Wiring

The specialist runner is the core integration that lets StepCard trigger an AI specialist, retrieve relevant database citations, and return a structured response with both narrative and machine-legible output.

## How It Works

### From StepCard

When a `analysis_result` step is rendered, pass the `renderAnalysis` prop:

```tsx
<StepCard
  step={step}
  renderAnalysis={async (context) => {
    const result = await runSpecialist('compliance-structural', {
      scope_description: userInput,
      jurisdiction: 'Los Angeles, CA',
      lane: 'gc',
    });
    return result;
  }}
/>
```

### Context Fields

- **scope_description** (required): Plain-English description of the scope (e.g., "ADU addition, 800 sq ft, wood frame, slab-on-grade")
- **jurisdiction**: City, county, or state (e.g., "Los Angeles, CA"). Used to resolve code edition and retrieve relevant database entities
- **trade**: Specialization (e.g., "framing", "foundation"). Injected into the prompt for context
- **lane**: User type (`'gc'`, `'diy'`, `'specialty'`, `'worker'`, `'supplier'`, `'equipment'`, `'service'`, `'agent'`). Tunes response voice and emphasis
- **project_phase**: Lifecycle stage (`'pre_bid'`, `'design'`, `'permit'`, `'build'`, `'inspection'`). Calibrates urgency and detail
- **extra**: Specialist-specific inputs (e.g., soil type, equipment type)

## Architecture

### Server Side

**`src/lib/specialists.ts`** — Node-only helper

- `callSpecialist(specialistId, context, options)` — Load prompt, query database, call Claude, parse response
- Returns `SpecialistResult` with narrative, structured JSON, citations, confidence, and latency

**`src/app/api/v1/specialists/[id]/route.ts`** — Next.js POST endpoint

- Validates request body (required: `scope_description`, max 10,000 chars)
- Rate-limit stub (real implementation will check tier-based caps)
- Delegates to `callSpecialist()` and returns JSON
- Never leaks internal errors to client

### Client Side

**`src/lib/specialists.client.ts`** — React-safe helper

- `runSpecialist(specialistId, context)` — Thin fetch wrapper
- Use in StepCard's `renderAnalysis` callback

## Production vs. Prototype Prompts

Each specialist has two possible prompt versions:

1. **Production** (`compliance-structural.production.md`) — Rewritten for real deployment, instructs model to cite database entities with IDs and timestamps, includes lane awareness, structured output schema
2. **Prototype** (`compliance-structural.md`) — Original draft from the v3.2 demo

By default, the runner tries production first, falls back to prototype if missing. Override with `preferProductionPrompt: false`.

## Database Citations

If jurisdiction is provided, the runner queries Supabase `knowledge_entities` for relevant code sections and injects them into the model's context. The model can then cite them by entity ID in its response.

Example output:
```json
{
  "citations": [
    {
      "entity_id": "cbc-2024-section-3401",
      "section": "3401 (Soils, Foundation, and Grading)",
      "jurisdiction": "California / Los Angeles",
      "edition": "2024",
      "updated_at": "2024-01-01T00:00:00Z",
      "relevance": "critical"
    }
  ]
}
```

## Adding a New Specialist

1. Create the prompt file: `app/docs/ai-prompts/{id}.md` (prototype) and/or `{id}.production.md` (production)
2. Ensure prompt includes input schema, output schema, and examples (see `compliance-structural.production.md`)
3. Create a workflow step with `type: 'analysis_result'` and `promptId: '{id}'`
4. In StepCard's `renderAnalysis`, call `runSpecialist('{id}', context)`
5. Test with and without `ANTHROPIC_API_KEY` (mock mode is automatic fallback)

## Environment & Configuration

- **ANTHROPIC_API_KEY**: If unset, specialist returns deterministic mock (for UI development). Set to enable real LLM calls.
- **Model**: Fixed to `claude-sonnet-4-20250514`, max 2500 tokens
- **Supabase**: Optional; if not configured, entities fall back to mock data
- **Rate Limiting**: Currently stubbed. Real implementation will apply tier-based caps (free: 50/month, 10/day; pro: unlimited)

## Error Handling

- Invalid request body → 400 with field name
- Rate limit exceeded → 429 (when real limiter is active)
- Specialist fails (API error, prompt not found) → 500 generic error (details logged server-side)
- API key missing and mock disabled → throws error
- Prompt file missing → throws error with specialistId in message

## Testing

Test file: `src/lib/__tests__/specialists.test.ts`

Current status: Written but requires vitest or jest to be added to package.json. Tests cover:
- Prompt loading (production and prototype)
- Mock mode determinism
- Runtime context injection
- Error cases
- SpecialistResult schema validation

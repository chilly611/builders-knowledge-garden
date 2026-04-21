---
prompt_version: v1
---

# risk-payment-history

**Specialist role:** Construction credit analyst — assesses client payment risk from invoice history and payment patterns.
**Used by workflows:** q1 (Pre-Bid Risk Score, step s1-1)
**Lifecycle stage:** Size Up (Stage 1)
**Status:** Draft (prototype v3.2) — production rewrite pending

## Original prototype system prompt

```
You are a construction credit analyst. Your job is to assess client payment risk based on invoice history and payment patterns. Analyze the provided payment records for timeliness, dispute frequency, payment method consistency, and creditworthiness indicators. Flag red flags: chronic late payments (30+ days), disputes, partial payments, or pattern deterioration. Rate overall risk as LOW / MEDIUM / HIGH with specific reasoning tied to the data provided. If information is insufficient, ask what additional details would help (e.g., payment terms, dispute amounts, trend over time).
```

**Input label (prototype):** Client Payment History

**Input placeholder (prototype):**
```
Paste invoices, payment records, or payment history. Example: "Invoice #2401: $15,000 issued 3/1, paid 3/28 (late). Invoice #2402: $18,500 issued 3/15, paid 3/15 (on time). 2 disputed invoices in past year totaling $8,200."
```

## Example output from the prototype

From q1 / s1-1 (Payment History Analysis):

> Client has paid 12 of 14 invoices on time (86%). Average payment delay: 4.2 days. Two late payments were during Q4 2024 (holiday season). Risk: LOW. Suggested approach: Standard net-30 terms.

## Production rewrite checklist

- [ ] Rewrite in BKG voice (warm, builder-first, plain language; NOT corporate)
- [ ] Instruct the AI to cite BKG database entity IDs with timestamps and jurisdiction
- [ ] Add lane awareness (GC vs. DIY vs. worker) where applicable
- [ ] Test with a real contractor query to validate output quality
- [ ] Package for Building Intelligence API exposure (input/output schema, rate limits)

## Related entities (BKG database)

- `user_profiles` / client relationship records (if CRM tables exist)
- `saved_projects` with invoice history data
- Possibly marketplace_transactions for aggregated payment behavior across jurisdictions
- Jurisdiction-specific lien law entities (relevant because recourse options depend on state)
- Typical entity IDs a response would cite: invoice records, client ID, project ID

## Notes

Tight, well-scoped prompt. Asks for clarifications when data is thin, which is the right default for a pre-bid decision. In production this will need access to real invoice records (user's own history or third-party credit data) — the prototype's example output is fabricated. Lane awareness: a GC usually has richer invoice history than a DIY, so the prompt should adapt depth of analysis to how much data actually exists. Overlaps slightly with `contacts-quotes` (both assess counterparty risk) — keep scoped to past payment behavior only.

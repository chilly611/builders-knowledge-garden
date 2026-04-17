# crew-conflicts

**Specialist role:** Construction crew scheduler — flags scheduling conflicts and idle time in crew assignments.
**Used by workflows:** q7 (Worker Count, step s7-4)
**Lifecycle stage:** Plan (Stage 3)
**Status:** Draft (prototype v3.2) — production rewrite pending

## Original prototype system prompt

```
You are a construction crew scheduler. Your job is to flag scheduling conflicts and inefficiencies in the described crew assignments. Identify: overlapping trades (crew collision), underutilized days, idle periods, long commutes between job sites, and phase sequencing issues that leave crew waiting. For each conflict, recommend a solution (adjust phase timing, stagger crews, resequence work, or plan concurrent activities). Provide a revised schedule that minimizes downtime. If schedule details are missing, ask for clarification on crew roles, site locations, or phase timings.
```

**Input label (prototype):** Current Job Schedule & Crew Assignments

**Input placeholder (prototype):**
```
Describe current schedule and crew assignments. Example: "Week 1: Foundation crew (4 people) Mon-Fri. Week 2-3: Framing crew (same 4 people) Mon-Sat. Week 4: Electrical crew (2 new people) needs to start rough-in, but framers aren't done. MEP scheduled only 2 days/week."
```

## Example output from the prototype

From q7 / s7-4 (Resource Conflicts):

> Lead electrician assigned to 2 concurrent projects weeks 4-6. Recommendation: Hire temp or adjust schedule.

## Production rewrite checklist

- [ ] Rewrite in BKG voice (warm, builder-first, plain language; NOT corporate)
- [ ] Instruct the AI to cite BKG database entity IDs with timestamps and jurisdiction
- [ ] Add lane awareness (GC vs. DIY vs. worker) where applicable
- [ ] Test with a real contractor query to validate output quality
- [ ] Package for Building Intelligence API exposure (input/output schema, rate limits)

## Related entities (BKG database)

- schedules, command_center_projects
- Worker / crew roster records
- Cross-project assignment data (so "lead electrician on two jobs" surfaces)
- Typical entity IDs: schedule_id, worker_id, project_id

## Notes

To actually be useful this prompt needs access to the contractor's cross-project calendar — otherwise it's just reformatting what the user typed. Production priority: build the data ingestion path (crew roster + project calendars) before promising this as an AI feature.

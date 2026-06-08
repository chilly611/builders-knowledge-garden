> **DRAFT — phase-kickoff working document. Not policy. For founder review. Read-only research; nothing in the repo, Supabase, or Vercel was changed to produce it.**

# What a large general contractor needs before trusting us as its system of record
*phase-kickoff draft · Tier 1 strategy · for founder review*

Cross-references: [`PLATFORM-CONSTITUTION.md`](../../docs/PLATFORM-CONSTITUTION.md) (Tier 0, locked decisions) · [`STRATEGY-bulletproof-and-scale.md`](../../docs/STRATEGY-bulletproof-and-scale.md) (the phase ladder this brief plugs into) · [`code-ingestion-hitl.md`](../../docs/code-ingestion-hitl.md) (the human-in-the-loop knowledge gate). This document extends those; it does not replace them.

---

## The question, and who is asking it

The constitution names the **general contractor as the beachhead lane** (decision #16), and the strategy doc's north star is a single sentence: *a large general contractor runs a real job in the Killer App, as their system of record, end to end — and it does not break.* This brief answers the procurement-room version of that sentence:

> **What does a large GC need to see before it lets its projects live here as the record of truth — the place a dispute, an audit, or a lawsuit gets settled from?**

A large GC is not buying a convenience tool. The moment a project becomes a *system of record*, the buyer's calculus changes. Construction records are kept for the **statute of repose plus three years** — four to fifteen years depending on the state, so commonly **thirteen years** for drawings, RFIs, change orders, submittals, field reports, and correspondence — and financial records for **seven years** under IRS rules. An effective retention regime is the GC's primary defence in a delay, defect, or negligence claim, and failing to preserve records can draw court sanctions. [[Contractor]](https://www.contractormag.com/management/best-practices/article/21126514/record-retention-101-for-contractors) [[NSPE]](https://www.nspe.org/sites/default/files/resources/pdfs/liability/White%20Paper-060916DocumentRetentionDocument-FINAL.pdf) So when a GC trusts us with the record, it is trusting us with the thing that protects the company for over a decade. That raises the bar from "is it nice to use" to "will it stand up in front of an auditor, an IT security review, and a judge."

The good news, established up front so the rest of the brief is honest: **the platform already has more of the system-of-record spine built than its reputation suggests.** There is a partitioned, seven-year-retention `audit_log` with before/after diffs on twelve write paths; a 594-cell lane/permission grid with absence-is-deny semantics; organization and membership tables; a human-in-the-loop verification queue for the knowledge base; and error/analytics observability wired with PII discipline. The gaps are real and named below, but the foundation is not a blank page.

This brief ranks each requirement **P0 → P3** by how hard it gates a large-GC deal, then maps it to the strategy doc's existing **Phase 2 / 3 / 4** ladder. Priority and phase are related but not identical: a P0 requirement is a deal-breaker, and most P0s land in Phase 2 or early Phase 3, but a few P0s (the audit spine) are already substantially done and a few P1s are deliberately deferred to Phase 4 because no buyer blocks on them at first signature.

### How to read priority

- **P0 — deal-breaker.** A large GC's security or legal review fails the product without this. No amount of charm closes the deal.
- **P1 — strong gate.** Will be asked for in the RFP or security questionnaire; absence stalls or shrinks the deal (pilot only, no rollout).
- **P2 — expected at scale.** Needed before a multi-project, multi-region, or portfolio rollout; a single-project pilot survives without it.
- **P3 — differentiator / later.** Raises the ceiling and widens the moat; not a gate at first signature.

### How this maps to the strategy phases

The strategy doc already defines the ladder, and this brief honours it rather than inventing a parallel one:

- **Phase 2 — Generalize & multi-tenant.** *Gate: a brand-new GC creates their own job, the whole loop works, and two tenants cannot see each other's data.* This is where the **tenant-isolation, RBAC, audit, and SSO foundations** must be true.
- **Phase 3 — Enterprise-ready.** *Gate: a large developer runs a real project; security and reliability hold under their load.* This is where **certifications, data residency, integrations, advanced RBAC, e-signature, and the admin console** must be true.
- **Phase 4 — Investment-ready proof.** *Gate: the proof investors asked for is real and on a dashboard.* This is where **scale/performance, disaster recovery, enterprise support SLAs, and the integration marketplace** must be true.

One honest note on sequence: the strategy doc folds SSO and audit into Phase 3, but a GC's security questionnaire asks for SSO and tenant isolation *before* it will let a second project in. This brief pulls **SSO foundations and tenant isolation forward into Phase 2** — consistent with Phase 2's own gate ("two tenants cannot see each other's data"), and a small re-ordering rather than a contradiction. Flagged here for the founder to confirm.

---

## The requirements

Each requirement below carries four things: **(a) why a large GC needs it**, **(b) what enterprise-ready looks like**, **(c) current state vs gap** (grounded in the live signals, honest about both what is built and what is not), and **(d) the phase it lands in**.

---

### 1. Multi-tenant isolation — *P0 · Phase 2*

**(a) Why a large GC needs it.** This is the requirement the GC will never say out loud and will absolutely block on: *can a competitor, or another of your customers, ever see my project data?* For a SaaS provider, isolating tenant data is the single most consequential responsibility — one cross-tenant leak permanently destroys trust and can end the business. [[AWS]](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/) For a GC whose margins, sub bids, and client relationships are the asset, a leak is not a bug report — it is a lawsuit and a lost customer base.

**(b) What enterprise-ready looks like.** A clearly stated and tested isolation model. The three industry models are shared-schema (a `tenant_id` column filtered by row-level security — weakest, depends on the database enforcing the policy correctly), schema-per-tenant (a private namespace per tenant), and database-per-tenant (hardest isolation, separate processes and storage). [[Leapcell]](https://leapcell.io/blog/achieving-robust-multi-tenant-data-isolation-with-postgresql-row-level-security) Enterprise-ready means: RLS enabled and policied on *every* tenant-scoped table; defence-in-depth so an application bug that forgets a `WHERE tenant_id =` clause still cannot leak (the database enforces it); and an integration test suite that exercises every access pattern and proves nothing crosses a boundary. The known silent-failure modes — connection-pool contamination, shared-cache poisoning, async-context leaks, and views owned by a superuser bypassing RLS — must each be specifically tested. [[InstaTunnel]](https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c) [[Rico Fritzsche]](https://ricofritzsche.me/mastering-postgresql-row-level-security-rls-for-rock-solid-multi-tenancy/)

**(c) Current state vs gap.** This is the platform's largest single gap, and it is honest to name it bluntly. Today there is **one shared Supabase Postgres production instance** (`knowledge-gardens-prod`, `vlezoyalutexenbnzzui`) hosting Builder's *and* other gardens — Toxicology/EWG datasets, an Orchid garden, and a second application that manages its own schema through a different migration framework (`knex`). The 2026-05-30 Supabase security advisor flagged **21 public tables with RLS disabled**. The in-flight migration `supabase/migrations/20260531_rls_group_a_lockdown.sql` is policy-first and correctly scoped, but it only closes **7 of the 21** (Group A — BKG-owned user/PII/telemetry: `user_achievements`, `user_progress`, `daily_briefings`, `crm_voice_fingerprint`, `crm_contact_activities`, `specialist_runs`, `improvement_ledger`). **14 tables remain open** (Group B — other gardens' data and the foreign `knex` app), deliberately left until the owning garden signs off, because enabling RLS with no policy locks a table and would break their ingestion writes. So the present state is: *partial RLS lockdown on a shared instance that also runs foreign code.* That is a pilot-grade posture, not a system-of-record posture. The path is not just "finish the policies." For a buyer that asks "what else runs in the database holding my projects," the credible answer is **a dedicated Builder's tenant boundary** — at minimum a separate database/instance from the other-garden and foreign-framework data, with `org_id`-scoped RLS and an isolation test suite on top. The model also needs the *project* dimension, not only the user dimension: the existing `command_center_projects.user_id`-match plus a hard-coded demo allowlist (visible in the RLS migration and `projectOwnership.ts`) is a demo affordance, not a tenancy model.

**(d) Phase.** **Phase 2.** Phase 2's gate is literally "two tenants cannot see each other's data." This requirement *is* that gate. P0.

---

### 2. Audit & traceability — *P0 · Phase 2 (foundation already largely built; legal hold is the Phase 3 gap)*

**(a) Why a large GC needs it.** The record only protects the GC if it is *trustworthy* — every change attributable, time-stamped, and tamper-resistant, and the whole thing reproducible years later. Federal contracts (FAR 52.215-2, 42.101) grant auditors broad access to contractor records for at least three years after final payment; a litigation hold can require freezing records the moment a dispute looks likely, and destroying held records draws sanctions. [[Acquisition.gov]](https://www.acquisition.gov/far/subpart-4.7) [[RSM]](https://rsmus.com/insights/industries/government-contracting/government-contract-record-retention.html) An "audit log" that can be edited or that loses history is worse than none — it creates false confidence.

**(b) What enterprise-ready looks like.** Append-only, immutable audit records with full before/after state, the acting identity, and an accurate timestamp; retention that matches the legal floor (seven years financial, longer for project records); reads gated so tenants see only their own history; clean, scoped **export** for auditors and counsel; and a **legal-hold** mechanism that can pin a project's records against the normal retention/deletion cycle.

**(c) Current state vs gap.** This is the platform's quiet strength. The `audit_log` table is **declaratively range-partitioned by month** with **seven-year IRS-driven retention** managed by `pg_cron` jobs (`maintain-audit-log-partitions`, `drop-old-audit-log-partitions`). The `audit_trigger_fn` (a `SECURITY DEFINER` trigger) writes a row with the full before/after JSONB diff and `changed_by = auth.uid()` on **twelve source tables**, including `project_change_orders`, `project_rfis`, `project_submittals`, `project_punch_items`, `invoices`, `signed_documents`, `signature_events`, `organizations`, and `org_members`. RLS is enabled on the parent *and* every monthly leaf partition independently (Postgres does not propagate RLS to partition leaves, and the team caught that — `20260524_audit_log_partition_rls.sql`). Writes route through the service role; direct leaf reads return `permission denied` for `anon`/`authenticated`. This is a genuinely enterprise-shaped audit spine. The **gaps** are three: (1) reads are currently service-role-only with *no* tenant-scoped SELECT policy, so there is no self-serve "show me my project's history" surface for a customer admin yet; (2) there is **no scoped export** path (CSV/JSON for an auditor under NDA); and (3) there is **no legal-hold** flag — today the seven-year `drop_old_audit_log_partitions()` job would happily age out a partition even if a held project's records lived in it. Legal hold must be able to override retention.

**(d) Phase.** The **spine is Phase 2** and largely done — keep it, extend it to every new system-of-record table, and add a tenant-scoped read policy as RBAC lands. **Export and legal hold are Phase 3** (the enterprise-ready gate). P0 because the immutability and attribution are non-negotiable for a record; the export/hold extensions are P0-within-Phase-3.

---

### 3. Identity & access — SSO, MFA, directory integration — *P0 (SSO) / P1 (SCIM) · Phase 2 foundation, Phase 3 polish*

**(a) Why a large GC needs it.** A large GC runs an identity provider (Okta, Microsoft Entra ID, or Google Workspace) and a security team that requires every vendor to federate to it. SSO consolidates sign-in and removes the password-sprawl risk; it is among the most-requested enterprise features and a standard line in procurement questionnaires ("Do you support SAML 2.0 SSO federated to our IdP?"). [[WorkOS]](https://workos.com/guide/the-guide-to-becoming-enterprise-ready-for-saas-product-managers) Without it, the GC's IT team cannot grant or revoke access centrally — a dealbreaker for a system holding a decade of legal records.

**(b) What enterprise-ready looks like.** **SAML 2.0 and OIDC** SSO that federates to the customer's IdP; **MFA** (either enforced by us or honoured from the IdP); and **SCIM 2.0** provisioning and — critically — **deprovisioning**, so that when an employee leaves the GC, access is revoked automatically rather than lingering. [[SSOJet]](https://ssojet.com/white-papers/enterprise-sso-requirements-checklist/) Deprovisioning is the part security teams care most about, because a stale account on a system of record is a standing liability.

**(c) Current state vs gap.** Authentication has been migrated from Clerk to **Supabase Auth**, which supports email/OTP, OAuth social, and — on its paid tiers — SAML SSO; the codebase has `organizations`, `org_members`, and `/api/v1/orgs/invite` + `/accept-invite` routes, so the *organization* primitive that SSO and SCIM attach to already exists. But there is **no SAML/OIDC enterprise federation wired, no SCIM endpoint, and no enforced MFA** today (a grep for `SAML`/`SCIM` returns only org-membership code, not federation). This is a true, clean gap — and a tractable one, because the org model to hang it on is built. SSO is the gate; SCIM provisioning typically accompanies the SSO request but a GC will often accept manual provisioning for a pilot, which is why SCIM is P1 rather than P0.

**(d) Phase.** **SSO foundations in Phase 2** (so the very first enterprise GC can federate); **SCIM, enforced MFA policy, and full directory lifecycle in Phase 3**. SSO is P0; SCIM is P1.

---

### 4. Roles & permissions (RBAC) — *P0 · Phase 2 foundation already built; advanced RBAC in Phase 3*

**(a) Why a large GC needs it.** A GC's project touches dozens of people across the nine lanes — the GC's own PMs and superintendents, the owner, subs, the architect, the lender, suppliers, inspectors, field workers, and increasingly automated agents. Each must see exactly what their role needs and nothing more. Least privilege — every user and service granted the minimum access for their function — is the governing principle, and scoped roles limit the blast radius when an account is compromised. [[Oso]](https://www.osohq.com/learn/rbac-best-practices) For a GC, the concrete fear is a sub seeing another sub's bid, or an owner seeing the GC's margin.

**(b) What enterprise-ready looks like.** A **User → Role → Scope** model, where roles exist at both the **org** level (org_id + user_id + role) and the **project** level (a user can be editor on one project, viewer on another). [[WorkOS]](https://workos.com/blog/user-management-for-b2b-saas) Least-privilege defaults; the nine lanes mapped to coherent permission sets; **external/guest access** that is time-boxed and expires automatically (the Entra model: invite a guest, set a 180-day expiry, access auto-removed if not renewed [[Microsoft]](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-external-users)); and a controlled, audited **delegation/impersonation** path for support and admin. This ties directly to the platform's human-in-the-loop reviewer and admin roles in [`code-ingestion-hitl.md`](../../docs/code-ingestion-hitl.md) — a reviewer who can promote knowledge from `review` to `published` is a privileged role that must itself be scoped and audited.

**(c) Current state vs gap.** This is the second quiet strength. The migration `20260528_lanes_lens_permission_matrix.sql` introduces exactly the right primitives: a `lanes` table (the **9 canonical lanes**, seeded), `project_lane_memberships` mapping `(project_id, user_id) → lane`, and a `lens_permission_matrix` holding the full **9 lanes × 11 data categories × 6 actions = 594-cell grid** with an explicit **absence-is-deny** convention (a `(lane, data_category, action)` triple is permitted only if a `permitted=TRUE` row exists; anything else is a hard deny). The multi-lane strategy brief defines the lane-admin model (default admin = the GC), per-person lens customization, and revoke-at-any-time. So **project-scoped, lane-based RBAC is designed and partly shipped.** The **gaps**: (1) there is no separate clean **org-level** role layer above the project lanes (org-admin vs project-member), which enterprise buyers expect for "manage all our projects from one console"; (2) `project_id` is a bare text identifier with no foreign key, and the demo allowlist is still wired into ownership checks — fine for a demo, not for tenancy; (3) **guest-access expiry** is not yet automatic; and (4) **delegation/impersonation** for support is not yet a defined, audited path. The matrix is the right backbone; it needs the org tier and the lifecycle controls on top.

**(d) Phase.** **Phase 2** for the org-tier + project-lane model and least-privilege defaults (it is part of the multi-tenant gate). **Advanced RBAC — guest expiry, audited impersonation, fine-grained lens editing — in Phase 3.** P0.

---

### 5. Security — encryption, key management, pen testing, secrets, backup/DR — *P0 · Phase 2 (hygiene) → Phase 4 (full DR)*

**(a) Why a large GC needs it.** The GC's security review will ask the standard battery: is data encrypted at rest and in transit, who holds the keys, when did you last run a penetration test, how do you handle vulnerabilities and secrets, and what is your backup and disaster-recovery posture. These are table-stakes questions; failing them ends the review.

**(b) What enterprise-ready looks like.** TLS in transit and encryption at rest (provided by the managed Postgres platform, stated explicitly); documented key management; a recurring third-party **penetration test** and a vulnerability-management process; disciplined **secrets handling**; and a backup/DR plan with stated **RTO and RPO**. Backups should follow the 3-2-1 rule (three copies, two media, one offsite); for mission-critical systems a "good" target is **RTO under 4 hours and RPO under 1 hour**, with near-zero RPO the aspiration for a record of truth. [[Hexnode]](https://www.hexnode.com/blogs/disaster-recovery-specs-rto-rpo-for-the-enterprise/) [[Phoenix Strategy]](https://www.phoenixstrategy.group/blog/disaster-recovery-for-saas-companies-guide) Crucially, you cannot promise an availability or recovery number your dependencies cannot support. [[dev.to]](https://dev.to/anderson_leite/your-sla-maybe-is-a-lie-why-most-companies-get-rto-rpo-and-service-level-agreements-wrong-229c)

**(c) Current state vs gap.** Encryption at rest and in transit comes with managed Supabase Postgres and Vercel, which is a reasonable baseline to state. The team has a **hard-won secrets lesson on record**: a prior session stored a GitHub PAT in a way that risked exposure, and the lessons file and CLAUDE.md now treat tokens with care — this is exactly the muscle a buyer wants to see, but it must be formalized into a documented secrets policy (rotation, no tokens in URLs or logs, scoped service keys). The RLS work shows the service-role-key pattern is understood. The **gaps**: no third-party **pen test** on record; no formal **vulnerability-management** or secrets-rotation policy documented; and **backup/DR with explicit RTO/RPO is undefined** — Supabase provides automated backups on paid tiers, but the platform has not stated its own targets, tested a restore, or written a runbook. The shared-instance posture (requirement 1) also complicates DR: a restore today would restore *all* gardens together.

**(d) Phase.** **Encryption baseline + secrets policy + vulnerability hygiene in Phase 2** (cheap, mostly documentation and discipline on top of the managed platform). **Pen test in Phase 3** (alongside SOC 2, which expects one). **Full DR with tested restore and stated RTO/RPO in Phase 4** (the reliability proof). P0 overall, sequenced.

---

### 6. Data residency, sovereignty & compliance certifications — *P1 · Phase 3*

**(a) Why a large GC needs it.** Most enterprise buyers now require a **SOC 2 Type II** report before signing, and many — especially those with European ties or Fortune-500 procurement — require **ISO 27001**; in 2025–2026 ISO 27001 is frequently the first checkbox a procurement team looks for. [[Zylo]](https://zylo.com/blog/saas-compliance-checklist) [[SSOJet]](https://ssojet.com/blog/sso-compliance-requirements-compared-soc-2-iso-27001-hipaa-pci-dss-and-gdpr) A large GC's vendor-risk team treats a missing SOC 2 as a hard stop, or at best a time-boxed exception with a remediation deadline. Data residency matters where the GC or its clients require US (or specific-region) hosting.

**(b) What enterprise-ready looks like.** A **SOC 2 Type II** report available under NDA; **ISO 27001** certification for buyers who require it; **GDPR/CCPA** posture for personal data (the platform already enforces a UUID-not-email PII rule in analytics, which helps); and a clear statement of **where data is hosted** with the ability to keep US data in the US. For GCs doing **federal/Department of Defense** work, **CMMC** becomes relevant: as of the final rule effective **November 10, 2025**, contractors that process, store, or transmit Controlled Unclassified Information — which explicitly includes drawings and specifications for military-base construction — need at least **CMMC Level 2** (110 practices aligned to **NIST SP 800-171**), with FedRAMP-authorized hosting expected for the systems that hold that data. [[Fox Rothschild]](https://governmentcontracts.foxrothschild.com/2025/09/articles/general-federal-government-contracts-news-updates/final-cmmc-rule-effective-nov-10-2025-what-federal-contractors-need-to-know/) [[Procore]](https://www.procore.com/library/cmmc-contractor-data-requirements) [[NASBP]](https://www.nasbp.org/post/cmmc-primer-for-the-construction-industry/)

**(c) Current state vs gap.** No certifications today — no SOC 2, no ISO 27001 — and that is expected for a product at this stage. Supabase and Vercel carry their own SOC 2 at the platform layer, which the platform can *inherit partial credit* from but cannot claim as its own. Data residency is whatever region the single shared instance sits in, undocumented. CMMC is **out of scope for the beachhead** — the constitution's coverage is "lean residential / light-commercial California" (decision #10), which is private work, not federal CUI. CMMC is flagged here only so that when the GC pipeline includes a federal/DoD builder, the team knows it is a separate, heavier track (FedRAMP hosting, NIST 800-171), not a checkbox.

**(d) Phase.** **Phase 3** (the enterprise-ready gate explicitly includes "security holds under their load," and SOC 2 is the artifact that proves it to procurement). Begin the SOC 2 Type II observation window early in Phase 3 since it takes months of evidence. ISO 27001 follows for buyers who need it. CMMC only if and when a federal GC enters the pipeline. P1 — a strong gate that converts pilots into rollouts, but a friendly first GC will often pilot under NDA with a SOC 2 *in progress*.

---

### 7. Performance, concurrency & reliability — *P1 · Phase 4 (single-project performance is Phase 1/2; scale is Phase 4)*

**(a) Why a large GC needs it.** A large GC has many projects and many simultaneous users — PMs, field crews, subs, the owner — often on the same project at once, working with large documents (full plan sets, drawing packages, photo libraries). If the product is slow, drops edits under concurrency, or chokes on a real planset, it cannot be the daily record. The strategy doc's "bulletproof" bar is explicit: the loop works *every single time*, with no hydration errors, no auth hangs, no data drift.

**(b) What enterprise-ready looks like.** A stated **uptime SLA** (a common enterprise floor is **99.9%**, ~8.8 hours of downtime a year; premium tiers reach 99.99%, with the caveat that you cannot exceed your dependencies' availability [[CIT]](https://www.citsolutions.net/the-price-of-downtime-calculating-your-rtos-rpos/) [[dev.to]](https://dev.to/anderson_leite/your-sla-maybe-is-a-lie-why-most-companies-get-rto-rpo-and-service-level-agreements-wrong-229c)); tested **concurrent-user** capacity; large-document handling and, where promised, real-time collaboration; and **search at scale** over the knowledge base — including vector/embedding search over `knowledge_entities`, which must stay fast as the table grows. The schema notes already flag the concern: the `/admin/verify` queue uses a *partial* index because a full-table scan "would be unbearable once the table grows past ~20k rows."

**(c) Current state vs gap.** Single-project performance is the subject of **Phase 1** (bulletproof the loop) and is partly addressed — but the known issues are real and on record: the Killer App layout's **Total Blocking Time is ~2,250 ms** (flagged as a post-demo refactor in `in-flight.md`), local `node_modules` have repeatedly wedged builds, and `audit_log` write volume is projected at **300–1,500 rows/min during active budget editing** per the schema notes, which is fine with monthly partitions but needs load validation. There is **no published SLA, no concurrency load test, and no scale test of vector search** over `knowledge_entities` (~2,256 rows in the verify queue today, designed to grow well past 20k). Real-time multi-user collaboration on a single project is not yet proven.

**(d) Phase.** Single-project reliability is **Phase 1/2**; **multi-project scale, concurrency, large-planset handling, vector-search-at-scale, and a published SLA are Phase 4** (the investment-ready proof, "reliability holds under load," "on a dashboard"). P1 — a large GC will pilot on one project at Phase 3 reliability, but will not roll out across its portfolio until the scale numbers exist.

---

### 8. Integrations — the GC ecosystem, API/MCP lane, no lock-in — *P1 · Phase 3 (core) → Phase 4 (marketplace)*

**(a) Why a large GC needs it.** A large GC already runs a stack — often **Procore** or **Autodesk Construction Cloud** for project management and BIM, plus **Sage**, **Viewpoint/Trimble**, or **QuickBooks** for accounting. To be the system of record without being a silo, the platform has to exchange data with that stack. Procore alone offers **300+ marketplace integrations** and connects to 500+ tools; the GC expects its tools to interoperate, including bidirectional sync of files, RFIs, submittals, and other document types between platforms. [[Procore Partners]](https://www.procore.com/partners) [[Autodesk]](https://construction.autodesk.com/workflows/construction-software-integrations/) Equally important is the inverse promise: **no lock-in.** A buyer trusting you with thirteen years of records must be able to get them *out*.

**(b) What enterprise-ready looks like.** A documented **public API** (the platform is already API-first per decision #14-adjacent principle "every feature is an endpoint before a UI") and **webhooks** for events; a clean **MCP lane** for the Robots/AI Agents lane (lane 9 in decision #16); first-class **import/export** so a GC can leave with its data; and at least a starter set of named connectors to the GC stack (an accounting connector — QuickBooks or Sage — and a Procore or ACC document bridge are the two highest-value first connectors).

**(c) Current state vs gap.** The platform is **genuinely API-first** — there is a versioned `/api/v1/*` surface, an OpenAPI spec, and an **MCP route** (`/api/v1/mcp/route.ts`) that already speaks the agent lane, which is ahead of most competitors on lane 9. The constitution's "all features emit events" principle and the wired PostHog server events (`signature_sent`, `change_order_signed`, `sub_bid_submitted`, `signup_completed`) are the seed of a webhook story. The **gaps**: no published, documented *public* API for customers (the endpoints exist but aren't a product surface with auth, rate limits, and docs); no customer-facing **webhooks**; no **Procore/ACC/QuickBooks/Sage connectors**; and no first-class **bulk export**. The MCP lane is a real differentiator to lean on.

**(d) Phase.** **Public API + webhooks + a first accounting connector + export in Phase 3** (enterprise-ready). **Broader connector set and an integration marketplace in Phase 4.** P1 — a single GC can pilot without connectors, but the export/no-lock-in guarantee is closer to P0 for the *record-of-truth* promise and should be in Phase 3.

---

### 9. E-signature & contracts — *P0 (mechanism) · Phase 3 · templates gated to legal review*

**(a) Why a large GC needs it.** Change orders and pay applications are the lifeblood of a project, and they get signed. A GC running the project as its record needs to sign its own documents in the platform and have those signatures hold up. Both the **ESIGN Act** and **UETA** give electronic signatures the same legal weight as wet ink when four conditions are met — intent to sign, consent to do business electronically, association of the signature with the record, and record retention — and a defensible e-signature carries a **tamper-evident audit trail** (signer identity, timestamps, IP) with the final document protected against modification. [[Juro]](https://juro.com/learn/esign-act-ueta) [[eSignGlobal]](https://www.esignglobal.com/blog/legal-requirements-electronic-signature-audit-trails)

**(b) What enterprise-ready looks like.** A signing flow that captures intent and consent; a **tamper-evident** completed document plus a chronological audit trail; sequential or parallel signer ordering; and retention of the signed artifact for the legal period. The platform's own constitution (decision #11) draws the right line: the **signing mechanism** — the GC signs the GC's *own* documents — ships now; **platform-authored contract templates wait for legal review** before the first paid sale.

**(c) Current state vs gap.** This is well underway. There is a `signed_documents` table and a `signature_events` table, **both under the `audit_trigger_fn`**; the observability doc shows live `signature_sent` and `change_order_signed` events with a `provider` field (`documenso | in_app`) and a signing `method` (`typed | drawn | documenso`), and there is an in-flight **contracts / tamper-evident signing service** worktree (`feat/contracts-signing`). So the mechanism, multi-leg signing, and the audit trail are real and progressing. The **gaps**: the tamper-evidence guarantee (a cryptographic seal on the final artifact, not just a database row) needs to be explicit and provable; the ESIGN/UETA consent-and-intent capture should be confirmed in the flow; and per decision #11, **no platform contract templates ship** until legal review — the mechanism is decoupled from the template library, which is correct.

**(d) Phase.** **Phase 3** (enterprise-ready; the strategy doc lists "the e-signature mechanism" explicitly in Phase 3). Mechanism is P0 within that phase; templates remain gated indefinitely until legal sign-off.

---

### 10. Governance & admin — tenant admin console, seat/usage, retention, approval workflows — *P1 · Phase 3*

**(a) Why a large GC needs it.** A large GC's IT or operations lead needs to administer the account without filing a support ticket for every change: add and remove users, see and manage seats, set retention, and configure who approves what. Clear seat definition is also a commercial necessity — ambiguity creates support burden and revenue leakage. [[Rework]](https://resources.rework.com/libraries/saas-growth/seat-based-pricing)

**(b) What enterprise-ready looks like.** A **tenant/org admin console**: user and role management across all the org's projects, **seat and usage** visibility, configurable **retention policies** (within the legal floor), and **configurable approval workflows** — which connects straight to the human-in-the-loop model in [`code-ingestion-hitl.md`](../../docs/code-ingestion-hitl.md), where an admin defines who reviews and promotes content from `review` to `published`.

**(c) Current state vs gap.** The building blocks exist — `organizations`, `org_members`, invite/accept routes, the lane/permission matrix, an `/admin/verify` queue, and an `/admin/healthcheck` page — but there is **no unified tenant-admin console** a GC's own admin could use to self-manage seats, roles, retention, and approvals. Today administration is largely founder/operator-side. Seat management ties to the existing Stripe subscription plumbing but is not surfaced as an org-admin capability.

**(d) Phase.** **Phase 3** (enterprise-ready; "onboarding + support" and roles/permissions are Phase 3 in the strategy doc, and the admin console is where a buyer's admin operates). P1.

---

### 11. Observability & support — logging, metrics, tracing, status page, support SLAs — *P1 · Phase 3 (support) → Phase 4 (status page + RSI dashboard)*

**(a) Why a large GC needs it.** When the system of record has a problem, the GC needs to know — and needs to know the vendor already knows and is acting. Enterprise buyers expect a **status page**, defined **support SLAs** (response and resolution times by severity), and evidence that the vendor instruments its own system.

**(b) What enterprise-ready looks like.** Centralized **logging, metrics, and tracing**; a public **status page** with incident history; **support SLAs** tied to severity; and internal health/drift monitoring so regressions are caught before customers report them.

**(c) Current state vs gap.** Strong seed, more to do. **Sentry** (errors + performance) and **PostHog** (product analytics) are wired with graceful no-op fallbacks and a strict **UUID-not-email PII rule**, and there is an `/admin/healthcheck` endpoint. The in-flight **RSI heartbeat** worktree (`feat/rsi-heartbeat`) is the observability/drift mechanism — exactly the "is the system behaving" signal the constitution's decision #15 calls for, and a genuine differentiator if it surfaces on a dashboard (which is literally the Phase 4 gate: "the proof investors asked for is real and on a dashboard"). The **gaps**: no customer-facing **status page**; no published **support SLAs**; no distributed **tracing** beyond Sentry performance; and the RSI heartbeat is in flight, not yet a steady dashboard.

**(d) Phase.** **Support SLAs + status page in Phase 3**; **the RSI heartbeat/observability dashboard matures in Phase 4** as part of the investment-ready proof. P1.

---

## Ranked summary

Priority answers "does this gate the deal." Phase answers "when do we deliver it," anchored to the strategy doc's existing ladder. Effort/Risk is a rough founder-facing read.

| # | Requirement | Priority | Phase | Effort / risk note |
|---|---|---|---|---|
| 1 | **Multi-tenant isolation** (dedicated Builder's boundary, org-scoped RLS, isolation tests) | **P0** | **2** | High effort, high risk. The biggest gap. Shared instance runs foreign-garden + `knex` code; only 7 of 21 tables locked. Needs a real tenancy model, not the demo allowlist. |
| 2 | **Audit & traceability** (immutable spine built; + scoped export, legal hold) | **P0** | **2** spine / **3** export+hold | Low–medium. Spine is already strong (partitioned 7-yr `audit_log`, 12 triggers, leaf-RLS). Add tenant-read policy, export, and a hold flag that overrides retention. |
| 3 | **SSO** (SAML 2.0 / OIDC federation, MFA) | **P0** | **2** | Medium. Org model exists to attach to; Supabase Auth supports SAML on paid tiers. No federation wired yet. |
| 3b | **SCIM** provisioning / deprovisioning | **P1** | **3** | Medium. Accompanies SSO; deprovisioning is the security team's priority. Pilots tolerate manual provisioning. |
| 4 | **RBAC** (org tier + project lanes, least privilege, guest expiry, audited impersonation) | **P0** | **2** core / **3** advanced | Medium. 594-cell lane matrix + absence-is-deny already shipped. Add the org tier, real `project_id` FKs, guest expiry, impersonation. |
| 5 | **Security hygiene + backup/DR** (encryption inherited, secrets policy, vuln mgmt, pen test, RTO/RPO) | **P0** | **2** hygiene / **3** pen test / **4** full DR | Medium–high. Encryption inherited. Token-in-URL lesson learned — formalize it. DR untested and complicated by the shared instance. |
| 6 | **Compliance certifications & residency** (SOC 2 Type II, ISO 27001, GDPR/CCPA; CMMC only if federal) | **P1** | **3** | High effort, long lead. SOC 2 observation window takes months — start early in Phase 3. CMMC is a separate heavy track, out of beachhead scope. |
| 7 | **Performance, concurrency & reliability** (SLA, concurrent users, large plansets, vector-search-at-scale) | **P1** | **1/2** single-project / **4** scale | Medium–high. TBT ~2,250 ms flagged; verify-queue index already tuned for growth. No SLA or load test yet. |
| 8 | **Integrations** (public API partly there, webhooks, Procore/ACC/QuickBooks/Sage, MCP lane built, export) | **P1** (export nearer P0) | **3** core / **4** marketplace | Medium. API-first + MCP lane are real strengths. No customer API product, webhooks, or connectors yet. Export is closer to P0 for no-lock-in. |
| 9 | **E-signature mechanism** (tamper-evident, ESIGN/UETA, multi-leg) — *templates gated* | **P0** | **3** | Medium. `signed_documents`/`signature_events` audited; `feat/contracts-signing` in flight. Make tamper-evidence cryptographic. Templates wait for legal (decision #11). |
| 10 | **Governance & admin console** (seats, roles, retention, approval workflows) | **P1** | **3** | Medium. Org tables, lane matrix, `/admin/*` pages exist; no unified self-serve tenant-admin console yet. |
| 11 | **Observability & support** (logging/metrics/tracing, status page, support SLAs, RSI dashboard) | **P1** | **3** support / **4** dashboard | Low–medium. Sentry + PostHog + healthcheck wired; RSI heartbeat in flight. No status page or support SLAs yet. |

---

## The phases, as narratives

### Phase 2 — Generalize & multi-tenant: *earn the right to hold two customers' data*

**Theme:** the foundations that make "system of record" structurally true rather than aspirational. Phase 2's gate already says it — a new GC creates their own job, the loop works, and *two tenants cannot see each other's data.* Everything here serves that.

**What lands here:** **multi-tenant isolation (req 1)** — the keystone — moving Builder's onto a dedicated tenant boundary away from the other-garden and `knex` data, with `org_id`-scoped RLS on every system-of-record table and an isolation test suite that specifically hunts the silent RLS failure modes; the **audit spine (req 2)** extended to every new record table with a tenant-scoped read policy; **SSO foundations (req 3)** so the first enterprise GC federates to its IdP; the **org + project-lane RBAC core (req 4)** built on the existing 594-cell matrix, adding the org tier and replacing the demo allowlist with a real tenancy model; and **security hygiene (req 5)** — a written secrets policy (formalizing the token-in-URL lesson), encryption stated, basic vulnerability discipline. This is the phase that converts the demo's clever affordances into an actual multi-customer product.

### Phase 3 — Enterprise-ready: *pass the security review and run a real project for a big developer*

**Theme:** everything a large GC's procurement, security, and legal teams check before a real rollout. The gate: a large developer runs a real project and security/reliability hold under their load.

**What lands here:** **compliance certifications (req 6)** — start the **SOC 2 Type II** observation window early because it takes months, then ISO 27001 for buyers who need it, with data-residency documented; **SCIM, MFA enforcement, and advanced RBAC (reqs 3b, 4)** — guest-access expiry, audited impersonation, finer lens control; **audit export and legal hold (req 2)** so auditors and counsel can be served and held records survive retention; the **e-signature mechanism (req 9)** hardened to cryptographic tamper-evidence with ESIGN/UETA capture (templates still gated to legal per decision #11); **integrations (req 8)** — a documented public API, customer webhooks, a first accounting connector, and first-class export so the no-lock-in promise is real; a **pen test (req 5)**; the **tenant-admin console (req 10)**; and **support SLAs + a status page (req 11)**. This is the phase that turns a friendly pilot into a signed enterprise rollout.

### Phase 4 — Investment-ready proof: *show it scales, recovers, and is operated like infrastructure*

**Theme:** the numbers and the resilience that prove the engine is real — for the GC's portfolio rollout and for the investors the strategy doc says are already circling. The gate: the proof is real and on a dashboard.

**What lands here:** **performance, concurrency, and scale (req 7)** — a published uptime SLA (99.9% floor, honest about dependency ceilings), concurrency load tests, large-planset handling, real-time collaboration where promised, and **vector/embedding search proven at scale** over a `knowledge_entities` table grown well past today's size; **full disaster recovery (req 5)** — a tested restore with stated RTO/RPO (target RTO < 4h, RPO < 1h), made coherent by the Phase 2 tenant separation so Builder's can be recovered independently; the **integration marketplace (req 8)** widening the connector set; and the **RSI heartbeat matured into a steady observability/drift dashboard (req 11)** — which doubles as the investor-facing proof and as the data collection the constitution's RSI loop is built on. This is the phase where "it scales" stops being a claim and becomes a chart.

---

## Closing read for the founder

Three honest sentences to carry out of this. **First:** the system-of-record *spine* — immutable partitioned audit, a real permission grid, the org primitives, an audited signing path, PII-disciplined observability — is further along than the platform gets credit for, and that is a genuine asset to lead with in a security conversation. **Second:** the one thing that most stands between this and a large-GC signature is **tenant isolation on the shared database** — that is the P0 keystone, it is Phase 2, and a buyer's security team *will* ask what else runs in the database that holds their projects. **Third:** the certifications (SOC 2 especially) are the slow long-pole — they gate the *rollout*, not the *pilot*, but the clock on the observation window should start the day Phase 3 opens, not the day a buyer asks.

This brief is a draft for founder review and changes nothing in the repo, the database, or the deploy. It plugs into [`STRATEGY-bulletproof-and-scale.md`](../../docs/STRATEGY-bulletproof-and-scale.md) and is governed by [`PLATFORM-CONSTITUTION.md`](../../docs/PLATFORM-CONSTITUTION.md).

---

## Open questions for the founder

1. **Tenant boundary shape.** Do we separate Builder's onto its own Postgres instance (hard isolation, cleaner DR, more ops), or stay shared-instance with rigorous `org_id` RLS plus an isolation test suite (cheaper, but the "what else is in the DB" answer stays awkward)? This decision shapes Phase 2 and Phase 4-DR.
2. **SSO timing.** Confirm pulling SSO foundations into Phase 2 (vs the strategy doc's Phase 3 placement). A GC security questionnaire usually asks for it before a second project lands.
3. **SOC 2 vs ISO 27001 first.** Which does the actual incoming developer pipeline ask for? North-American GCs lean SOC 2; if the introductions skew toward firms with European ties, ISO 27001 may come first.
4. **Federal/DoD in the pipeline?** If any incoming developer does federal work, CMMC + FedRAMP is a separate, heavy track that contradicts the "lean residential/light-commercial CA" coverage in decision #10 — worth knowing before it surprises us.
5. **`code-ingestion-hitl.md` status.** The constitution forward-references this spec and the `/admin/verify` queue implements much of it, but the doc itself isn't in the repo yet. Worth writing it down so the reviewer/admin roles in requirement 4 have a canonical home.
6. **Export-as-P0?** For a true record-of-truth promise, "you can get all your data out" arguably belongs at P0, not P1. Confirm whether bulk export ships in Phase 3 alongside the API.

---

## Sources

**Internal (this repo, read-only):** [`PLATFORM-CONSTITUTION.md`](../../docs/PLATFORM-CONSTITUTION.md) · [`STRATEGY-bulletproof-and-scale.md`](../../docs/STRATEGY-bulletproof-and-scale.md) · [`code-ingestion-hitl.md`](../../docs/code-ingestion-hitl.md) (forward-referenced spec) · [`SCHEMA.md`](../../docs/SCHEMA.md) (partitioned `audit_log`, 7-year retention, 12 triggers) · [`OBSERVABILITY.md`](../../docs/OBSERVABILITY.md) (Sentry/PostHog, PII rule) · [`multi-lane-strategy-brief.md`](../../docs/multi-lane-strategy-brief.md) (lanes × lenses, permission matrix) · `supabase/migrations/20260531_rls_group_a_lockdown.sql` · `supabase/migrations/20260528_lanes_lens_permission_matrix.sql` · `supabase/migrations/20260524_knowledge_entities_manual_attestation.sql` · `supabase/migrations/20260525_knowledge_entities_auto_verification.sql` · `docs/in-flight.md` · `tasks.lessons.md`.

**External (web research):**
- [The Essential SaaS Compliance Checklist — Zylo](https://zylo.com/blog/saas-compliance-checklist)
- [The Guide to Becoming Enterprise-Ready for SaaS — WorkOS](https://workos.com/guide/the-guide-to-becoming-enterprise-ready-for-saas-product-managers)
- [The complete guide to user management for B2B SaaS — WorkOS](https://workos.com/blog/user-management-for-b2b-saas)
- [11 SSO Compliance Requirements Compared — SSOJet](https://ssojet.com/blog/sso-compliance-requirements-compared-soc-2-iso-27001-hipaa-pci-dss-and-gdpr)
- [Enterprise SSO Requirements Checklist — SSOJet](https://ssojet.com/white-papers/enterprise-sso-requirements-checklist/)
- [Multi-tenant data isolation with PostgreSQL Row Level Security — AWS](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/)
- [Achieving Robust Multi-Tenant Data Isolation with PostgreSQL RLS — Leapcell](https://leapcell.io/blog/achieving-robust-multi-tenant-data-isolation-with-postgresql-row-level-security)
- [Mastering PostgreSQL RLS for Rock-Solid Multi-Tenancy — Rico Fritzsche](https://ricofritzsche.me/mastering-postgresql-row-level-security-rls-for-rock-solid-multi-tenancy/)
- [Multi-Tenant Leakage: When "Row-Level Security" Fails in SaaS — InstaTunnel](https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c)
- [Electronic signature law in the US: ESIGN Act and UETA — Juro](https://juro.com/learn/esign-act-ueta)
- [Electronic signature audit trail requirements — eSignGlobal](https://www.esignglobal.com/blog/legal-requirements-electronic-signature-audit-trails)
- [Disaster Recovery Specs: RTO/RPO for the Enterprise — Hexnode](https://www.hexnode.com/blogs/disaster-recovery-specs-rto-rpo-for-the-enterprise/)
- [Disaster Recovery for SaaS Companies: Guide — Phoenix Strategy Group](https://www.phoenixstrategy.group/blog/disaster-recovery-for-saas-companies-guide)
- [Why most companies get RTO, RPO and SLAs wrong — dev.to](https://dev.to/anderson_leite/your-sla-maybe-is-a-lie-why-most-companies-get-rto-rpo-and-service-level-agreements-wrong-229c)
- [The Price of Downtime: Calculating Your RTOs & RPOs — CIT](https://www.citsolutions.net/the-price-of-downtime-calculating-your-rtos-rpos/)
- [Record Retention 101 for Contractors — Contractor Magazine](https://www.contractormag.com/management/best-practices/article/21126514/record-retention-101-for-contractors)
- [Document Retention Guidelines (White Paper) — NSPE](https://www.nspe.org/sites/default/files/resources/pdfs/liability/White%20Paper-060916DocumentRetentionDocument-FINAL.pdf)
- [Subpart 4.7 — Contractor Records Retention — Acquisition.gov](https://www.acquisition.gov/far/subpart-4.7)
- [Government contract record retention: FAR compliance and audit readiness — RSM](https://rsmus.com/insights/industries/government-contracting/government-contract-record-retention.html)
- [Final CMMC Rule Effective Nov 10, 2025 — Fox Rothschild](https://governmentcontracts.foxrothschild.com/2025/09/articles/general-federal-government-contracts-news-updates/final-cmmc-rule-effective-nov-10-2025-what-federal-contractors-need-to-know/)
- [CMMC: Contractor Data Requirements on DoD Projects — Procore](https://www.procore.com/library/cmmc-contractor-data-requirements)
- [CMMC Primer for the Construction Industry — NASBP](https://www.nasbp.org/post/cmmc-primer-for-the-construction-industry/)
- [Build better with Procore Partners — Procore](https://www.procore.com/partners)
- [Autodesk AECO Technology Partner Ecosystem — Autodesk](https://construction.autodesk.com/workflows/construction-software-integrations/)
- [10 RBAC Best Practices You Should Know — Oso](https://www.osohq.com/learn/rbac-best-practices)
- [Govern access for external users in entitlement management — Microsoft Entra](https://learn.microsoft.com/en-us/entra/id-governance/entitlement-management-external-users)
- [Seat-Based Pricing: The Classic Per-User Revenue Model — Rework](https://resources.rework.com/libraries/saas-growth/seat-based-pricing)

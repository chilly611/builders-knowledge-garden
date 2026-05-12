# Stream C — Machine-Readable CRM Surface

> Stream C of the BKG CRM deep-research sprint. Sister streams: A (human-facing surfaces & primitives), B (data model & lifecycle). This stream answers: **what does it mean for a CRM to be machine-legible by default — not API-bolted?**

## Executive summary

**The single biggest gap in existing CRM MCP servers (for contractors).** Every CRM MCP we audited (HubSpot, Salesforce, Attio, Pipedrive, Folk, Twenty, JobNimbus) is structurally a *thin tool-wrap of an existing REST API*. They expose what the human UI was built around — `contacts`, `companies`, `deals`, `tickets`, `notes` — flattened into `search_records` / `create_record` / `update_record` calls. None of them are aware of (a) the contractor 7-stage lifecycle, (b) lane (GC vs. specialty vs. homeowner), (c) emotional/voice-note context, (d) the "who's asking and what do I know about them" framing. They give an agent CRUD over rows; they do not give an agent enough semantic context to *reason as a teammate*. The contractor MCP gap is not "more tools" — it is **lifecycle-aware, lane-aware, voice-native, audit-rich primitives**.

**The three design moves that make BKG's CRM API a first-class surface.**
1. **One canonical record, two renderings.** `bkg_contact` and `bkg_deal` are JSON-LD documents grounded in schema.org with BKG extensions. The mobile UI is one render; the MCP tool response is another. There is no "API layer wrapping the database" — the database emits JSON-LD shapes natively and the UI projects from them.
2. **Every primitive is a tool.** Invitation Card, Whisper, Time Machine, Ask Anything, Pro Toggle, Progressive Reveal, Emotional Arc — each is exposed as an MCP tool with the same human-label + pro-label + lane-relevance metadata it carries in the UI. Agents and humans see the same primitives.
3. **Events, not endpoints, drive the agent loop.** Thirty-one typed lifecycle events (`lead.created` → `repeat.opportunity_detected`) are the substrate; tools are how an agent *responds* to events, not how it polls for state. Every event carries an `idempotency_key`, a `correlation_id`, and a `time_machine_handle` so any agent action is undoable.

**The shape of `bkg_contact` and `bkg_deal` in one sentence each.** `bkg_contact` is a schema.org `Person` with embedded `ContactPoint[]`, optional `Place` (job site), inferred `Service` interest, and a BKG extension block carrying `lane`, `lifecycle_stage`, `last_touch`, `whisper_summary`, and `consent` flags. `bkg_deal` is a schema.org `Project` (not `Offer` — see C3) wrapped around a `Person` prospect, a `Place` job site, a structured `lifecycle_stage` machine, an `amount` block with confidence, and an `audit_trail` of who/what wrote which field when — including agents.

---

## C1. Existing CRM MCP servers — audit

This section catalogs CRM MCP servers that exist in the wild as of May 2026. For each: repo URL, maintainer, tool surface, contact JSON shape (where determinable from public docs), and the contractor-gap.

### C1.1 HubSpot — official remote MCP server

- **Repo / endpoint:** [developers.hubspot.com/mcp](https://developers.hubspot.com/mcp) (hosted, OAuth 2.1 + PKCE). Also: [`@hubspot/mcp-server`](https://www.npmjs.com/package/@hubspot/mcp-server) on npm.
- **Maintainer:** HubSpot Inc. (GA April 13, 2026, per [HubSpot changelog](https://developers.hubspot.com/changelog/remote-hubspot-mcp-server-is-now-generally-available)).
- **Tools exposed (broad categories, not exhaustive):**
  - CRM read/write: `crm.contacts.{list,get,create,update,delete,search}`, `crm.companies.*`, `crm.deals.*`, `crm.tickets.*`, `crm.line_items.*`, `crm.products.*`, `crm.quotes.*`, `crm.invoices.*`, `crm.orders.*`, `crm.carts.*`, `crm.subscriptions.*`, `crm.users.*`, `crm.segments.*`
  - Activities: `engagements.{calls,emails,meetings,notes,tasks}.{list,create,...}`
  - Content read-only: `cms.{blog_posts,landing_pages,site_pages}.list`, `marketing.campaigns.list`, `marketing.events.list`
- **Contact JSON shape (sample, simplified):**
  ```json
  {
    "id": "12345",
    "properties": {
      "firstname": "Jane",
      "lastname": "Cruz",
      "email": "jane@example.com",
      "phone": "+15551234567",
      "lifecyclestage": "lead",
      "hs_object_id": "12345",
      "createdate": "2026-05-01T18:22:00Z"
    },
    "associations": {"companies": [{"id": "67890"}]},
    "archived": false
  }
  ```
- **What's missing for a contractor:** Lifecycle stage is a single string field — no notion of *Size Up → Lock → Plan → Build → Adapt → Collect*. No `lane` (GC vs. specialty vs. homeowner). No voice-note primitive (voice memos become "notes" with an attachment, losing transcription + emotional arc data). No site `Place`. No "is this job worth bidding on?" scoring primitive — agents have to assemble it from properties.

### C1.2 Salesforce — official + community

- **Official:** [`salesforcecli/mcp`](https://github.com/salesforcecli/mcp) (the DX MCP, 60+ tools across Aura migration, code analysis, LWC, data ops, DevOps Center). Per [Salesforce dev blog](https://developer.salesforce.com/blogs/2025/06/introducing-mcp-support-across-salesforce) and [the forcedotcom/mcp-hosted wiki](https://github.com/forcedotcom/mcp-hosted/wiki/Available-Tools-and-Servers).
- **Community standouts:**
  - [`KirtiJha/salesforce-mcp-server`](https://github.com/KirtiJha/salesforce-mcp-server) — 59 tools covering data ops + DevOps workflows.
  - [`tsmztech/mcp-server-salesforce`](https://github.com/tsmztech/mcp-server-salesforce) — focused on object/field management, SOQL queries, Apex.
  - [`advancedcommunities/salesforce-mcp-server`](https://github.com/advancedcommunities/salesforce-mcp-server) — Apex execution, SOQL, metadata management.
- **Tool categories:** Object/field management, smart object search, schema introspection, SOQL queries, data manipulation (CRUD on `Account`, `Contact`, `Opportunity`, `Lead`, `Case`), Apex execution, metadata, DevOps Center actions.
- **Contact JSON shape (SObject `Contact`, simplified):**
  ```json
  {
    "attributes": {"type": "Contact", "url": "/services/data/v59.0/sobjects/Contact/003xx..."},
    "Id": "003xx0000004TmiAAE",
    "FirstName": "Jane",
    "LastName": "Cruz",
    "Email": "jane@example.com",
    "Phone": "+15551234567",
    "AccountId": "001xx000003DGb1AAG",
    "LeadSource": "Web"
  }
  ```
- **What's missing for a contractor:** Salesforce is configurable — *technically* you can add lifecycle stages, lanes, etc. as custom fields. But the MCP server treats them as opaque strings. Agents must learn each org's custom schema before they can act, which makes cross-org agent reuse expensive. No emotional context. No voice primitive.

### C1.3 Attio — official hosted + community

- **Official:** Hosted at `https://mcp.attio.com/mcp` (OAuth). Per [docs.attio.com/mcp/overview](https://docs.attio.com/mcp/overview).
- **Community:** [`kesslerio/attio-mcp-server`](https://github.com/kesslerio/attio-mcp-server) (full surface coverage, v1.0.0 with ChatGPT Developer Mode); [`itsbrex/attio-mcp-server`](https://github.com/itsbrex/attio-mcp-server) (Claude Desktop / Cursor focus); [`redriverwest/attio-mcp`](https://github.com/redriverwest/attio-mcp).
- **Tools exposed (per [mcpbundles.com/skills/attio](https://www.mcpbundles.com/skills/attio) — ~60 tools):**
  - `list_objects`, `get_object_details`, `list_attributes`
  - `search_records`, `list_records`, `get_record`, `get_records_by_ids`, `create_record`, `update_record`, `delete_record`
  - `list_lists`, `get_list`, `add_to_list`, `remove_from_list`
  - `create_note`, `list_notes`, `get_note`
  - `list_tasks`, `create_task`, `update_task`
  - `list_workspace_members`, `get_workspace_member`
- **Contact JSON shape (simplified `people` record):**
  ```json
  {
    "id": {"workspace_id": "ws_xxx", "object_id": "people", "record_id": "rec_xxx"},
    "values": {
      "name": [{"first_name": "Jane", "last_name": "Cruz", "full_name": "Jane Cruz"}],
      "email_addresses": [{"email_address": "jane@example.com"}],
      "phone_numbers": [{"original_phone_number": "+15551234567"}],
      "company": [{"target_object": "companies", "target_record_id": "rec_yyy"}]
    },
    "created_at": "2026-05-01T18:22:00Z"
  }
  ```
- **What's missing for a contractor:** Attio is structurally the *closest* model to what BKG wants — strongly-typed attributes, object polymorphism, hosted MCP, OAuth. Still missing: lane, lifecycle as state machine, voice primitive, schema.org grounding, agent audit metadata.

### C1.4 Pipedrive — community-only, no official MCP

- **Community:**
  - [`iamsamuelfraga/mcp-pipedrive`](https://github.com/iamsamuelfraga/mcp-pipedrive) — 100+ tools across 10 categories, multi-level caching, rate-limit handling.
  - [`osherai/pipedrive-mcp-python`](https://github.com/osherai/pipedrive-mcp-python)
  - [`WillDent/pipedrive-mcp-server`](https://github.com/WillDent/pipedrive-mcp-server) — Pipedrive API v2.
  - [`ckalima/pipedrive-mcp-server`](https://github.com/ckalima/pipedrive-mcp-server)
  - [`vaibhavpandeyvpz/pipedriver`](https://github.com/vaibhavpandeyvpz/pipedriver) — exposes deals, persons, organizations, products, activities, pipelines.
  - [`Wirasm/pipedrive-mcp`](https://github.com/Wirasm/pipedrive-mcp) — CRUD via tool calls.
  - [`CDataSoftware/pipedrive-mcp-server-by-cdata`](https://github.com/CDataSoftware/pipedrive-mcp-server-by-cdata) — read-only via JDBC.
- **Tool categories:** Deals (list/get/create/update/delete + change stage, mark won/lost), Persons, Organizations, Activities, Notes, Pipelines (read-only stage taxonomy), Products, Leads, Files, Search.
- **Contact JSON shape (Person, simplified):**
  ```json
  {
    "id": 1,
    "name": "Jane Cruz",
    "first_name": "Jane",
    "last_name": "Cruz",
    "email": [{"value": "jane@example.com", "primary": true, "label": "work"}],
    "phone": [{"value": "+15551234567", "primary": true, "label": "mobile"}],
    "org_id": {"value": 7, "name": "Acme Roofing"},
    "owner_id": {"value": 42}
  }
  ```
- **What's missing:** Pipedrive's pipeline + stage model is closer to "deals through a funnel" than to "jobs through a build lifecycle." Doesn't natively distinguish pre-bid from post-contract from active build. No voice primitive. No lane.

### C1.5 Close — official MCP

- **Official:** Per [close.com/integrations/close-mcp](https://close.com/integrations/close-mcp), Close offers a hosted MCP integration.
- **Repo:** No widely-cited open-source repo as of May 2026; integration is hosted.
- **Tools exposed (inferred from Close API surface):** Lead CRUD, contact CRUD, opportunity CRUD, activity logging (calls, emails, SMS, notes, meetings), tasks, sequences/workflows trigger, search, custom field reads.
- **Contact JSON shape (Lead, simplified — from [developer.close.com](https://developer.close.com/api)):**
  ```json
  {
    "id": "lead_abc123",
    "display_name": "Acme Roofing",
    "contacts": [{
      "id": "cont_xyz789",
      "name": "Jane Cruz",
      "emails": [{"email": "jane@example.com", "type": "office"}],
      "phones": [{"phone": "+15551234567", "type": "office"}]
    }],
    "status_id": "stat_qualified",
    "custom": {"lcf_xxx": "roofing"}
  }
  ```
- **What's missing:** Close is *closest* in spirit to a "sales rep's tool" rather than a record store — heavy on activity logging. Still no lifecycle as state machine, no lane, no voice-first primitive, no schema.org grounding.

### C1.6 Folk — community MCP, comprehensive

- **Community:** [`NimbleBrainInc/mcp-folk`](https://github.com/nimblebraininc/mcp-folk); also hosted via [Apideck](https://www.apideck.com/mcp-server/folk), [Composio](https://composio.dev/toolkits/folk/framework/claude-code), [Zapier MCP](https://zapier.com/mcp/folk).
- **Tools exposed:** Smart Search (people + companies), Two-Phase Lookup (search → fetch detail), Contact Management (create/update/delete people + companies), Notes & Reminders, Interaction Logging (emails, meetings, calls), Group/list management, Custom Fields.
- **Contact JSON shape (Folk Person, from [developer.folk.app](https://developer.folk.app/api-reference/overview)):**
  ```json
  {
    "id": "ppl_abc123",
    "fullName": "Jane Cruz",
    "emails": ["jane@example.com"],
    "phones": ["+15551234567"],
    "companies": [{"id": "cmp_xxx", "name": "Acme Roofing"}],
    "groups": [{"id": "grp_leads", "name": "Hot leads"}],
    "customFields": {}
  }
  ```
- **What's missing:** Folk's "groups" model is lightweight relationship management. Good for a freelancer or studio; thin for a contractor running a 7-stage build lifecycle. No voice primitive, no lane.

### C1.7 Twenty CRM — open-source CRM, multiple community MCPs

- **Community:**
  - [`mhenry3164/twenty-crm-mcp-server`](https://github.com/mhenry3164/twenty-crm-mcp-server) — CRUD + dynamic schema discovery + advanced search.
  - [`jezweb/twenty-mcp`](https://github.com/jezweb/twenty-mcp) — TypeScript, error handling.
  - [`IgorWarzocha/twenty-mcp-server`](https://github.com/IgorWarzocha) — both GraphQL + REST.
  - [`hbergum/twenty-crm-mcp`](https://github.com/hbergum) — FastMCP Python.
- **Tools exposed:** CRUD on people, companies, tasks, notes; dynamic schema introspection; advanced search.
- **Contact JSON shape (Twenty GraphQL `Person`):**
  ```json
  {
    "id": "uuid-...",
    "name": {"firstName": "Jane", "lastName": "Cruz"},
    "email": "jane@example.com",
    "phone": "+15551234567",
    "company": {"id": "uuid-...", "name": "Acme Roofing"},
    "createdAt": "2026-05-01T18:22:00Z"
  }
  ```
- **What's missing:** Twenty is the closest *open-source* parallel to where BKG sits — designed for AI, self-hostable, schema-aware. But still: no lifecycle as state machine, no lane, no voice primitive, no schema.org. Worth watching as a reference architecture.

### C1.8 JobNimbus — contractor CRM, community MCPs

- **Community:**
  - [`clykins90/jobnimbus-mcp-server`](https://github.com/clykins90/jobnimbus-mcp-server)
  - [`benitocabrerar/jobnimbus-mcp-remote`](https://glama.ai/mcp/servers/@benitocabrerar/jobnimbus-mcp-remote) — 48+ tools, zero-storage security.
  - [Composio JobNimbus MCP](https://mcp.composio.dev/jobnimbus) — 21+ tools.
  - [Zapier JobNimbus MCP](https://zapier.com/mcp/jobnimbus).
- **Tools exposed:** Contacts CRUD, Jobs CRUD (the JobNimbus equivalent of "deal/project"), Tasks, Products, Workflows, Invoices, Schedules. Per [getguru reference](https://www.getguru.com/reference/jobnimbus-mcp).
- **Contact JSON shape (JobNimbus Contact, inferred — not officially documented):**
  ```json
  {
    "jnid": "abc123",
    "first_name": "Jane",
    "last_name": "Cruz",
    "email": "jane@example.com",
    "home_phone": "+15551234567",
    "address_line1": "123 Main St",
    "city": "Austin",
    "state": "TX",
    "zip": "78701",
    "status_name": "Lead",
    "source_name": "Referral",
    "record_type_name": "Customer"
  }
  ```
- **What's missing:** Of all the audited CRMs, JobNimbus is the *closest functional analog* to what BKG aims at (it's contractor-native, has photos + voice memos in the UI). But the MCP servers expose it as a thin CRUD layer. There is no MCP tool that says "score this lead for bid risk" or "draft a follow-up appropriate to lane=roofing GC." Lifecycle is a `status_name` string. The contractor-native semantics (lane, emotional arc, voice transcription quality, photo timestamps tied to a job phase) are absent from the agent surface.

### C1.9 Servers searched for but not found (signal)

- **CompanyCam MCP** — *no evidence found* of a CompanyCam MCP server. CompanyCam is the dominant photo-doc tool for contractors; the absence of an MCP is a notable gap.
- **AccuLynx MCP** — *no evidence found.*
- **Buildertrend MCP** — *no evidence found.*
- **CoConstruct MCP** — *no evidence found* (also CoConstruct is now part of Buildertrend).
- **Procore MCP** — *no evidence found* as of May 2026; some unofficial wrappers but no widely-cited MCP repo.
- **ServiceTitan MCP** — *no evidence found.*
- **Day.ai MCP** — *no evidence found* (Day.ai is a young AI-native CRM; their model may be inverted — they *are* the agent, they don't expose an MCP for others).
- **Lavender MCP** — *no evidence found.* Lavender is an email-coaching agent that *writes to* HubSpot/Salesforce; it isn't itself an MCP target.

**Takeaway:** the contractor + field-services slice of the MCP ecosystem is essentially empty outside JobNimbus community work. This is BKG's wedge.

---

## C2. API-first CRMs — anatomy table

| CRM | Auth | Resource shapes | Webhooks / events | Write semantics | Gated to UI only | Gated to API only |
|---|---|---|---|---|---|---|
| **Attio** | OAuth 2.0 + workspace API keys; per [Attio API docs](https://docs.attio.com/) | Polymorphic objects: every workspace can define its own `people`, `companies`, `deals` shape. Attributes typed (`text`, `email`, `phone`, `record-reference`, `multi-select`). Records keyed by `{workspace_id, object_id, record_id}`. | Webhooks subscribe to typed events (`record.created`, `record.updated`, `record.deleted`, `note.created`, etc.) with target_url + subscriptions; returns a signing secret. Per [Attio webhooks reference](https://docs.attio.com/rest-api/endpoint-reference/webhooks/list-webhooks). | PATCH-style partial updates on records. Idempotency via client-generated keys is *not* mandated but the typed-attribute model means re-writing the same value is naturally idempotent. | Visual list/table builder, drag-and-drop kanban configuration, the "AI generates a custom object" wizard. | Bulk imports beyond UI row limits; programmatic webhook registration; raw attribute introspection at scale. |
| **Close** | API key (Basic auth, base64 of `key:`); OAuth 2.0 for public apps. Per [developer.close.com](https://developer.close.com/api). | `Lead` is the top-level container; `Contact`, `Opportunity`, `Activity` nest inside or reference it. Activities are first-class: `call`, `email`, `sms`, `note`, `meeting`, `task`. Custom fields prefixed `custom.`. | Webhook subscriptions per org (40 default, up to 500 for automation platforms). Events on `lead.created`, `opportunity.status_change`, `activity.created`, `task.completed`. Async processing recommended. Per [Close webhooks](https://developer.close.com/topics/webhooks/). | Per-endpoint-group rate limits; 429 responses include `rate_reset` seconds. Per-org limit ~3x per-key. Per [Close rate limits](https://developer.close.com/topics/rate-limits/). | Sequence builder UI; the "dialer" voice client; live inbox triage view. | Bulk activity exports; some report queries; webhook fanout. |
| **Folk** | API key in `Authorization` header; HTTPS-only. Per [developer.folk.app](https://developer.folk.app/api-reference/overview). | Resources: `people`, `companies`, `deals`, `groups`, `users`, `notes`, `reminders`, `interactions`, `webhooks`. JSON-encoded REST. | Webhook resource is first-class (you can create webhooks via the API itself); standard event types per resource. | Pagination + filtering documented; rate limits documented; request IDs returned. | Email integration UI, social profile enrichment UI. | Bulk imports of contacts; custom integrations. |
| **HubSpot** | OAuth 2.0 (public apps) or Private App Access Tokens (single-account). Per [HubSpot usage guidelines](https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines). | "Object" model: `contact`, `company`, `deal`, `ticket`, plus custom objects. Properties are flat key-value on `properties`; associations via `associations`. CRM Search API for cross-object queries (4 req/s per token). | Up to 1,000 webhook subscriptions per app. Events on contact/deal/company create/update/delete, association changes, deal stage changes. Workflow webhooks don't count toward API rate limit. | Free/Starter: 100 req/10s + 250k/day. Enterprise: 190 req/10s + 1M/day. 429 retry-after. | The visual workflow builder is *fully* UI-only (you can trigger workflows via API but you cannot define them via API in a portable way). The Sales Hub "Sequences" feature is UI-locked on most tiers. Report builder is UI-only. | Some properties (deal score components, AI-summarized fields) are read-only via API but visible/editable in UI. Some bulk imports require API + can't be done in UI for size reasons. |

**Pattern.** API-first CRMs (Attio, Close, Folk) treat the API surface as *the* product surface; the UI is one of many consumers and you can do most things via API that you can do in UI. HubSpot is the canonical "API-as-afterthought" — the gap between UI capability and API capability is huge (workflow builder, sequences, report builder are UI-only).

**Lesson for BKG.** If you can ship a UI feature without a corresponding API/MCP capability, you have built an API-bolted CRM. Discipline: every new UI screen ships with its MCP tool counterpart in the same PR.

---

## C3. Schema.org JSON-LD examples

### Why schema.org?

A CRM record that is *also* a valid JSON-LD document gives you three things for free:
1. Any third-party tool that consumes structured data (search engines, LLMs trained on the web, schema validators, the Google Knowledge Graph) can read your records without a custom integration.
2. `llms.txt` can publish abstract schemas that agents can introspect before calling tools.
3. The same record can roundtrip through email signatures, business cards, vCards, contact-sharing protocols — because the underlying types (`Person`, `Place`, `Organization`) are universal.

We extend schema.org with a BKG-namespaced block (`bkg:`) for the things schema.org doesn't natively express: lane, lifecycle stage, audit trail, voice primitive, confidence scores.

### Prospect — Person + ContactPoint + Place + Service interest

A homeowner ("Jane Cruz") who called Chilly about a roof. She lives at the job site; her phone and email are contact points; her interest is in roofing service.

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "bkg": "https://schema.theknowledgegardens.com/v1/"
  },
  "@type": "Person",
  "@id": "https://bkg.app/contacts/ctc_01HXYZ123",
  "identifier": "ctc_01HXYZ123",
  "name": "Jane Cruz",
  "givenName": "Jane",
  "familyName": "Cruz",
  "image": "https://bkg.app/files/avatars/ctc_01HXYZ123.jpg",
  "contactPoint": [
    {
      "@type": "ContactPoint",
      "contactType": "mobile",
      "telephone": "+1-512-555-0142",
      "availableLanguage": ["English", "Spanish"]
    },
    {
      "@type": "ContactPoint",
      "contactType": "email",
      "email": "jane.cruz@example.com"
    }
  ],
  "homeLocation": {
    "@type": "Place",
    "name": "Cruz residence (job site)",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "1428 Maple Ridge Ln",
      "addressLocality": "Austin",
      "addressRegion": "TX",
      "postalCode": "78745",
      "addressCountry": "US"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 30.2049,
      "longitude": -97.7849
    }
  },
  "seeks": {
    "@type": "Service",
    "name": "Asphalt shingle re-roof",
    "serviceType": "roofing",
    "areaServed": {"@type": "City", "name": "Austin"}
  },
  "bkg:lane": "homeowner",
  "bkg:lifecycle_stage": "size_up",
  "bkg:last_touch": "2026-05-10T14:22:00Z",
  "bkg:source": "referral_from_neighbor",
  "bkg:whisper_summary": "Storm damage on north slope, urgent but not emergency. Wants honest read before insurance call.",
  "bkg:confidence": {"contact_match": 0.98, "service_inference": 0.81},
  "bkg:consent": {"sms": true, "call": true, "email": true, "marketing": false}
}
```

### Deal — Project (chosen over Offer, see note) wrapping Person + Place

**Why `Project` not `Offer`?** `Offer` in schema.org is a *transaction-anchored* concept ("here is what I will give you for X dollars"). A contractor deal is a *multi-month process with shifting amounts, multiple offers (estimates, change orders), and a physical work site*. `Project` is the right top-level type; `Offer` is one of the things a Project contains (the estimate). This matches the BKG lifecycle: a Deal lives across Size Up → Lock → Plan → Build → Adapt → Collect → Reflect — that is a project, not a single offer.

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "bkg": "https://schema.theknowledgegardens.com/v1/"
  },
  "@type": "Project",
  "@id": "https://bkg.app/deals/dl_01HXYZ987",
  "identifier": "dl_01HXYZ987",
  "name": "Cruz residence — asphalt re-roof",
  "description": "Full tear-off and replacement of asphalt shingle roof, ~28 squares, storm-damage scope.",
  "startDate": "2026-05-08",
  "endDate": null,
  "agent": {
    "@type": "Person",
    "@id": "https://bkg.app/users/usr_chilly",
    "name": "Chilly Dahlgren"
  },
  "customer": {"@id": "https://bkg.app/contacts/ctc_01HXYZ123"},
  "location": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "1428 Maple Ridge Ln",
      "addressLocality": "Austin",
      "addressRegion": "TX",
      "postalCode": "78745",
      "addressCountry": "US"
    }
  },
  "offers": [
    {
      "@type": "Offer",
      "@id": "https://bkg.app/estimates/est_01HXYZ555",
      "name": "Initial estimate v1",
      "price": 18400.00,
      "priceCurrency": "USD",
      "validFrom": "2026-05-12",
      "validThrough": "2026-06-12",
      "itemOffered": {"@type": "Service", "name": "Asphalt re-roof, 28 sq"}
    }
  ],
  "bkg:lane": "specialty_contractor",
  "bkg:lifecycle_stage": "size_up",
  "bkg:stage_history": [
    {"stage": "lead", "entered_at": "2026-05-08T09:00:00Z", "by": "agent:claude"},
    {"stage": "size_up", "entered_at": "2026-05-10T14:22:00Z", "by": "user:usr_chilly"}
  ],
  "bkg:amount": {"value": 18400.00, "currency": "USD", "confidence": 0.62, "method": "agent_estimate_from_voice_note"},
  "bkg:risk_score": {"value": 0.31, "method": "pre_bid_risk_v1", "factors": ["insurance_involved", "neighbor_referral_strong"]},
  "bkg:audit_trail": [
    {"at": "2026-05-08T09:00:01Z", "actor": "agent:claude", "action": "create", "field": "*", "reason": "inbound voicemail transcribed"},
    {"at": "2026-05-10T14:22:00Z", "actor": "user:usr_chilly", "action": "edit", "field": "bkg:lifecycle_stage", "from": "lead", "to": "size_up"}
  ],
  "bkg:related_entities": {
    "voice_notes": ["vn_01HXYZ001"],
    "photos": ["ph_01HXYZ010", "ph_01HXYZ011"],
    "follow_ups": ["fu_01HXYZ222"]
  }
}
```

Both documents parse as valid JSON, validate as JSON-LD against schema.org, and carry the BKG-specific data an agent needs to act on them as a contractor's teammate.

---

## C4. AI-agent CRM workflows in the wild

Five real, observable workflows where AI agents touch a CRM today. Each lists the agent, the trigger, the CRM action, and the data shape the agent depends on.

### C4.1 Post-call → CRM update (Granola → HubSpot)

- **Agent.** A custom Claude-based agent (the [Scalekit "Post-Call CRM Agent" pattern](https://www.scalekit.com/blog/crm-ai-agent-development)) consuming Granola transcripts.
- **Trigger.** Granola meeting ends; transcript fires a webhook.
- **CRM action.** Within 30 seconds, agent runs a 5-step pipeline: (1) extract company/deal/stage/objections/next-steps from transcript, (2) update HubSpot deal record stage + summary + action items, (3) draft a Gmail follow-up, (4) post a Slack summary, (5) optionally create tasks.
- **Data shape it depends on.** A deal record keyed by company name (so the agent has to disambiguate against existing deals), a known stage taxonomy (so the agent can pick a value), free-form `summary` and `next_steps` fields that aren't structurally validated.

### C4.2 Inbound voice agent → CRM new lead (Roofing contractor + ProLine/JobNimbus)

- **Agent.** A roofing AI voice agent (ProLine or similar — see [useproline.com/ai-agents-for-roofers](https://useproline.com/ai-agents-for-roofers/)).
- **Trigger.** Homeowner calls a contractor's number; voice agent picks up.
- **CRM action.** Agent qualifies in real time, books an inspection, creates a new Contact + Job in JobNimbus, populates name/phone/address/storm-date/insurance, schedules a task for the contractor's inspector.
- **Data shape it depends on.** A contact + job record that can be created in one atomic call; a "source" field that captures the voice channel; a schedule integration; a stable lead status taxonomy.

### C4.3 Enrichment waterfall (Clay → Salesforce)

- **Agent.** Claygent (Clay.com's AI research agent), per [clay.com/claygent](https://www.clay.com/claygent).
- **Trigger.** New row appears in a Clay table (often sourced from a CRM trigger: "new lead created").
- **CRM action.** Agent runs a waterfall across 150+ data providers, fills firmographics + intent signals + custom-researched fields, pushes enriched data back to Salesforce / HubSpot / DWH.
- **Data shape it depends on.** A Lead/Contact record that accepts patches to many fields without lock contention; a clean "agent wrote this" provenance signal; the ability to re-run enrichment on a schedule (idempotency).

### C4.4 Sales follow-up draft (Otter Sales Agent → HubSpot/Salesforce)

- **Agent.** [Otter Sales Agent](https://otter.ai/sales-agent).
- **Trigger.** Meeting ends; Otter has the transcript and meeting context.
- **CRM action.** Agent drafts a personalized follow-up email, pushes call summary + key insights into the CRM, optionally creates tasks.
- **Data shape it depends on.** Read access to deal context (recent activity, last meeting, stage); write access to "draft email" as a CRM entity that the human can edit before send; a clear separation between "drafted" and "sent" states.

### C4.5 In-IDE CRM read (Cursor / Claude Desktop + Attio MCP)

- **Agent.** Cursor or Claude Desktop with Attio MCP connected.
- **Trigger.** Developer or operator asks: "What deals does Acme have in progress, and what's the total ARR exposure?"
- **CRM action.** Agent calls `list_objects` → `list_records` (filter by company) → aggregates → returns natural language answer with links back to Attio records.
- **Data shape it depends on.** Deterministic record IDs (so the agent can link back), filterable list endpoints with cursor pagination, polymorphic attribute introspection.

### What agents need that humans don't

| Need | Why |
|---|---|
| **Deterministic IDs** | An agent that links to `ctc_01HXYZ123` in a Slack message expects that link to resolve to the *same* record forever. Humans accept renames; agents break on them. |
| **Idempotent writes** | An agent retrying a transient failure must not double-create. Client-generated `idempotency_key` per write. |
| **Change diffs** | "What changed since last sync?" — agents poll less when they can fetch deltas. Cursor-based event streams are the right primitive. |
| **Cursor pagination, not offset** | Stable across concurrent writes; offset pagination has the classic "items shift, you miss or double-read rows" bug. |
| **"Explain why" metadata** | When an agent updates a stage to `lock`, the CRM should record `actor=agent:claude, reason="proposal_accepted_via_email_thread_X"` so a human can audit. |
| **Undo handles** | Every agent write returns a `time_machine_handle` the human (or another agent) can call to reverse it. Goal 5 of the constitution made flesh. |
| **Confidence scores** | Agent-written fields carry `confidence: 0.62` so the human UI can render them in a "Whisper" style (low-confidence) vs. confident style. |
| **Schema introspection** | Before calling `crm_create_contact`, an agent wants to know what fields exist and which are required. Don't make it guess. |

---

## C5. AI-is-also-a-user — shared record, different views

### The thesis

A Claude/GPT agent drafting a follow-up email for Chilly is both reader and writer of the same `bkg_contact` and `bkg_deal` records. So is Chilly. They share the data substrate. They do not share the same view of it.

The agent needs reasoning trace, confidence, source links, deduplication hashes, schema introspection. Chilly needs the photo, the friendly nickname, the voice memo audio, the address as a tappable map link.

When both write to the same field, BKG resolves by **most-recent-wins with full history retained in `bkg:audit_trail`** — and surfaces conflicts to the human via a Whisper primitive: *"Claude updated the estimate amount 3 minutes after you did. Use yours or theirs?"*

### Field visibility table

| Field | Human sees? | Agent sees? | Who writes? | Conflict rule |
|---|---|---|---|---|
| `name` | yes (display) | yes (string) | both | most-recent-wins; show Whisper if both wrote within 60s |
| `phone`, `email` | yes (tap-to-call/email) | yes (E.164 / RFC5322) | both | agent writes only if confidence > 0.9; otherwise drafts a Whisper |
| `image` (avatar) | yes (visual) | metadata only (URL, dims) | human uploads, agent may infer from email signature | human always wins |
| `voice_note_audio_url` | yes (player) | agent gets transcript instead | human creates, agent transcribes | agent never overwrites; appends transcript record |
| `bkg:whisper_summary` | yes (italic Whisper bubble) | yes (string) | agent | human can dismiss; dismissal is recorded |
| `bkg:confidence` | shown as Whisper styling | yes (number) | agent only | agent-only field |
| `bkg:reasoning_trace` | hidden behind Pro Toggle | yes (full text) | agent only | agent-only field |
| `bkg:lifecycle_stage` | yes (stage chip) | yes (enum) | both | human override always wins; agent move requires `confidence > 0.85` |
| `bkg:amount` | yes (formatted $) | yes (decimal + currency) | both | last-writer-wins with Whisper if delta > 10% |
| `bkg:risk_score` | shown via Whisper if > 0.5 | yes (number + factors) | agent only | agent-only field |
| `bkg:audit_trail` | hidden behind Time Machine | yes (array) | system only (append-only) | append-only, never edited |
| `bkg:source_links[]` | hidden behind Pro Toggle | yes (URLs) | agent | append-only |
| `bkg:consent` flags | yes (toggles) | yes (booleans) | human only | human-only; agent reads to decide whether to act |
| `notes_freeform` | yes (rich text) | yes (markdown) | both | most-recent-wins; both versions retained in history |
| `tags` | yes (chips) | yes (string array) | both | union; conflicts only if both *remove* the same tag |
| `bkg:related_entities` | partial (photos shown, links hidden) | yes (full graph) | both | append-only |

### What the audit trail looks like

Every record carries `bkg:audit_trail[]`, an append-only ordered list of events:

```json
{
  "at": "2026-05-10T14:22:03.418Z",
  "actor": {"type": "agent", "id": "agent:claude-4.7", "session_id": "ses_abc123"},
  "action": "edit",
  "field": "bkg:amount.value",
  "from": null,
  "to": 18400.00,
  "reason": "Inferred from voice memo vn_01HXYZ001 (transcribed: 'about eighteen four for the whole tear-off')",
  "confidence": 0.62,
  "time_machine_handle": "tm_evt_01HXYZ333"
}
```

A human reading the deal in the UI sees: "Drafted by Claude, edited by Chilly, sent by Chilly." A Pro Toggle reveals the full trace. A Time Machine slider lets them scrub backward through the trail.

### Where Time Machine fits

Every entry in `bkg:audit_trail` with `actor.type === "agent"` carries a `time_machine_handle`. Calling `crm_time_machine_undo({handle: "tm_evt_01HXYZ333"})` reverses that single edit and appends a counter-entry to the trail. This is **Goal 5 (Time Machine, fearless nav)** applied to the CRM: agents move fast because every action is reversible.

---

## C6. Event taxonomy — 31 events grouped by lifecycle stage

Every BKG CRM event carries:

```json
{
  "event_id": "evt_01HXYZ333",
  "event_type": "lead.created",
  "occurred_at": "2026-05-10T14:22:00Z",
  "actor": {"type": "agent", "id": "agent:claude-4.7"},
  "correlation_id": "cor_01HXYZ001",
  "idempotency_key": "idem_lead_created_001",
  "subject": {"@id": "https://bkg.app/contacts/ctc_01HXYZ123"},
  "payload": {"source": "inbound_call", "lane": "homeowner"},
  "time_machine_handle": "tm_evt_01HXYZ100"
}
```

### Stage 0 — Lead (pre-engagement)

| Event | Trigger | Payload (key fields) | Agent reactions |
|---|---|---|---|
| `lead.created` | New contact added (voice call, web form, manual entry) | `contact_id`, `source`, `lane`, `inferred_service` | Draft welcome SMS in lane voice; run enrichment waterfall; check for prior history match |
| `lead.enriched` | Enrichment agent completes | `contact_id`, `fields_added[]`, `provider`, `confidence` | Re-score lead; refresh risk score |
| `lead.duplicate_detected` | Match against existing contacts ≥ 0.85 confidence | `candidate_ids[]`, `match_score`, `match_basis` | Surface Whisper to human: "This looks like X — merge?" |
| `lead.scored` | Lead scoring runs | `contact_id`, `score`, `factors[]`, `model_version` | If high score, draft fast-follow-up; if low, deprioritize quietly |

### Stage 1 — Size Up

| Event | Trigger | Payload | Agent reactions |
|---|---|---|---|
| `deal.created` | First entry into the deal pipeline (lead becomes a job opportunity) | `deal_id`, `contact_id`, `lane`, `service_type`, `place` | Pre-bid risk score; draft "Is this job worth bidding on?" Invitation Card |
| `deal.site_visited` | GPS/check-in or manual "I was there" | `deal_id`, `geo`, `at`, `photos[]`, `voice_notes[]` | Synthesize voice notes; tag photos; update size_up confidence |
| `voice_note.captured` | Voice memo recorded | `voice_note_id`, `deal_id`, `audio_url`, `duration_s`, `transcript`, `transcript_confidence` | Extract entities (dimensions, materials, concerns); update deal record |
| `photo.captured` | Photo added to deal | `photo_id`, `deal_id`, `url`, `geo`, `taken_at`, `detected_objects[]` | Classify roof/wall/damage/etc.; group into job phases |
| `deal.risk_scored` | Pre-bid risk model runs | `deal_id`, `score`, `factors[]` | If score > threshold, surface Whisper to human |

### Stage 2 — Lock

| Event | Trigger | Payload | Agent reactions |
|---|---|---|---|
| `estimate.drafted` | First estimate created | `estimate_id`, `deal_id`, `amount`, `line_items[]`, `confidence`, `drafted_by` | If drafted by agent, queue human review; if drafted by human, validate against material price feed |
| `estimate.sent` | Estimate emailed/texted to prospect | `estimate_id`, `delivery_channel`, `delivered_at` | Schedule follow-up reminder for T+3 days |
| `proposal.sent` | Formal proposal sent | `proposal_id`, `deal_id`, `delivery_channel`, `expires_at` | Schedule follow-up sequence; draft thank-you message |
| `proposal.viewed` | Recipient opens the proposal | `proposal_id`, `viewer`, `view_duration_s`, `pages_viewed[]` | Notify human; suggest follow-up timing |
| `deal.locked` | Proposal accepted, contract signed | `deal_id`, `contract_id`, `signed_at`, `final_amount` | Auto-transition lifecycle; kick off planning Invitation Card |

### Stage 3 — Plan

| Event | Trigger | Payload | Agent reactions |
|---|---|---|---|
| `project.scoped` | Plan finalized | `deal_id`, `phases[]`, `start_date`, `target_end_date` | Generate schedule; flag conflicts with crew calendars |
| `material.ordered` | Materials PO placed | `deal_id`, `po_id`, `vendor`, `eta`, `amount` | Watch for delivery delays; budget update |
| `crew.assigned` | Crew booked | `deal_id`, `crew_id`, `members[]`, `dates` | Send crew brief; check certifications/lane fit |

### Stage 4 — Build

| Event | Trigger | Payload | Agent reactions |
|---|---|---|---|
| `build.started` | First day on site | `deal_id`, `started_at`, `crew_id` | Open daily-log thread; remind about photos |
| `build.daily_log` | End-of-day check-in | `deal_id`, `date`, `photos[]`, `voice_notes[]`, `progress_pct` | Summarize for client weekly digest |
| `issue.flagged` | Crew or homeowner flags problem | `issue_id`, `deal_id`, `severity`, `description`, `voice_notes[]` | Notify human ASAP; draft client comms if customer-facing |

### Stage 5 — Adapt

| Event | Trigger | Payload | Agent reactions |
|---|---|---|---|
| `change_order.requested` | Scope change requested | `co_id`, `deal_id`, `description`, `requested_by`, `amount_delta` | Draft change order doc; flag budget impact |
| `change_order.signed` | Change order approved | `co_id`, `signed_at`, `final_amount_delta` | Update deal amount + audit trail; refresh schedule |
| `schedule.changed` | Date or sequence shift | `deal_id`, `from`, `to`, `reason` | Notify affected parties; re-check crew calendars |

### Stage 6 — Collect

| Event | Trigger | Payload | Agent reactions |
|---|---|---|---|
| `invoice.sent` | Invoice delivered | `invoice_id`, `deal_id`, `amount`, `due_date` | Schedule payment reminder |
| `payment.received` | Payment posted | `payment_id`, `amount`, `method`, `at` | Update deal collected_amount; trigger thank-you flow |
| `invoice.overdue` | Past due date with no payment | `invoice_id`, `days_overdue` | Draft soft reminder for human approval |

### Stage 7 — Reflect / Repeat / Reputation / Warranty

| Event | Trigger | Payload | Agent reactions |
|---|---|---|---|
| `deal.closed_won` | Final payment + sign-off | `deal_id`, `final_amount`, `cycle_days` | Compose reflection summary; request review |
| `review.requested` | Reputation flow fires | `deal_id`, `channel`, `template_id` | Pre-draft personalized review request |
| `review.received` | Public review captured | `review_id`, `rating`, `text`, `source` | Surface to human; thank reviewer; flag low scores |
| `warranty.triggered` | Warranty claim opened | `warranty_id`, `deal_id`, `issue` | Open issue.flagged equivalent in warranty lane |
| `repeat.opportunity_detected` | Pattern signals (e.g., neighbor inquiry, time-since-build) | `prospect_id` or `contact_id`, `signal`, `confidence` | Draft warm-reach Invitation Card for human |

**Total: 31 events across 8 lifecycle stages.**

---

## C7. Proposed MCP tool surface for BKG CRM (24 tools)

Each tool below includes: name, description, example input, example output, lifecycle stage(s), human surface it mirrors, permissions/lane requirements.

### Conventions

- All tool names prefixed `crm_`.
- All writes accept optional `idempotency_key` (string, client-generated).
- All writes return `time_machine_handle` so any agent action is undoable.
- All reads support cursor pagination: `cursor` (opaque string) in, `next_cursor` out.
- Lane requirements: tools may declare `lane_relevance` mirroring the constitution.
- Permissions: tools declare `requires_scope` (read/write/admin) — enforced by MCP host.

---

### Tool 1 — `crm_list_contacts`

**Description.** List contacts visible to the caller. Mirrors the contact list UI.

```json
// input
{"filter": {"lane": "homeowner", "lifecycle_stage": "size_up"}, "limit": 25, "cursor": null}
```

```json
// output
{
  "contacts": [
    {"@id": "https://bkg.app/contacts/ctc_01HXYZ123", "name": "Jane Cruz", "lane": "homeowner", "lifecycle_stage": "size_up", "last_touch": "2026-05-10T14:22:00Z"}
  ],
  "next_cursor": "cur_xyz"
}
```

- **Stage:** all
- **Mirrors:** "Who's asking?" home view
- **Permissions:** `crm:read`

---

### Tool 2 — `crm_get_contact`

**Description.** Get full `bkg_contact` JSON-LD for one contact.

```json
// input
{"contact_id": "ctc_01HXYZ123", "include": ["audit_trail", "related_entities"]}
```

```json
// output
{"contact": {"@type": "Person", "@id": "https://bkg.app/contacts/ctc_01HXYZ123", "name": "Jane Cruz", "bkg:lane": "homeowner", "bkg:lifecycle_stage": "size_up"}}
```

- **Stage:** all
- **Mirrors:** Contact detail card
- **Permissions:** `crm:read`

---

### Tool 3 — `crm_create_contact`

**Description.** Create a new contact. Returns the canonical `bkg_contact`.

```json
// input
{
  "idempotency_key": "idem_jane_2026_05_10",
  "name": "Jane Cruz",
  "phone": "+15125550142",
  "email": "jane.cruz@example.com",
  "lane": "homeowner",
  "source": "inbound_call",
  "address": {"street": "1428 Maple Ridge Ln", "city": "Austin", "state": "TX", "zip": "78745"}
}
```

```json
// output
{
  "contact": {"@id": "https://bkg.app/contacts/ctc_01HXYZ123", "name": "Jane Cruz", "lane": "homeowner", "lifecycle_stage": "lead"},
  "time_machine_handle": "tm_evt_01HXYZ100"
}
```

- **Stage:** Lead
- **Mirrors:** "Add a new ask" Invitation Card
- **Permissions:** `crm:write`

---

### Tool 4 — `crm_update_contact`

**Description.** Partial update to a contact. Agent writes carry confidence + reason.

```json
// input
{
  "contact_id": "ctc_01HXYZ123",
  "patch": {"phone": "+15125550199"},
  "actor_metadata": {"reason": "User said new number in voicemail vn_01HXYZ001", "confidence": 0.91},
  "idempotency_key": "idem_phone_update_001"
}
```

```json
// output
{"contact": {"@id": "https://bkg.app/contacts/ctc_01HXYZ123"}, "time_machine_handle": "tm_evt_01HXYZ101"}
```

- **Stage:** all
- **Mirrors:** Inline edit
- **Permissions:** `crm:write`

---

### Tool 5 — `crm_search`

**Description.** Cross-entity search: contacts, deals, voice notes, photos.

```json
// input
{"q": "Cruz", "types": ["contact", "deal"], "limit": 10}
```

```json
// output
{
  "results": [
    {"type": "contact", "@id": "https://bkg.app/contacts/ctc_01HXYZ123", "name": "Jane Cruz", "score": 0.97},
    {"type": "deal", "@id": "https://bkg.app/deals/dl_01HXYZ987", "name": "Cruz residence — asphalt re-roof", "score": 0.93}
  ]
}
```

- **Stage:** all
- **Mirrors:** "Ask Anything" primitive
- **Permissions:** `crm:read`

---

### Tool 6 — `crm_list_deals`

**Description.** List deals (Projects) with filtering by stage, lane, value, date.

```json
// input
{"filter": {"lifecycle_stage": ["size_up", "lock"], "lane": "specialty_contractor"}, "limit": 25}
```

```json
// output
{
  "deals": [
    {"@id": "https://bkg.app/deals/dl_01HXYZ987", "name": "Cruz residence — asphalt re-roof", "lifecycle_stage": "size_up", "amount": {"value": 18400.00, "currency": "USD"}}
  ],
  "next_cursor": null
}
```

- **Stage:** all
- **Mirrors:** Pipeline kanban
- **Permissions:** `crm:read`

---

### Tool 7 — `crm_get_deal`

**Description.** Get full `bkg_deal` JSON-LD.

```json
// input
{"deal_id": "dl_01HXYZ987"}
```

```json
// output
{"deal": {"@type": "Project", "@id": "https://bkg.app/deals/dl_01HXYZ987", "name": "Cruz residence — asphalt re-roof", "bkg:lane": "specialty_contractor", "bkg:lifecycle_stage": "size_up"}}
```

- **Stage:** all
- **Mirrors:** Deal detail
- **Permissions:** `crm:read`

---

### Tool 8 — `crm_create_deal`

**Description.** Create a new deal/job.

```json
// input
{
  "idempotency_key": "idem_deal_cruz_001",
  "contact_id": "ctc_01HXYZ123",
  "name": "Cruz residence — asphalt re-roof",
  "lane": "specialty_contractor",
  "service_type": "roofing",
  "location": {"street": "1428 Maple Ridge Ln", "city": "Austin", "state": "TX", "zip": "78745"}
}
```

```json
// output
{"deal": {"@id": "https://bkg.app/deals/dl_01HXYZ987", "lifecycle_stage": "lead"}, "time_machine_handle": "tm_evt_01HXYZ200"}
```

- **Stage:** Lead → Size Up
- **Mirrors:** "Start a new job" Invitation Card
- **Permissions:** `crm:write`

---

### Tool 9 — `crm_transition_deal_stage`

**Description.** Move a deal to a new lifecycle stage. Agent moves require confidence > 0.85 unless overridden.

```json
// input
{
  "deal_id": "dl_01HXYZ987",
  "to_stage": "lock",
  "reason": "Proposal accepted via email thread eml_01HXYZ444",
  "confidence": 0.97,
  "idempotency_key": "idem_transition_001"
}
```

```json
// output
{
  "deal_id": "dl_01HXYZ987",
  "from_stage": "size_up",
  "to_stage": "lock",
  "transitioned_at": "2026-05-12T10:14:00Z",
  "time_machine_handle": "tm_evt_01HXYZ201"
}
```

- **Stage:** transitions across all 7 stages
- **Mirrors:** Stage chip drag-and-drop
- **Permissions:** `crm:write`

---

### Tool 10 — `crm_log_voice_note`

**Description.** Attach a voice memo to a contact or deal. Returns transcript + extracted entities.

```json
// input
{
  "subject_id": "dl_01HXYZ987",
  "audio_url": "https://storage.bkg.app/voice/raw/vn_01HXYZ001.m4a",
  "captured_at": "2026-05-10T14:18:00Z",
  "captured_by": "usr_chilly",
  "idempotency_key": "idem_vn_001"
}
```

```json
// output
{
  "voice_note": {
    "id": "vn_01HXYZ001",
    "transcript": "About eighteen four for the whole tear-off, north slope is the worst...",
    "transcript_confidence": 0.92,
    "extracted_entities": {"amounts": [18400], "locations": ["north slope"], "concerns": ["storm damage"]}
  },
  "time_machine_handle": "tm_evt_01HXYZ202"
}
```

- **Stage:** Size Up, Build, Adapt
- **Mirrors:** Voice memo button
- **Permissions:** `crm:write`

---

### Tool 11 — `crm_log_photo`

**Description.** Attach a photo to a deal with geo + extracted metadata.

```json
// input
{
  "deal_id": "dl_01HXYZ987",
  "url": "https://storage.bkg.app/photos/raw/ph_01HXYZ010.jpg",
  "geo": {"lat": 30.2049, "lng": -97.7849},
  "captured_at": "2026-05-10T14:20:00Z",
  "idempotency_key": "idem_ph_001"
}
```

```json
// output
{
  "photo": {
    "id": "ph_01HXYZ010",
    "detected_objects": ["shingle", "flashing", "vent"],
    "classified_phase": "size_up",
    "exif_summary": {"camera": "iPhone 15 Pro", "captured_at": "2026-05-10T14:20:00Z"}
  },
  "time_machine_handle": "tm_evt_01HXYZ203"
}
```

- **Stage:** Size Up → Collect
- **Mirrors:** Camera button
- **Permissions:** `crm:write`

---

### Tool 12 — `crm_score_lead`

**Description.** Compute or refresh a lead score for a contact or deal.

```json
// input
{"subject_id": "dl_01HXYZ987", "model": "pre_bid_risk_v1"}
```

```json
// output
{
  "subject_id": "dl_01HXYZ987",
  "score": 0.31,
  "factors": [{"name": "insurance_involved", "weight": 0.20}, {"name": "neighbor_referral_strong", "weight": -0.40}],
  "model_version": "pre_bid_risk_v1",
  "computed_at": "2026-05-10T14:23:00Z"
}
```

- **Stage:** Lead → Size Up
- **Mirrors:** "Is this job worth bidding on?" Invitation Card
- **Permissions:** `crm:read`, `lane: any`

---

### Tool 13 — `crm_draft_followup`

**Description.** Draft a follow-up message (SMS / email / call script) in the contractor's voice.

```json
// input
{
  "subject_id": "dl_01HXYZ987",
  "channel": "sms",
  "intent": "check_in",
  "tone": "warm_professional",
  "context_window_days": 7
}
```

```json
// output
{
  "draft_id": "draft_01HXYZ555",
  "channel": "sms",
  "to": "+15125550142",
  "body": "Hi Jane — Chilly here. Wanted to circle back on the roof estimate I sent Tuesday. Any questions I can answer? No rush.",
  "reasoning": "Last touch was the estimate 3 days ago; tone matches the warm-pro voice from prior threads.",
  "confidence": 0.86,
  "time_machine_handle": "tm_evt_01HXYZ204"
}
```

- **Stage:** Lock, Adapt, Collect
- **Mirrors:** "Reach out" Invitation Card
- **Permissions:** `crm:write` (draft only; send requires human approval or `crm:send`)

---

### Tool 14 — `crm_send_message`

**Description.** Send a previously drafted (or new) message via SMS / email / call. Always returns audit handle.

```json
// input
{"draft_id": "draft_01HXYZ555", "send": true, "idempotency_key": "idem_send_001"}
```

```json
// output
{"message_id": "msg_01HXYZ666", "sent_at": "2026-05-10T14:30:00Z", "delivery_status": "queued", "time_machine_handle": "tm_evt_01HXYZ205"}
```

- **Stage:** Lock, Adapt, Collect
- **Mirrors:** Send button on draft
- **Permissions:** `crm:send`

---

### Tool 15 — `crm_schedule_followup`

**Description.** Schedule a future reminder or follow-up action.

```json
// input
{"subject_id": "dl_01HXYZ987", "at": "2026-05-13T09:00:00Z", "kind": "call_back", "note": "If no reply to Friday's text"}
```

```json
// output
{"followup_id": "fu_01HXYZ222", "scheduled_at": "2026-05-13T09:00:00Z", "time_machine_handle": "tm_evt_01HXYZ206"}
```

- **Stage:** all
- **Mirrors:** Reminder bell
- **Permissions:** `crm:write`

---

### Tool 16 — `crm_create_estimate`

**Description.** Create a structured estimate (an `Offer` inside the deal `Project`).

```json
// input
{
  "deal_id": "dl_01HXYZ987",
  "amount": 18400.00,
  "currency": "USD",
  "line_items": [{"name": "Asphalt re-roof, 28 sq", "qty": 1, "unit_price": 18400.00}],
  "valid_through": "2026-06-12",
  "idempotency_key": "idem_est_001"
}
```

```json
// output
{"estimate_id": "est_01HXYZ555", "deal_id": "dl_01HXYZ987", "amount": 18400.00, "time_machine_handle": "tm_evt_01HXYZ207"}
```

- **Stage:** Size Up → Lock
- **Mirrors:** "Build estimate" Invitation Card
- **Permissions:** `crm:write`

---

### Tool 17 — `crm_log_activity`

**Description.** Log a free-form activity (call, meeting, site visit) against a contact or deal.

```json
// input
{
  "subject_id": "dl_01HXYZ987",
  "kind": "site_visit",
  "occurred_at": "2026-05-10T14:00:00Z",
  "duration_minutes": 45,
  "notes": "Walked roof with Jane, took 8 photos, 1 voice memo.",
  "idempotency_key": "idem_act_001"
}
```

```json
// output
{"activity_id": "act_01HXYZ777", "time_machine_handle": "tm_evt_01HXYZ208"}
```

- **Stage:** all
- **Mirrors:** Activity log
- **Permissions:** `crm:write`

---

### Tool 18 — `crm_list_activities`

**Description.** Activity timeline for a subject.

```json
// input
{"subject_id": "dl_01HXYZ987", "limit": 20}
```

```json
// output
{"activities": [{"id": "act_01HXYZ777", "kind": "site_visit", "occurred_at": "2026-05-10T14:00:00Z"}], "next_cursor": null}
```

- **Stage:** all
- **Mirrors:** Timeline view
- **Permissions:** `crm:read`

---

### Tool 19 — `crm_subscribe_events`

**Description.** Subscribe to a typed event stream for reactive agent loops.

```json
// input
{
  "event_types": ["proposal.sent", "proposal.viewed", "change_order.requested"],
  "filter": {"lane": "specialty_contractor"},
  "delivery": {"mode": "webhook", "target_url": "https://my-agent.example.com/hook", "secret": "shh"}
}
```

```json
// output
{"subscription_id": "sub_01HXYZ888", "event_types_count": 3, "active": true}
```

- **Stage:** all (event-driven)
- **Mirrors:** Notification settings
- **Permissions:** `crm:read`, `events:subscribe`

---

### Tool 20 — `crm_introspect_schema`

**Description.** Return the live JSON-LD schemas for contacts / deals / extensions. Agents call this once at session start.

```json
// input
{"types": ["contact", "deal", "voice_note"]}
```

```json
// output
{
  "schemas": {
    "contact": {"@context": "https://schema.org", "@type": "Person", "extensions": ["bkg:lane", "bkg:lifecycle_stage", "bkg:whisper_summary", "bkg:confidence", "bkg:consent"]},
    "deal": {"@context": "https://schema.org", "@type": "Project", "extensions": ["bkg:lane", "bkg:lifecycle_stage", "bkg:amount", "bkg:risk_score", "bkg:audit_trail"]}
  },
  "version": "2026.05.01"
}
```

- **Stage:** all
- **Mirrors:** `llms.txt` published at theknowledgegardens.com/llms.txt
- **Permissions:** `public` (no auth needed for schema; only for data)

---

### Tool 21 — `crm_time_machine_undo`

**Description.** Reverse a previous agent (or human) action by its handle.

```json
// input
{"time_machine_handle": "tm_evt_01HXYZ333", "reason": "user dismissed agent's stage change"}
```

```json
// output
{"reverted": true, "new_audit_entry": "tm_evt_01HXYZ334", "subject_id": "dl_01HXYZ987"}
```

- **Stage:** all
- **Mirrors:** Time Machine slider / undo
- **Permissions:** `crm:write`

---

### Tool 22 — `crm_whisper`

**Description.** Surface a Whisper (low-stakes nudge) to the human user. Agent-initiated; human can dismiss or act.

```json
// input
{
  "subject_id": "dl_01HXYZ987",
  "summary": "Jane viewed the proposal twice today. Worth a check-in?",
  "suggested_action": {"tool": "crm_draft_followup", "args": {"subject_id": "dl_01HXYZ987", "channel": "sms", "intent": "check_in"}},
  "confidence": 0.78
}
```

```json
// output
{"whisper_id": "wsp_01HXYZ999", "delivered": true, "time_machine_handle": "tm_evt_01HXYZ210"}
```

- **Stage:** all
- **Mirrors:** Whisper primitive
- **Permissions:** `crm:write`, `whisper:create`

---

### Tool 23 — `crm_summarize_lifecycle`

**Description.** Return a human-readable summary of a deal's lifecycle journey: stages entered, dwell times, key events.

```json
// input
{"deal_id": "dl_01HXYZ987"}
```

```json
// output
{
  "deal_id": "dl_01HXYZ987",
  "summary": "Lead → Size Up in 2d 5h. Currently in Size Up for 1d 4h. 8 photos, 1 voice memo captured.",
  "stage_durations_hours": {"lead": 53, "size_up": 28},
  "next_likely_stage": "lock",
  "confidence": 0.74
}
```

- **Stage:** all
- **Mirrors:** Deal header summary card
- **Permissions:** `crm:read`

---

### Tool 24 — `crm_lane_assist`

**Description.** Given a contact or deal, return lane-specific guidance: typical next steps, common questions, voice tone, regulatory considerations.

```json
// input
{"subject_id": "dl_01HXYZ987"}
```

```json
// output
{
  "lane": "specialty_contractor",
  "subspecialty": "roofing",
  "next_likely_actions": ["measure_roof", "check_insurance_claim", "draft_estimate"],
  "typical_voice_tone": "warm_professional",
  "common_objections": ["price_vs_competitor", "warranty_length"],
  "regulatory_notes": ["TX requires written contract over $7500"]
}
```

- **Stage:** all (lane-aware)
- **Mirrors:** Pro Toggle's "lane guidance" panel
- **Permissions:** `crm:read`

---

**Total: 24 tools.** Surface covers contacts, deals, activities, voice notes, photos, follow-ups, scoring, drafting, scheduling, lifecycle reads/writes, undo, Whisper, schema introspection, and lane assistance.

---

## C8. Canonical JSON-LD pair

### `bkg_contact.jsonld`

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "bkg": "https://schema.theknowledgegardens.com/v1/"
  },
  "@type": "Person",
  "@id": "https://bkg.app/contacts/ctc_01HXYZ123",
  "identifier": "ctc_01HXYZ123",
  "name": "Jane Cruz",
  "givenName": "Jane",
  "familyName": "Cruz",
  "image": "https://bkg.app/files/avatars/ctc_01HXYZ123.jpg",
  "contactPoint": [
    {"@type": "ContactPoint", "contactType": "mobile", "telephone": "+1-512-555-0142"},
    {"@type": "ContactPoint", "contactType": "email", "email": "jane.cruz@example.com"}
  ],
  "homeLocation": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "1428 Maple Ridge Ln",
      "addressLocality": "Austin",
      "addressRegion": "TX",
      "postalCode": "78745",
      "addressCountry": "US"
    },
    "geo": {"@type": "GeoCoordinates", "latitude": 30.2049, "longitude": -97.7849}
  },
  "seeks": {
    "@type": "Service",
    "name": "Asphalt shingle re-roof",
    "serviceType": "roofing"
  },
  "bkg:lane": "homeowner",
  "bkg:lifecycle_stage": "size_up",
  "bkg:last_touch": "2026-05-10T14:22:00Z",
  "bkg:source": "referral_from_neighbor",
  "bkg:whisper_summary": "Storm damage on north slope, urgent but not emergency.",
  "bkg:confidence": {"contact_match": 0.98, "service_inference": 0.81},
  "bkg:consent": {"sms": true, "call": true, "email": true, "marketing": false},
  "bkg:related_entities": {
    "deals": ["https://bkg.app/deals/dl_01HXYZ987"],
    "voice_notes": ["vn_01HXYZ001"],
    "photos": ["ph_01HXYZ010", "ph_01HXYZ011"]
  },
  "bkg:audit_trail": [
    {
      "at": "2026-05-08T09:00:01Z",
      "actor": {"type": "agent", "id": "agent:claude-4.7"},
      "action": "create",
      "field": "*",
      "reason": "Inbound voicemail transcribed",
      "confidence": 0.92,
      "time_machine_handle": "tm_evt_01HXYZ100"
    }
  ]
}
```

**Annotations (BKG extensions):**

- `bkg:lane` — One of `homeowner | general_contractor | specialty_contractor | supplier | architect | inspector | unknown`. Drives lane-aware UI rendering and agent tone selection.
- `bkg:lifecycle_stage` — One of the 8 stages: `lead | size_up | lock | plan | build | adapt | collect | reflect`. Source of truth for pipeline placement.
- `bkg:last_touch` — Timestamp of most recent meaningful interaction (call, message, photo, voice memo, status change).
- `bkg:source` — Origin of the contact: `inbound_call | web_form | referral_from_neighbor | trade_show | door_knock | agent_synthesized | manual`.
- `bkg:whisper_summary` — One-sentence Whisper-friendly summary an agent surfaces in the UI. Italicized in render.
- `bkg:confidence` — Per-field confidence scores written by agents. UI uses these to dim/whisper low-confidence values.
- `bkg:consent` — Channel-level consent toggles. Agents *never* call/text/email without checking these.
- `bkg:related_entities` — Inverse-pointers to related records. Lets agents traverse the graph without separate lookups.
- `bkg:audit_trail` — Append-only history of every write. Each entry carries `time_machine_handle` for undo.

---

### `bkg_deal.jsonld`

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "bkg": "https://schema.theknowledgegardens.com/v1/"
  },
  "@type": "Project",
  "@id": "https://bkg.app/deals/dl_01HXYZ987",
  "identifier": "dl_01HXYZ987",
  "name": "Cruz residence — asphalt re-roof",
  "description": "Full tear-off and replacement of asphalt shingle roof, ~28 squares, storm-damage scope.",
  "startDate": "2026-05-08",
  "endDate": null,
  "agent": {
    "@type": "Person",
    "@id": "https://bkg.app/users/usr_chilly",
    "name": "Chilly Dahlgren"
  },
  "customer": {"@id": "https://bkg.app/contacts/ctc_01HXYZ123"},
  "location": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "1428 Maple Ridge Ln",
      "addressLocality": "Austin",
      "addressRegion": "TX",
      "postalCode": "78745",
      "addressCountry": "US"
    }
  },
  "offers": [
    {
      "@type": "Offer",
      "@id": "https://bkg.app/estimates/est_01HXYZ555",
      "name": "Initial estimate v1",
      "price": 18400.00,
      "priceCurrency": "USD",
      "validFrom": "2026-05-12",
      "validThrough": "2026-06-12",
      "itemOffered": {"@type": "Service", "name": "Asphalt re-roof, 28 sq"}
    }
  ],
  "bkg:lane": "specialty_contractor",
  "bkg:subspecialty": "roofing",
  "bkg:lifecycle_stage": "size_up",
  "bkg:stage_history": [
    {"stage": "lead", "entered_at": "2026-05-08T09:00:00Z", "by": "agent:claude-4.7"},
    {"stage": "size_up", "entered_at": "2026-05-10T14:22:00Z", "by": "user:usr_chilly"}
  ],
  "bkg:amount": {
    "value": 18400.00,
    "currency": "USD",
    "confidence": 0.62,
    "method": "agent_estimate_from_voice_note"
  },
  "bkg:risk_score": {
    "value": 0.31,
    "method": "pre_bid_risk_v1",
    "factors": ["insurance_involved", "neighbor_referral_strong"]
  },
  "bkg:related_entities": {
    "contact_id": "ctc_01HXYZ123",
    "voice_notes": ["vn_01HXYZ001"],
    "photos": ["ph_01HXYZ010", "ph_01HXYZ011"],
    "follow_ups": ["fu_01HXYZ222"],
    "estimates": ["est_01HXYZ555"]
  },
  "bkg:audit_trail": [
    {
      "at": "2026-05-08T09:00:01Z",
      "actor": {"type": "agent", "id": "agent:claude-4.7"},
      "action": "create",
      "field": "*",
      "reason": "Inbound voicemail mentioned roof + storm",
      "confidence": 0.88,
      "time_machine_handle": "tm_evt_01HXYZ200"
    },
    {
      "at": "2026-05-10T14:22:00Z",
      "actor": {"type": "user", "id": "usr_chilly"},
      "action": "edit",
      "field": "bkg:lifecycle_stage",
      "from": "lead",
      "to": "size_up",
      "reason": "Site visit completed",
      "time_machine_handle": "tm_evt_01HXYZ201"
    }
  ]
}
```

**Annotations (BKG extensions):**

- `bkg:lane` + `bkg:subspecialty` — Two-level taxonomy. Lane drives major UI rendering; subspecialty drives `crm_lane_assist` output.
- `bkg:lifecycle_stage` — Current stage. Mirrors the deal in pipeline view.
- `bkg:stage_history` — Ordered history of stage entries. Drives Time Machine and cycle-time analytics.
- `bkg:amount` — Monetary value with explicit confidence + method. Agent writes carry low confidence by default; human writes default to 1.0.
- `bkg:risk_score` — Pre-bid risk model output. Drives the "Is this job worth bidding on?" Invitation Card.
- `bkg:related_entities` — Inverse-pointer graph. Voice notes, photos, follow-ups, estimates all reachable from the deal without separate queries.
- `bkg:audit_trail` — Same append-only model as contact. Every entry undoable.

---

## Closing — the constitutional test

Re-read Goal 8: *Every primitive exposes structured data agents can query/reason/act on via MCP server and `llms.txt`.* The audit in C1 shows that no existing CRM MCP passes that test for a contractor: they expose CRUD, not primitives. The proposal in C7 and C8 is what passing the test looks like — every Invitation Card, every Whisper, every Time Machine handle, every Pro Toggle has a tool counterpart and a JSON-LD shape, and the contractor and the agent see the same record through different renders.

The single design move that matters most: **`bkg:audit_trail` with `time_machine_handle` on every write.** Without it, agents can't be trusted as first-class users — humans won't grant write scope to something they can't undo. With it, the calculus inverts: an agent action is no more dangerous than a human action, because either can be reversed in one tool call. That single decision is what turns "AI is also a user" from a slogan into a workable trust model.

---

## Sources

- HubSpot MCP: [developers.hubspot.com/mcp](https://developers.hubspot.com/mcp), [baryhuang/mcp-hubspot](https://github.com/baryhuang/mcp-hubspot), [shinzo-labs/hubspot-mcp](https://github.com/shinzo-labs/hubspot-mcp), [lkm1developer/hubspot-mcp-server](https://github.com/lkm1developer/hubspot-mcp-server), [HubSpot remote MCP GA changelog](https://developers.hubspot.com/changelog/remote-hubspot-mcp-server-is-now-generally-available), [HubSpot integration docs](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/integrate-with-the-remote-hubspot-mcp-server)
- Salesforce MCP: [salesforcecli/mcp](https://github.com/salesforcecli/mcp), [forcedotcom/mcp-hosted wiki](https://github.com/forcedotcom/mcp-hosted/wiki/Available-Tools-and-Servers), [Salesforce dev blog on MCP](https://developer.salesforce.com/blogs/2025/06/introducing-mcp-support-across-salesforce), [advancedcommunities/salesforce-mcp-server](https://github.com/advancedcommunities/salesforce-mcp-server), [KirtiJha/salesforce-mcp-server](https://github.com/KirtiJha/salesforce-mcp-server), [tsmztech/mcp-server-salesforce](https://github.com/tsmztech/mcp-server-salesforce)
- Attio MCP: [docs.attio.com/mcp/overview](https://docs.attio.com/mcp/overview), [kesslerio/attio-mcp-server](https://github.com/kesslerio/attio-mcp-server), [itsbrex/attio-mcp-server](https://github.com/itsbrex/attio-mcp-server), [redriverwest/attio-mcp](https://github.com/redriverwest/attio-mcp), [mcpbundles.com/skills/attio](https://www.mcpbundles.com/skills/attio)
- Pipedrive MCP: [iamsamuelfraga/mcp-pipedrive](https://github.com/iamsamuelfraga/mcp-pipedrive), [osherai/pipedrive-mcp-python](https://github.com/osherai/pipedrive-mcp-python), [WillDent/pipedrive-mcp-server](https://github.com/WillDent/pipedrive-mcp-server), [ckalima/pipedrive-mcp-server](https://github.com/ckalima/pipedrive-mcp-server), [vaibhavpandeyvpz/pipedriver](https://github.com/vaibhavpandeyvpz/pipedriver), [Wirasm/pipedrive-mcp](https://github.com/Wirasm/pipedrive-mcp), [CDataSoftware/pipedrive-mcp-server-by-cdata](https://github.com/CDataSoftware/pipedrive-mcp-server-by-cdata)
- Close: [close.com/integrations/close-mcp](https://close.com/integrations/close-mcp), [developer.close.com](https://developer.close.com/api), [Close rate limits](https://developer.close.com/topics/rate-limits/), [Close webhooks](https://developer.close.com/topics/webhooks/)
- Folk: [NimbleBrainInc/mcp-folk](https://github.com/nimblebraininc/mcp-folk), [developer.folk.app](https://developer.folk.app/api-reference/overview), [help.folk.app folk API article](https://help.folk.app/en/articles/11666479-folk-api)
- Twenty CRM: [mhenry3164/twenty-crm-mcp-server](https://github.com/mhenry3164/twenty-crm-mcp-server), [jezweb/twenty-mcp](https://github.com/jezweb/twenty-mcp), [twentyhq/twenty](https://github.com/twentyhq/twenty)
- JobNimbus: [clykins90/jobnimbus-mcp-server](https://github.com/clykins90/jobnimbus-mcp-server), [Composio JobNimbus MCP](https://mcp.composio.dev/jobnimbus), [Zapier JobNimbus MCP](https://zapier.com/mcp/jobnimbus), [JobNimbus MCP remote via Glama](https://glama.ai/mcp/servers/@benitocabrerar/jobnimbus-mcp-remote), [getguru JobNimbus MCP reference](https://www.getguru.com/reference/jobnimbus-mcp)
- API anatomy: [HubSpot API usage guidelines](https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines), [Close API overview](https://developer.close.com/api), [docs.attio.com webhooks](https://docs.attio.com/rest-api/endpoint-reference/webhooks/list-webhooks), [Folk API overview](https://developer.folk.app/api-reference/overview)
- Schema.org references: [schema.org/Person](https://schema.org/Person), [schema.org/ContactPoint](https://schema.org/ContactPoint), [schema.org/Place](https://schema.org/Place), [schema.org/Project](https://schema.org/Project), [schema.org/Offer](https://schema.org/Offer), [schema.org/Service](https://schema.org/Service), [jsonld.com organization examples](https://jsonld.com/organization/)
- AI agent CRM workflows: [Scalekit post-call CRM agent](https://www.scalekit.com/blog/crm-ai-agent-development), [Otter Sales Agent](https://otter.ai/sales-agent), [Granola customer-success integration](https://www.granola.ai/blog/best-ai-notetaker-customer-success-teams-crm-integration), [Clay Claygent](https://www.clay.com/claygent), [Clay CRM enrichment](https://www.clay.com/use-cases/crm-enrichment), [ProLine AI agents for roofers](https://useproline.com/ai-agents-for-roofers/), [Leaping AI roofing canvassing](https://leapingai.com/blog/voice-ai-to-automate-window-roofing-remodeling-canvassing-calls)
- MCP design principles: [Anthropic engineering — code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp), [Aditya Mehra — beyond API wrappers](https://medium.com/@aditya_mehra/beyond-api-wrappers-architecting-mcp-servers-for-production-agentic-ai-systems-cf93804be22a), [Fast.io — AI agent idempotent operations](https://fast.io/resources/ai-agent-idempotent-operations/)

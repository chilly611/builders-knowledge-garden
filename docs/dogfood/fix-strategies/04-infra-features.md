# Killerapp Infrastructure & Feature-Gap Fix Strategy

**Date:** 2026-05-06  
**Author:** Infrastructure Engineering Review  
**Target:** Post-dogfood validation, John demo readiness, 60-day roadmap  

---

## Executive Summary

The Project Spine v1 foundation works. Three gaps block contractor demos and phase-2 adoption:

1. **Photo/Video Attachments** — The #1 universal gap across John, Maria, Hank, Mari. John lost $30k to a dispute; this is dispute-evidence-stamping with GPS/timestamp/metadata. **Time-to-ship: 5–7 days (1 engineer).**

2. **Wire 14 More Workflows** — Only q2/q4/q5 use Project Spine. q8 (permits), q11 (supply), q15 (daily-log), q20 (change orders) are dead-ends. **Time-to-wire all 14: 7–10 days (formulaic, one engineer).**

3. **INP Performance** — 1–4s spikes on button clicks. Likely culprit: unbounded journey-progress writes or scroll observer thrashing on WorkflowShell. **Investigation: 4–6 hours; fix: 2–4 hours after root cause found.**

Also discovered: Jurisdiction context doesn't cascade from project (Mari's FL code gap), cost parser misses `$1.4M` format (ADU-scale estimates fail), and 14 untested workflows are "landmines" for unscripted demos.

---

## 1. Project Attachments Feature Spec (THE #1 UNIVERSAL GAP)

### 1.1 User Story

**As** John (GC), **I want** to capture photos of job-site conditions with tamper-proof GPS/timestamp metadata, **so that** I have dispute-proof evidence if a client or sub later claims work was defective or not done on time.

**As** Hank (foreman), **I want** to photograph water damage in one tap, location auto-stamped, linked to my daily log, **so that** the GC has dated proof for insurance claims.

**As** Mari (multi-family PM), **I want** to upload photos to a project gallery, sort by phase, export as a "punch list evidence packet" PDF, **so that** final inspections are backed by visual timeline.

### 1.2 Database Schema

Create `project_attachments` table in Supabase:

```sql
CREATE TABLE IF NOT EXISTS public.project_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  
  -- File metadata
  type TEXT NOT NULL CHECK (type IN ('photo', 'video', 'document')),
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  
  -- Capture metadata (tamper-proof evidence)
  gps_latitude NUMERIC(10, 8),
  gps_longitude NUMERIC(10, 8),
  gps_accuracy_meters NUMERIC(8, 2),
  taken_at TIMESTAMPTZ NOT NULL,
  
  -- Legal chain-of-custody
  metadata JSONB DEFAULT '{}', 
  -- { "device_model", "ios_version", "app_version", "hash_sha256", "annotation" }
  
  -- Workflow context (optional link to step where photo was attached)
  workflow_id TEXT,
  step_id TEXT,
  category TEXT, -- 'progress', 'issue', 'damage', 'inspection', 'safety'
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT fk_project_attachments_project 
    FOREIGN KEY (project_id) REFERENCES public.saved_projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_project_attachments_user 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.project_attachments ENABLE ROW LEVEL SECURITY;

-- RLS: Users can see attachments on their own projects (via project ownership)
CREATE POLICY "Users can view attachments on their projects" ON public.project_attachments
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.saved_projects 
      WHERE saved_projects.id = project_attachments.project_id 
      AND saved_projects.user_id = auth.uid()
    )
  );

-- RLS: Users can upload attachments to their own projects
CREATE POLICY "Users can upload attachments to their projects" ON public.project_attachments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.saved_projects 
      WHERE saved_projects.id = project_attachments.project_id 
      AND saved_projects.user_id = auth.uid()
    )
  );

-- RLS: Users can update metadata (e.g., annotation, category)
CREATE POLICY "Users can update their own attachments" ON public.project_attachments
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_project_attachments_project_id ON public.project_attachments(project_id);
CREATE INDEX idx_project_attachments_user_id ON public.project_attachments(user_id);
CREATE INDEX idx_project_attachments_taken_at ON public.project_attachments(taken_at);
CREATE INDEX idx_project_attachments_category ON public.project_attachments(category);
CREATE INDEX idx_project_attachments_workflow ON public.project_attachments(workflow_id, step_id);
```

### 1.3 Supabase Storage Bucket

Create bucket: `project-evidence` (private)

```
Bucket name: project-evidence
Visibility: private
Path pattern for auth users: project/{project_id}/*.{jpg,jpeg,png,mp4,mov,webm}
```

RLS policy on bucket:

```sql
-- Authenticated users can upload to their own project's folder
SELECT: (bucket_id = 'project-evidence' AND auth.uid() = (storage.foldername(name))[1]::uuid)
INSERT: (bucket_id = 'project-evidence' AND auth.uid() = (storage.foldername(name))[1]::uuid)
UPDATE: (bucket_id = 'project-evidence' AND auth.uid() = (storage.foldername(name))[1]::uuid)
DELETE: (bucket_id = 'project-evidence' AND auth.uid() = (storage.foldername(name))[1]::uuid)
```

### 1.4 Upload Component Design

**Location:** `/app/src/components/ProjectAttachmentUpload.tsx`

```typescript
// Pseudo-code pattern
export function ProjectAttachmentUpload({ projectId, stepId, onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  
  const handleCameraCapture = async (file: File, gpsCoords?: GpsCoords) => {
    setUploading(true);
    try {
      // 1. Get device metadata (via @react-native-camera or getUserMedia on web)
      const metadata = await captureDeviceMetadata();
      
      // 2. Hash file (SHA-256) for tamper-proof chain
      const hash = await hashFile(file);
      
      // 3. Upload to Supabase Storage
      const path = `project/${projectId}/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('project-evidence')
        .upload(path, file);
      
      // 4. Insert into project_attachments table
      const { data: attachment } = await supabase
        .from('project_attachments')
        .insert({
          project_id: projectId,
          user_id: auth.uid(),
          type: file.type.startsWith('video') ? 'video' : 'photo',
          file_url: data.path,
          file_size_bytes: file.size,
          mime_type: file.type,
          gps_latitude: gpsCoords?.lat,
          gps_longitude: gpsCoords?.lng,
          gps_accuracy_meters: gpsCoords?.accuracy,
          taken_at: new Date(),
          metadata: { ...metadata, hash_sha256: hash },
          workflow_id: stepId?.split('-')[0],
          step_id: stepId,
          category: 'progress', // can be overridden by user
        });
      
      onUploadComplete(attachment);
    } finally {
      setUploading(false);
    }
  };
  
  return <CameraButton onCapture={handleCameraCapture} />;
}
```

### 1.5 Mobile Camera Capture Flow

**On iPhone Safari** (Hank's main use case):

1. Tap "Add Photo" in daily-log or workflow step
2. Triggers `<input type="file" accept="image/*" capture="camera">` (native camera picker)
3. On iOS, camera app activates, user captures photo
4. Photo auto-includes timestamp + location (if location permission granted)
5. Photo returns to app, `ProjectAttachmentUpload` handles upload + GPS extraction
6. Voice note can be recorded simultaneously; photo + voice linked in same `recordStepEvent` call

**On Android / Desktop:**

1. Same UX, but fallback to native file picker if camera not available
2. GPS extraction attempted from EXIF; if not present, user can enter location manually

### 1.6 Gallery View in KillerappProjectShell

**New component:** `ProjectAttachmentGallery.tsx`  
**Location:** `/app/src/components/KillerappProjectShell` (as a sidebar tab or expandable panel)

```typescript
export function ProjectAttachmentGallery({ projectId }) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [filterBy, setFilterBy] = useState<'all' | 'phase' | 'category'>('all');
  
  useEffect(() => {
    supabase
      .from('project_attachments')
      .select('*')
      .eq('project_id', projectId)
      .order('taken_at', { ascending: false })
      .then(({ data }) => setAttachments(data));
  }, [projectId]);
  
  return (
    <div>
      <h3>Project Evidence ({attachments.length})</h3>
      <FilterTabs filterBy={filterBy} onChange={setFilterBy} />
      <div className="gallery-grid">
        {attachments.map(att => (
          <AttachmentCard
            key={att.id}
            attachment={att}
            onDelete={handleDelete}
            onExport={handleExport}
          />
        ))}
      </div>
      <Button onClick={exportPdf}>Export Evidence Packet PDF</Button>
    </div>
  );
}
```

**Features:**
- Grid view (2–3 columns on mobile, 4–6 on desktop)
- Filter by category (Progress, Issues, Damage, Inspection, Safety)
- Filter by workflow phase (Estimating, Code Compliance, etc.)
- Click to view full-size, tap to see GPS map, long-press to annotate
- Bulk export to PDF (timestamp, location, category, user, annotation)

### 1.7 Per-Step Attachment UI in Workflows

**In `StepCard` or `WorkflowShell`:**

Add optional `attachments` section:

```typescript
<StepCard
  stepId="s15-0"
  title="What happened today?"
  // ... existing props
>
  <VoiceInput onComplete={recordVoice} />
  <ProjectAttachmentUpload projectId={projectId} stepId="s15-0" />
  <AttachmentPreview attachments={step.attachments} />
</StepCard>
```

When user uploads, the attachment is:
- Written to `project_attachments` table
- Linked via `workflow_id` + `step_id` for cross-reference
- Auto-included in step's `hydratedPayloads` for pre-fill on reload

### 1.8 Time-to-Ship Estimate

**Total: 5–7 days (1 engineer, full-time)**

- DB schema + RLS policy: **1 day** (migration + testing)
- Storage bucket + upload component: **1.5 days** (upload logic, error handling, mobile test)
- Gallery view: **1.5 days** (grid, filtering, export)
- Per-step integration: **1 day** (wire into StepCard, test pre-fill)
- Mobile testing (iPhone Safari, Android): **0.5–1 day**
- Buffer: **0.5 day**

**Dependency:** Requires feature flag if rolling out mid-demo (feature flag: `PROJECT_ATTACHMENTS_ENABLED`).

---

## 2. Wire 14 More Workflows into Project Spine v1 (THE FORMULAIC REFACTOR)

### 2.1 Current State

**Wired (working):** q2 (Quick Estimate), q4 (Contract Templates), q5 (Code Compliance)  
**Unwired (dead-ends):** q3, q6–q7, q8–q19, q20 (14 workflows total)

Each unwired workflow lacks:
- `useProjectWorkflowState` hook (no banner, no pre-fill, no autosave to column)
- `?project=<id>` redirect preservation
- `ProjectContextBanner` rendering
- Peer-workflow nav CTAs that preserve project ID

### 2.2 The Formulaic Refactor Pattern

Use `q4` (contracts) as the template (already in Spine v1). For each unwired workflow:

**Step 1:** Create state column in `projects` table

```sql
ALTER TABLE public.saved_projects 
ADD COLUMN IF NOT EXISTS <workflow>_state JSONB DEFAULT '{}';
```

Examples:
- `q8_permits_state JSONB`
- `q11_supply_ordering_state JSONB`
- `q15_daily_log_state JSONB`
- etc.

**Step 2:** Wrap workflow client in Suspense + import hook

```typescript
'use client';

import { Suspense } from 'react';
import { useProjectWorkflowState } from '@/lib/hooks/useProjectWorkflowState';
import { ProjectContextBanner } from '@/components/ProjectContextBanner';
import { WorkflowShell } from '@/design-system/WorkflowShell';

function SupplyOrderingClientInner() {
  const { 
    projectId, 
    hydratedPayloads, 
    recordStepEvent, 
    project, 
    loading 
  } = useProjectWorkflowState({
    column: 'q11_supply_ordering_state',
    workflowId: 'q11',
  });

  if (!projectId) return null; // Hook redirects if missing
  
  return (
    <>
      {project && <ProjectContextBanner project={project} />}
      <WorkflowShell
        workflowId="q11"
        hydratedPayloads={hydratedPayloads}
        onStepComplete={(event) => recordStepEvent({...event, workflowId: 'q11'})}
      />
    </>
  );
}

export default function SupplyOrderingPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SupplyOrderingClientInner />
    </Suspense>
  );
}
```

**Step 3:** Add `?project=<id>` to all CTA links in workflow

In `WorkflowShell` or per-step CTA:

```typescript
// OLD:
<Link href={`/killerapp/workflows/supply-ordering`}>
  Order supplies
</Link>

// NEW (preserves project):
<Link href={`/killerapp/workflows/supply-ordering?project=${projectId}`}>
  Order supplies
</Link>
```

**Step 4:** Test on prod

- Start a project on `/killerapp`
- Click into the newly wired workflow
- Verify banner renders + project data visible
- Fill a step, autosave fires (watch for "Saved · HH:MM" indicator)
- Close browser tab, reopen project URL
- Verify step data persists

### 2.3 Workflows to Wire (Priority Order)

| q ID | Workflow | Personas | Complexity | Est. Time |
|------|----------|----------|-----------|-----------|
| **q8** | Permit Applications | Pete (IL), Diana, John | Med (form-heavy) | 45 min |
| **q11** | Supply Ordering | Hank | Med (voice parse) | 40 min |
| **q15** | Daily Logbook | John, Hank, Maria | Med (voice + photos) | 45 min |
| **q20** | Change Orders | John | High (cost calc) | 50 min |
| **q21** | Payment Draws | John, Mari | High (% complete calc) | 50 min |
| **q22** | Lien Waivers | John | Med (batch generation) | 40 min |
| **q6** | Crew Scheduling | Maria, Hank | Low (static form) | 30 min |
| **q7** | Material Delivery | John, Maria | Low (static form) | 30 min |
| **q9** | Insurance Docs | John | Low (doc upload) | 30 min |
| **q10** | Equipment Inventory | Hank | Low (list view) | 30 min |
| **q12** | RFI Manager | Pete, Sarah | Med (back-and-forth) | 40 min |
| **q16** | OSHA Toolbox Talk | Hank | Low (template) | 30 min |
| **q17** | Receipt / Expense | John, Mari | Med (categorization) | 40 min |
| **q19** | Punch List | Hank | Low (checklist) | 30 min |

**Total: 530 minutes ≈ 8.8 hours ≈ 7–10 days for 1 engineer (includes testing + integration)**

### 2.4 Migration Script Skeleton

```bash
#!/bin/bash
# migrate_workflows.sh — run in Supabase SQL editor

# 1. Add state columns
ALTER TABLE public.saved_projects 
ADD COLUMN IF NOT EXISTS q8_permits_state JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS q11_supply_ordering_state JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS q15_daily_log_state JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS q20_change_orders_state JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS q21_payment_draws_state JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS q22_lien_waivers_state JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS q6_crew_scheduling_state JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS q7_material_delivery_state JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS q9_insurance_docs_state JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS q10_equipment_inventory_state JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS q12_rfi_manager_state JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS q16_osha_toolbox_state JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS q17_receipt_expense_state JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS q19_punch_list_state JSONB DEFAULT '{}';

# 2. Verify all columns added
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'saved_projects' AND column_name LIKE 'q%_state';
```

### 2.5 Time-to-Wire All 14

**Total: 7–10 days (1 engineer)**

- Column migrations: **1 day** (DDL + validation)
- Per-workflow client-side refactor: **7–9 days** (40–50 min avg × 14 workflows)
  - Repetitive copy-paste from q4 template
  - Test each workflow's autosave on prod
- Integration testing (navigate between workflows, verify state isolation): **1 day**

**Dependency:** None; can run in parallel with photo attachments work.

---

## 3. Multi-Project State Isolation Verification (MARI'S KILL-TEST)

### 3.1 The Test Scenario

**Requirement:** Mari opens 3 projects in 3 browser tabs simultaneously, edits both, closes one, and verifies data isolation.

**What can fail:**
- `useSearchParams()` getting project ID from wrong tab (unlikely, but architecture risk)
- `stateRef.current` being shared across tabs (each tab has its own window, so unlikely)
- RLS policy allowing cross-user reads (unlikely, but security risk)
- IndexedDB/localStorage cache colliding between projects (real risk if caching per-user vs per-project)

### 3.2 Integration Test (Cypress / Playwright)

**File:** `/app/tests/e2e/multi-project-isolation.cy.ts` (Cypress)

```typescript
describe('Multi-Project State Isolation (Mari Kill-Test)', () => {
  beforeEach(() => {
    cy.visit('https://builders.theknowledgegardens.com/killerapp');
    cy.login('mari@example.com'); // Mari's test account
  });

  it('Should isolate state across 3 concurrent project tabs', () => {
    // Seed 3 projects
    const projects = [
      { id: 'proj-a', name: 'Cypress Ridge Towers' },
      { id: 'proj-b', name: 'Tampa Waterfront' },
      { id: 'proj-c', name: 'Miami Beach Condo' },
    ];

    // 1. Create 3 projects via API (bulk seed)
    cy.task('seedProjects', projects).then((seeded) => {
      const [projA, projB, projC] = seeded;

      // 2. Open 3 tabs
      cy.visit(`/killerapp?project=${projA.id}`);
      const origWindow = cy.state('window');

      // Tab 2 (new window)
      cy.visit(`/killerapp?project=${projB.id}`, {
        _isNewWindow: true,
      });

      // Tab 3 (new window)
      cy.visit(`/killerapp?project=${projC.id}`, {
        _isNewWindow: true,
      });

      // 3. In Tab 1, enter "Quick Estimate" workflow
      cy.switchToTab(0); // Tab 1
      cy.contains('Estimate the job').click();
      cy.url().should('include', `project=${projA.id}`);

      // 4. Fill crew size in Tab 1: 6
      cy.get('[name="crew_size"]').type('6');
      cy.wait(1000); // Wait for autosave debounce
      cy.contains('Saved').should('be.visible');

      // 5. Switch to Tab 2, open same workflow
      cy.switchToTab(1); // Tab 2
      cy.contains('Estimate the job').click();
      cy.url().should('include', `project=${projB.id}`);

      // 6. Fill crew size in Tab 2: 12 (different value)
      cy.get('[name="crew_size"]').type('12');
      cy.wait(1000);
      cy.contains('Saved').should('be.visible');

      // 7. Switch back to Tab 1
      cy.switchToTab(0);

      // 8. Verify crew size is still 6 (not 12)
      cy.get('[name="crew_size"]').should('have.value', '6');

      // 9. Switch to Tab 3
      cy.switchToTab(2);

      // 10. Verify crew size is empty (never filled in Tab 3)
      cy.get('[name="crew_size"]').should('have.value', '');

      // 11. Close Tab 2
      cy.closeTab(1);

      // 12. Verify Tabs 1 & 3 still hold correct state
      cy.switchToTab(0);
      cy.get('[name="crew_size"]').should('have.value', '6');

      cy.switchToTab(1); // (was Tab 3, now Tab 2)
      cy.get('[name="crew_size"]').should('have.value', '');
    });
  });

  it('Should NOT allow cross-project data leakage via localStorage', () => {
    // Verify that localStorage keys are scoped by project_id
    // e.g., `killerapp:proj-a:workflow-cache` not `killerapp:workflow-cache`

    cy.visit(`/killerapp?project=proj-a`);
    cy.window().then((win) => {
      const keysA = Object.keys(win.localStorage);
      expect(keysA.some((k) => k.includes('proj-a'))).to.be.true;
    });

    cy.visit(`/killerapp?project=proj-b`);
    cy.window().then((win) => {
      const keysB = Object.keys(win.localStorage);
      expect(keysB.some((k) => k.includes('proj-b'))).to.be.true;
      expect(keysB.some((k) => k.includes('proj-a'))).to.be.false;
    });
  });

  it('Should maintain RLS isolation at DB level', () => {
    // Verify that a direct API call to fetch proj-b data while viewing proj-a fails

    cy.visit(`/killerapp?project=proj-a`);
    cy.request({
      method: 'GET',
      url: '/api/v1/projects?id=proj-b', // Fetch wrong project
      failOnStatusCode: false,
    }).then((response) => {
      // Should return 403 or empty row (RLS blocks read)
      expect([403, 200]).to.include(response.status);
      if (response.status === 200) {
        expect(response.body).to.deep.equal({}); // Empty
      }
    });
  });
});
```

### 3.3 Success Criteria for Mari Kill-Test

- **State isolation:** Tab A's crew size remains 6 even after Tab B writes 12
- **No cache collision:** localStorage keys are namespaced by project_id
- **RLS enforced:** API call for wrong project returns 403 or empty
- **Rapid switching:** Switch between 3 tabs 10 times in <5 seconds, no state cross-talk
- **Tab closure:** Closing Tab 2 doesn't affect Tabs 1 & 3

---

## 4. INP Performance Investigation (1–4s Spikes on Button Clicks)

### 4.1 Root Cause Hypothesis

Chrome flagged two high INP (Interaction to Next Paint) events during testing:
- `1024ms` on search submit (on `/killerapp`)
- `4219ms` on step expansion (on workflow page)

**Likely culprits (in order of probability):**

1. **Journey-progress write on every step completion** — `recordStepEvent` calls `authedFetch` PATCH immediately (before debounce fires). If the PATCH includes calculating step % complete across all 20 workflows, that's expensive.

2. **Scroll observer thrashing** — `WorkflowShell` may have a ResizeObserver or IntersectionObserver that re-calculates step heights on every keystroke (e.g., when autosave badge appears/disappears).

3. **AI banner re-render** — `ProjectContextBanner` may be un-memoized, causing full re-render on every `useProjectWorkflowState` state change.

4. **Large JSONB hydration** — Fetching `project_conversations` or `estimating_state` JSONB columns without pagination on a big project (many steps) causes blocking deserialization.

### 4.2 Diagnosis Steps

**Day 1: Profile in Chrome DevTools**

```bash
# On prod, open DevTools → Performance tab
1. Record a 10-second session
2. Search → Enter text → Click submit
3. Stop recording
4. Look for long tasks (>50ms) in the flame chart
5. Identify the function that's blocking:
   - authedFetch() call?
   - JSON.parse on JSONB response?
   - stateRef.current update?
   - Re-render of large component tree?
```

**If culprit is journey-progress PATCH:**
- Add `console.time('journey-patch')` before PATCH, `console.timeEnd()` after response
- Measure if PATCH takes >500ms
- If yes, profile the server-side calculation (likely in `/api/v1/projects` PATCH handler)

**If culprit is scroll observer:**
- Check `WorkflowShell.tsx` for ResizeObserver, IntersectionObserver, or onScroll handlers
- Profile with DevTools → Performance → "Layout Thrashing" detector

**If culprit is banner re-render:**
- Add `console.log('ProjectContextBanner re-render')` with a counter
- Verify it only re-renders 1x on load, not on every keystroke

### 4.3 Fix Strategies (by culprit)

**If: Journey-progress write is blocking**

```typescript
// OLD (blocking):
const recordStepEvent = useCallback((...) => {
  stateRef.current = { ...stateRef.current, [stepId]: payload };
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => void flush(), debounceMs);
  // PATCH fires immediately after 500ms
}, [...]);

// NEW (non-blocking):
const recordStepEvent = useCallback((...) => {
  stateRef.current = { ...stateRef.current, [stepId]: payload };
  if (debounceRef.current) clearTimeout(debounceRef.current);
  
  // Schedule flush on next idle() frame (doesn't block paint)
  if ('requestIdleCallback' in window) {
    debounceRef.current = window.requestIdleCallback(flush);
  } else {
    debounceRef.current = setTimeout(() => void flush(), debounceMs);
  }
}, [...]);
```

**If: Scroll observer is thrashing**

```typescript
// OLD (observer fires on every resize):
useEffect(() => {
  const observer = new ResizeObserver(() => {
    recalculateStepHeights(); // Expensive
  });
  observer.observe(scrollContainer);
  return () => observer.disconnect();
}, []);

// NEW (debounce observer):
useEffect(() => {
  let timeoutId: number;
  const observer = new ResizeObserver(() => {
    clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      recalculateStepHeights();
    }, 100); // Debounce 100ms
  });
  observer.observe(scrollContainer);
  return () => {
    clearTimeout(timeoutId);
    observer.disconnect();
  };
}, []);
```

**If: Banner re-render is expensive**

```typescript
// OLD (uncontrolled re-render):
function ProjectContextBanner({ project }) {
  return <div>{project.name} - {project.ai_summary}</div>;
}

// NEW (memoized):
const ProjectContextBanner = React.memo(
  function ProjectContextBanner({ project }) {
    return <div>{project.name} - {project.ai_summary}</div>;
  },
  (prev, next) => prev.project.id === next.project.id // Custom equality
);
```

### 4.4 Time-to-Fix

**Investigation: 4–6 hours** (profile, identify culprit, validate hypothesis)  
**Fix implementation: 2–4 hours** (apply fix, test, deploy)  
**Total: 6–10 hours (1 engineer)**

---

## 5. Permissions & Sharing Model for v2 (MARI'S ROLE-BASED DELEGATION)

### 5.1 Current State (Permissive RLS)

Today, `project_attachments` and `saved_projects` RLS allows:
- Project owner (user_id) can read/write all project data
- Anyone with project URL can see project (if RLS is accidentally permissive)
- No role model (no foreman vs PM vs GC distinction)

**Problem:** Mari wants to delegate "daily-log" to a foreman but lock "code-compliance" for just her. Today: all-or-nothing.

### 5.2 Future Model: `project_collaborators` Table

Design (not building in v1, but spec for future):

```sql
CREATE TABLE IF NOT EXISTS public.project_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  collaborator_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'pm', 'foreman', 'sub', 'viewer')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  permissions JSONB DEFAULT '{"read_all": true}',
  -- { "read_all", "edit_daily_log", "edit_estimates", "edit_codes", etc. }
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT fk_collaborators_project FOREIGN KEY (project_id) REFERENCES public.saved_projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_collaborators_user FOREIGN KEY (collaborator_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(project_id, collaborator_id)
);

-- RLS: Users can see collaborators on their own projects
CREATE POLICY "Users can view collaborators on their projects" ON public.project_collaborators
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.saved_projects 
      WHERE saved_projects.id = project_collaborators.project_id 
      AND saved_projects.user_id = auth.uid()
    )
  );

-- RLS: Project owner can invite collaborators
CREATE POLICY "Project owners can manage collaborators" ON public.project_collaborators
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.saved_projects 
      WHERE saved_projects.id = project_collaborators.project_id 
      AND saved_projects.user_id = auth.uid()
    )
  );
```

### 5.3 RLS Policy Pattern (For Wired Workflows)

Example for `q15_daily_log_state`:

```sql
-- OLD: Anyone with ?project=<id> can edit (permissive)
CREATE POLICY "Users can edit daily logs on projects they access" ON public.saved_projects
  FOR UPDATE USING (auth.uid() = user_id OR <permissive>);

-- NEW: Role-gated
CREATE POLICY "Users can edit daily logs if they have edit permission" ON public.saved_projects
  FOR UPDATE USING (
    auth.uid() = user_id OR -- Owner
    EXISTS (
      SELECT 1 FROM public.project_collaborators
      WHERE project_collaborators.project_id = saved_projects.id
      AND project_collaborators.collaborator_id = auth.uid()
      AND (
        project_collaborators.role IN ('pm', 'foreman') OR
        project_collaborators.permissions->>'edit_daily_log' = 'true'
      )
    )
  );
```

### 5.4 Frontend Workflow Gating

In WorkflowShell, check role before rendering edit CTAs:

```typescript
export function WorkflowShell({ workflowId, project, collaborators, ...rest }) {
  const userRole = collaborators.find((c) => c.collaborator_id === auth.uid())?.role || 'viewer';
  const canEditDailyLog = project.user_id === auth.uid() || userRole === 'foreman';

  return (
    <div>
      {canEditDailyLog ? (
        <StepCard {...rest} />
      ) : (
        <div className="read-only">
          You don't have permission to edit this workflow. Contact the project owner.
        </div>
      )}
    </div>
  );
}
```

### 5.5 Scope for v2

- Design invite flow (email + one-time token or magic link)
- Role + permission matrix documentation
- Update RLS policies on all workflow state columns
- Frontend role checks + disabled CTA styling
- Estimated effort: **3–5 days (1 engineer)** — defer to Q2 roadmap

---

## 6. Additional Findings & Quick Fixes

### 6.1 Cost Parser `$1.4M` Format (B-3 in findings)

**Issue:** AI parser in `/api/v1/copilot/route.ts` misses million-dollar ranges.

**Fix (10 min):**

```typescript
// OLD:
const COST_RANGE_PATTERNS = [
  /\$(\d+(?:,\d{3})*(?:\.\d+)?)\s*-\s*\$(\d+(?:,\d{3})*(?:\.\d+)?)/g,
  /(\d+(?:,\d{3})*)\s*(?:k|K|thousand)\s*-\s*(\d+(?:,\d{3})*)\s*(?:k|K|thousand)/g,
];

// NEW:
const COST_RANGE_PATTERNS = [
  /\$(\d+(?:,\d{3})*(?:\.\d+)?)\s*-\s*\$(\d+(?:,\d{3})*(?:\.\d+)?)/g,
  /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:k|K|thousand)\s*-\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:k|K|thousand)/g,
  /\$(\d+(?:\.\d+)?)\s*(?:m|M|million)\s*-\s*\$(\d+(?:\.\d+)?)\s*(?:m|M|million)/g,
];

// Parse and convert to cents:
function extractCostRange(input: string) {
  for (const pattern of COST_RANGE_PATTERNS) {
    const match = pattern.exec(input);
    if (match) {
      let low = parseFloat(match[1].replace(/,/g, ''));
      let high = parseFloat(match[2].replace(/,/g, ''));
      
      // Check which suffix was matched
      if (input.includes('m') || input.includes('M')) {
        low *= 1_000_000;
        high *= 1_000_000;
      } else if (input.includes('k') || input.includes('K')) {
        low *= 1_000;
        high *= 1_000;
      }
      
      return { estimated_cost_low: low, estimated_cost_high: high };
    }
  }
  return null;
}
```

**Test:** "ADU cost should be $1.4M-$1.8M" → parses to `1_400_000` and `1_800_000` ✓

---

### 6.2 Jurisdiction Context Propagation (B-2)

**Issue:** Code-compliance defaults to "IBC 2024 Generic" even when project.jurisdiction is "San Diego, CA".

**Fix (5 min in `CodeComplianceClient.tsx`):**

```typescript
export function CodeComplianceClient({ projectId, project }) {
  const [jurisdiction, setJurisdiction] = useState<string>(() => {
    // Auto-default from project if available
    if (project?.jurisdiction) {
      return project.jurisdiction; // e.g., "San Diego, CA"
    }
    return 'IBC 2024 (International), US'; // Fallback
  });

  return (
    <JurisdictionPicker
      value={jurisdiction}
      onChange={setJurisdiction}
      project={project}
    />
  );
}
```

---

## 7. Summary Table: Fixes by Timeline

| Fix | Priority | Effort | Owner | v1.0 Status | v1.1 Target |
|-----|----------|--------|-------|------------|-------------|
| Photo/Video Attachments (G-1) | CRITICAL | 5–7d | 1 eng | NOT BUILT | May 13–17 |
| Wire 14 workflows (B-1) | CRITICAL | 7–10d | 1 eng | PARTIAL (3/17) | May 13–20 |
| Multi-project isolation test (SPINE-6) | HIGH | 2d | QA | UNTESTED | May 10–12 |
| INP performance fix (B-4) | HIGH | 6–10h | 1 eng | IDENTIFIED | May 12–13 |
| Cost parser $1.4M (B-3) | MEDIUM | 10m | 1 eng | BROKEN | May 6 |
| Jurisdiction propagation (B-2) | MEDIUM | 5m | 1 eng | BROKEN | May 6 |
| Role-based permissions (v2 spec) | MEDIUM | 3–5d | 1 eng | DESIGN ONLY | June |
| Multi-jurisdiction data (G-2) | MEDIUM | Data work | PM + Eng | CA/NV only | June |

---

## 8. Recommended Rollout Sequence (Next 14 Days)

### Week 1 (May 6–10)

**Monday–Tuesday (May 6–7):**
- Fix cost parser (10 min) — unblocks estimate testing
- Fix jurisdiction propagation (5 min) — Code Compliance UI improves
- Deploy to prod, verify John demo tests pass

**Wednesday–Friday (May 8–10):**
- Photo/Video feature: start DB schema + Storage bucket setup
- Wire q8 (permits), q11 (supply), q15 (daily-log) as pilot
- QA: Run Mari kill-test (SPINE-6 multi-tab isolation) — should pass with existing hook
- Commit: Feature flag `PROJECT_ATTACHMENTS_ENABLED` (false by default)

### Week 2 (May 13–17)

**Monday–Thursday (May 13–16):**
- Complete photo/video upload component + gallery
- Wire remaining 11 workflows (q6, q7, q9, q10, q12, q16, q17, q19, q20, q21, q22)
- INP performance investigation + fix deployment

**Friday (May 17):**
- Regression testing across all 17 workflows
- John demo dry-run (all 6 critical test cases)
- Enable `PROJECT_ATTACHMENTS_ENABLED` feature flag on stage environment

### Week 3+ (Post-Demo)

- Gather feedback from John demo
- Phase 2: role-based permissions, multi-jurisdiction data, offline mode

---

## Appendix: Files to Update

1. `/app/supabase/migrations/20260506_project_attachments.sql` (new)
2. `/app/src/components/ProjectAttachmentUpload.tsx` (new)
3. `/app/src/components/ProjectAttachmentGallery.tsx` (new)
4. `/app/src/lib/hooks/useProjectWorkflowState.ts` (no changes; works as-is)
5. `/app/src/components/KillerappProjectShell.tsx` (integrate gallery)
6. `/app/src/components/ProjectContextBanner.tsx` (no changes; works as-is)
7. `/app/src/routes/killerapp/workflows/[id]/page.tsx` × 14 (wire hooks)
8. `/app/api/v1/copilot/route.ts` (cost parser fix)
9. `/app/src/pages/code-compliance/CodeComplianceClient.tsx` (jurisdiction default)
10. `/app/tests/e2e/multi-project-isolation.cy.ts` (new, Mari kill-test)

---

## Sign-Off

**Infrastructure Review:** Spine v1 is solid. Photo attachments, workflow wiring, and performance tuning are prerequisite to John demo. Role-based permissions move to v1.1 (post-demo feedback loop).

**Recommended Go/No-Go:** Fix costs B-2, B-3 (15 min), run SPINE-6 test (2h), then commit to photo + 14-workflow wire (14 days total).


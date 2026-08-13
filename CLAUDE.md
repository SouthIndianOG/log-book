# CLAUDE.md — Fellowship Case Logbook

## Standing rule: ask, don't assume

Whenever a request, this spec, or the existing code leaves the right
approach unclear or underspecified, **stop and ask the user a clarifying
question instead of guessing**. This app has one real user with specific
workflow needs (a fellow logging cases on the ward and in OPD) — a wrong
assumption costs more than a short pause to ask. This applies to schema
changes, UI behavior, offline/sync semantics, and anything not explicitly
pinned down below.

## Project overview

A personal, single-user case-logging PWA for Dr. Prashantha G., built for
frictionless daily logging of inpatient ward cases (multi-day threads) and
high-volume OPD procedures, culminating in exportable logs for fellowship
submission (WLH F.MAS now; future ART/IVF fellowship). Every table carries
`user_id` from day one so the schema supports multiple users later without
a migration, but the UI targets a single user only — no auth/role UI is
needed for v1.

## Tech stack

- **Frontend:** React + TypeScript + Vite + Tailwind
- **PWA:** installable, offline-first (see Offline Architecture below)
- **Local store:** IndexedDB via Dexie.js — primary read/write layer for
  the whole app
- **Backend:** Supabase (Postgres + Auth + Storage + RLS) — a sync target,
  not the live data source for rendering
- **Auth:** Supabase email/password, single user initially
- **Hosting:** GitHub Pages, deployed via GitHub Actions

## Deploy specifics

- **Repo name:** `log-book`
- **Custom domain:** `logbook.southindianog.com` (Cloudflare DNS, CNAME →
  `southindianog.github.io`, DNS-only/unproxied so GitHub can issue its own
  HTTPS cert — can switch to proxied later once confirmed working). Because
  a custom domain serves from root, `vite.config.ts` sets `base: '/'` (not
  a repo-name subpath), and `public/CNAME` contains the domain so GitHub
  Pages knows which repo owns it — both must stay in sync if the domain
  ever changes.
- Repo is **public** — GitHub Pages requires either a public repo or a paid
  plan for private-repo Pages on personal accounts (confirmed against the
  actual account; the original assumption that private repos got free Pages
  was wrong). No patient data lives in the repo (that's in Supabase/local
  IndexedDB only), so a public repo is fine — only app source is visible.
- Workflow needs `permissions: pages: write, id-token: write`.
- Because the app is offline-first via a service worker, use a
  cache-busting/versioned build (`vite-plugin-pwa` handles this) so a new
  deploy is reliably picked up on next app open rather than serving a stale
  cached shell.

## Offline architecture (core requirement, not an add-on)

Single-user app used exclusively on one phone — optimize hard for
**instant open, log-anywhere, sync-when-possible**. No loading spinners, no
"waiting for network" states ever blocking a log entry.

1. **Local database is the source of truth for the UI.** Reads and writes
   go to Dexie first, always.
2. **Every write is instant and optimistic.** Tapping "Stable, no
   complaints" writes locally and updates the UI in the same frame (target:
   <100ms perceived). Sync to Supabase happens silently in the background.
3. **Cold start must be fast.** Service worker precaches the app shell;
   Active Cases renders from local DB immediately on open — no network
   round-trip before first paint.

**Sync layer — outbox pattern:**
- Every local write (case create, entry log, discharge, OPD entry,
  attachment) writes to local tables AND appends to a local `sync_queue`
  table.
- A background sync process (on app foreground, on `navigator.onLine`
  reconnect, and periodically) drains the queue: pushes queued writes to
  Supabase, pulls remote changes, clears queue entries on success.
- **Conflict handling:** single-user-single-device at launch → conflicts
  are near-impossible. Use simple last-write-wins via `updated_at`. Do not
  build CRDT-level complexity now — revisit only if a second device/user is
  ever added.
- **Attachments:** photo capture saves to local IndexedDB as a blob
  immediately, queued for upload to Supabase Storage once online. Thumbnail
  shows immediately from the local blob regardless of upload state.
- **Install/PWA:** proper manifest (icons, `display: standalone`, theme
  color) for add-to-home-screen, no browser chrome.
- **Sync status UI:** small unobtrusive indicator (e.g. dot: green synced /
  grey pending), never a blocking banner. If Supabase is unreachable for
  days, the app functions identically — the queue just grows and drains
  later.

## Data model (Postgres/Supabase — the sync target)

Dexie mirrors these same shapes locally, plus a `sync_queue` table not
present in Postgres.

```sql
-- Mode 1: Ward / Active Cases
create table cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  patient_name text not null,
  patient_age int,
  patient_ref text,
  diagnosis text,
  procedure text,
  role text not null default 'performed', -- performed | assisted | observed
  admit_date date not null,
  status text not null default 'active', -- active | discharged
  discharge_date date,
  discharge_outcome text,
  discharge_followup text,
  fellowship_tag text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create table case_entries (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  entry_date date not null,          -- supports backfill
  post_op_day int,                   -- auto-calc from admit_date, editable
  note text,
  is_stable_quicklog boolean default false,
  complication_type text,
  complication_detail text,
  logged_at timestamptz default now(),
  is_backfill boolean default false,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create table complication_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  label text not null,
  is_default boolean default false,
  usage_count int default 0
);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references case_entries(id) on delete cascade,
  opd_entry_id uuid references opd_entries(id) on delete cascade,
  storage_path text not null,
  file_type text,
  uploaded_at timestamptz default now()
);

-- Mode 2: OPD Quick Log
create table opd_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  procedure_type text not null,      -- usg | mtp | contraception | gdm | ectopic_hcg | other
  patient_name text not null,
  patient_ref text,
  entry_date date not null default current_date,
  gestational_age text,

  -- USG fields
  usg_scan_type text,                -- early_viability | nt | anomaly_tiffa | growth_doppler | follicular | gynae_pelvic | other
  usg_findings text,
  usg_efw numeric,                   -- in grams
  usg_afi numeric,                   -- in cm
  usg_followup_needed boolean default false,
  usg_followup_date date,

  -- MTP fields
  mtp_method text,                   -- medical | surgical_mva | surgical_de
  mtp_indication text,
  mtp_complication text,

  -- Contraception fields
  contraception_method text,         -- ppiucd | cu_t | lng_ius_mirena | dmpa_depo | ocps | tubectomy | implanon | other
  contraception_action text,         -- insertion | administration | prescription | removal
  contraception_due_date date,       -- next dose / expiry date
  contraception_notes text,

  -- GDM fields
  gdm_visit_type text,               -- new | follow_up
  gdm_fasting_value numeric,         -- mg/dL
  gdm_pp_value numeric,              -- mg/dL
  gdm_management text,               -- diet | metformin | insulin
  gdm_next_visit_date date,

  -- Ectopic hCG fields
  ectopic_mgmt_type text,            -- medical_mtx | post_op | expectant
  ectopic_hcg_value numeric,         -- mIU/mL
  ectopic_day_num int,               -- Day 1, 4, 7, 14, etc.
  ectopic_mass_size text,
  ectopic_symptoms text,             -- pain | bleeding | asymptomatic
  ectopic_next_hcg_date date,

  -- Histopathology (HPE) tracking
  hpe_status text default 'none',    -- none | pending | received
  hpe_notes text,

  other_description text,
  fellowship_tag text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);
```

Seed `complication_types` with defaults: Bleeding, Infection, Fever, Wound
issue, Other. Free-text entries under "Other" insert with `is_default =
false` so they appear in future autocomplete, ranked by `usage_count`.

## Mode 1 — Ward / Active Cases (behavior summary)

### Scope

Logs **everything** done on the ward — obstetric (LSCS, NVD, instrumental,
PPH management) and gynaecological (laparoscopic and open procedures,
hysteroscopy, etc.). Fellowship-specific filtering (e.g. MAS cases only)
happens at the **Export** screen via `fellowship_tag`, not at entry time.
Ectopic serial beta-hCG follow-up is managed in **OPD** (Mode 2), not here.

### Home list

Sorted by staleness (`now() - max(logged_at)` desc — longest unlogged on
top; zero-entries-today sorts above logged-today). Row:
`patient_name — diagnosis/procedure, POD{n} — last logged {Xh/Xd} ago`.
Status chip (not logged / logged ✓ / flagged). Counter: "6/9 logged today".
Filter toggle: unlogged only. **No bed/location sort** — deliberately
omitted.

### Procedure field

Uses the **autocomplete & deduplication convention** (see Conventions).
Curated seed list (shown first in picker):

**Obstetric:**
LSCS, NVD, Instrumental delivery (Vacuum), Instrumental delivery (Forceps),
Breech delivery, PPH management, Manual removal of placenta,
Cervical encerclage, ECV, Hysterotomy

**Gynaecological – Laparoscopic:**
Laparoscopic hysterectomy (TLH), Laparoscopic hysterectomy (LAVH),
Laparoscopic myomectomy, Laparoscopic ovarian cystectomy,
Laparoscopic salpingectomy, Laparoscopic salpingo-oophorectomy,
Laparoscopic adhesiolysis, Diagnostic laparoscopy,
Laparoscopic endometriosis excision, Laparoscopic pelvic floor repair

**Gynaecological – Open / Vaginal:**
Abdominal hysterectomy, Abdominal myomectomy,
Hysteroscopy (diagnostic), Hysteroscopy (operative),
D&C, MVA, Colposcopy, Vulvectomy, Anterior colporrhaphy,
Posterior colporrhaphy, Fothergill repair, Vaginal hysterectomy

**Other:** (free-text, persisted per convention)

### Quick-log (tap row) — bottom sheet, two-tier

**Primary (one-tap):** single large **"Stable, no complaints"** button →
instant save, `entry_date = today`, auto-calc `post_op_day`,
`is_stable_quicklog = true`. Returns to list immediately.

**Secondary (expandable):** structured fields the user fills selectively —
none are mandatory beyond the primary tap:

- **Vitals (quick-tap row):**
  - Temp °C — numeric field, auto-flags red if ≥ 38.0
  - BP — two fields: systolic / diastolic (mmHg)
  - HR — numeric (bpm)
  - SpO₂ — numeric (%)
  - Pain score — NRS 0–10 stepper or tap chips (0 / 2 / 4 / 6 / 8 / 10)

- **Status toggles (icon chips, tap to cycle):**
  - **Diet:** Nil → Sips → Soft → Full
  - **Ambulation:** Bed rest → Assisted → Walking
  - **Catheter:** In → Removed today
  - **Drain:** In → Removed today; if In: optional output field (ml) +
    colour chip (serous / serosanguinous / haemorrhagic)
  - **IV access:** In → Discontinued
  - **Flatus/Bowel:** Flatus ✓ / Bowel opened ✓ (independent checkboxes)

- **Free-text note** — open field for anything not captured above.
- **Complication flag** — autocomplete/free-text (same convention as
  complication_types). Seeded defaults: Bleeding, Infection, Fever,
  Wound issue, Urinary, VTE concern, Other.
- **Photo** — optional, async upload.

Save returns to list immediately.

### Discharge

Sheet with:
- Discharge date (default today)
- Condition at discharge: chip pick — Stable / Fair / Guarded / AMA
- Discharge outcome: free-text
- Follow-up plan: free-text (e.g. "OPD in 1 week, wound review")
- Follow-up date: date picker (optional)

On save, case moves to archive (status = `discharged`).

### Recall / Backfill

Separate entry point ("Log earlier visit"). Search by patient name (not
bed/location). Pick date → quick-log sheet with `entry_date` = chosen date,
`is_backfill = true`. Does not affect today's staleness sort for other cases.

### Evening nudge

Real Web Push at **5 pm IST** daily if any active case has no entry with
`entry_date = today`. Tap opens Home filtered to unlogged-only. Implemented
via a Supabase Cron Job triggering an Edge Function — see "Evening nudge
(resolved)" below for the full mechanism.

## Mode 2 — OPD Quick Log (behavior summary)

### Home (Type Picker)

Six large grid buttons: **USG · MTP · Contraception · GDM · Ectopic hCG · Other**.
Last-used type highlighted for one-tap repeat.

Top Badge bar: **"OPD Action Items (N)"** showing pending tasks:
- **GDM due:** `gdm_next_visit_date <= today`
- **Ectopic hCG due:** `ectopic_next_hcg_date <= today`
- **USG review due:** `usg_followup_date <= today`
- **HPE Pending:** `hpe_status = 'pending'`

Tapping the badge opens a unified **OPD Action Items** drawer/screen to review or clear pending items.

### Per-Category Forms & Quick-Taps

1. **USG (Ultrasound)**
   - Scan Type chips: Early Viability · NT · Anomaly/TIFFA · Growth/Doppler · Follicular · Gynae Pelvic · Other
   - GA (Gestational Age text)
   - Quick Findings chips + free-text (Normal, Oligohydramnios, FGR/IUGR, Placenta Previa, Ovarian Cyst, Fibroid, RPOC)
   - Optional EFW (g) & AFI (cm) fields
   - Follow-up needed toggle (Yes/No) + 1-tap quick dates (+1 wk, +2 wks, +4 wks, or picker)

2. **MTP (Termination of Pregnancy)**
   - GA (weeks/days)
   - Method chips: Medical (Mife+Miso) · Surgical (MVA) · Surgical (D&E)
   - Indication autocomplete/free-text (Failure of contraception, Congenital anomaly, Maternal health, Unplanned)
   - Complication check / Outcome (Complete expulsion, RPOC, Heavy bleeding, Infection)
   - HPE Pending toggle if tissue sent

3. **Contraception / Family Planning**
   - Method chips: PPIUCD · Interval Cu-T · LNG-IUS (Mirena) · DMPA (Depo) · OCPs · Tubectomy · Implanon · Other
   - Action chips: Insertion · Administration · Prescription · Removal
   - 1-tap Auto-Calculated Target Dates:
     - DMPA: **+12 weeks (+90 days)**
     - Mirena / LNG-IUS: **+5 years**
     - Cu-T 380A: **+10 years**
     - Manual date picker fallback
   - Notes / Side-effects free-text

4. **GDM (Gestational Diabetes)**
   - Visit Type: New / Follow-up
   - GA (weeks/days)
   - Blood Sugar: Fasting (mg/dL) & Post-Prandial 2hr (mg/dL)
   - Management mode chips: Diet alone · Metformin · Insulin
   - 1-tap Next Visit chips (+1 wk, +2 wks, +4 wks) → updates `gdm_next_visit_date`

5. **Ectopic Pregnancy hCG Tracker**
   - Management Type: Medical (MTX) · Post-op follow-up · Expectant
   - Serial Beta-hCG (mIU/mL) + Day step buttons (**Day 1, Day 4, Day 7, Day 14**)
   - 1-tap Next hCG Due Date:
     - If Day 1 logged → 1-tap auto-suggest **Day 4 (+3 days)**
     - If Day 4 logged → 1-tap auto-suggest **Day 7 (+3 days)**
     - If Day 7 logged → 1-tap auto-suggest **Day 14 (+7 days)**
   - Adnexal mass size (USG mm/cm) & Symptom chips (Pain, Bleeding, Asymptomatic)

6. **Other OPD Procedures & Consults**
   - Autocomplete procedure field using global title-case convention (Pap Smear, Colposcopy & Biopsy, Polyp Excision, IUD Removal, Infertility/IUI, High-Risk Obs Consult)
   - Free-text clinical notes
   - HPE Pending toggle (Yes/No) with notes field

### HPE (Histopathology) Tracking Workflow

- Any OPD form (or Ward Discharge sheet) has a **"Tissue sent for HPE"** toggle.
- When toggled ON, `hpe_status` sets to `'pending'`.
- It appears under **OPD Action Items → HPE Pending**.
- Tapping a pending item opens a quick modal to enter the biopsy result text and mark as `'received'`, moving it off the pending list.

## Export (fellowship submission & personal logs)

Dedicated screen for viewing, filtering, and exporting logbook data.

### Filters
- **Date Range:** Preset chips (*This Month · Last 3 Months · Fellowship Year · All Time*) + custom date range picker.
- **Case Mode:** All / Inpatient Ward only / OPD Quick Log only.
- **Fellowship Tag:** Filter by tag (e.g. `F.MAS`, `ART/IVF`, `All`).
- **Surgical Role:** All / Performed only / Assisted only / Observed only.

### Output Table & CSV Export
- **Screen View:** Interactive, sortable datatable with search bar.
- **CSV Download:** One-tap export generating a clean `.csv` file formatted for Excel or direct submission.
- **Columns included in export:**
  - Date (Admit date for Ward / Visit date for OPD)
  - Mode (Inpatient / OPD)
  - Patient Ref / IPD No.
  - Patient Name
  - Age
  - Diagnosis / Scan / Visit Type
  - Procedure Performed
  - Surgical Role (Performed / Assisted / Observed)
  - Fellowship Tag
  - Outcome / Findings / Complications
  - HPE Status / Result

## Folder structure

```
src/
  features/
    auth/        # single email/password login screen, session gating
    cases/       # Mode 1: active cases, quick-log, discharge, recall
    opd/         # Mode 2: type picker, per-type forms, GDM follow-ups
    export/      # fellowship export screen
  lib/
    db/          # Dexie schema + local read/write helpers
    sync/        # outbox drain logic, conflict resolution
    supabase/    # Supabase client, typed queries
  components/    # shared UI (buttons, sheets, list rows)
```

## Conventions

- **Package manager:** npm — do not introduce yarn/pnpm lockfiles.
- **Testing:** no automated tests required for minor edits/fixes. After
  completing a major feature or build milestone, add Vitest tests —
  prioritize the sync/offline-queue logic (`lib/sync`), since it's the
  highest-risk, hardest-to-manually-verify part of the app.
- No prescribed component library beyond Tailwind; keep UI dependencies
  minimal given this is a single-user PWA optimized for instant load.

### Autocomplete & deduplication convention (apply wherever noted)

Any field that accepts a user-defined label (procedure type, complication
type, diagnosis, etc.) uses this pattern:

1. **Curated seed list** — hard-coded defaults shown first (see per-feature
   sections for the specific list).
2. **Free-text fallback** — if the user types something not in the list,
   accept it as-is and persist it.
3. **Case-insensitive storage** — before inserting any user-typed label,
   normalise to title-case (`"laparoscopic hysterectomy"` →
   `"Laparoscopic Hysterectomy"`) so the same term is never stored twice
   with different capitalisation. Display always in title-case.
4. **Autocomplete from existing entries** — the autocomplete dropdown
   merges the curated list with all distinct values already in the local DB
   for that field (case-insensitively deduplicated). Rank: exact prefix
   match first, then usage-count desc.
5. **Case-insensitive comparison everywhere** — all duplicate checks,
   search filters, and "already exists" guards use
   `value.trim().toLowerCase()` for comparison, never raw string equality.
6. **No separate lookup table needed** — derive the dynamic portion of the
   autocomplete list on the fly from the live data table (e.g. `cases.procedure`),
   not from a separate tags/labels table, unless usage_count ranking becomes
   necessary (add a lookup table only then).

## Explicit non-goals (v1)

- No multi-user / role permissions UI (schema supports it, UI doesn't need
  it yet)
- No sync with Janani EHR (future export-in, not built now)
- No cross-device conflict resolution beyond last-write-wins (single
  device, single user — revisit only if a second device is ever added)
- No bed/ward location tracking (explicitly rejected — too unstable)

## Auth (resolved)

Single account only, created directly (not via a signup form) —
`disable_signup` is set `true` on the Supabase project, so
`src/features/auth/AuthScreen.tsx` is sign-in only. If a second device or
a password reset is ever needed, create/update the user directly via the
Supabase dashboard or Auth Admin API — do not re-enable public signup
without asking first, since that reopens account creation to anyone
holding the anon key.

## Resolved open items

- **PWA icon**: kept as the placeholder navy square (`public/pwa-icon.svg`)
  by user choice — swap anytime, it's a one-file change, not blocking.
- **Evening nudge**: real Web Push (VAPID + service worker push handler +
  a scheduled Supabase Edge Function), not a foreground-only timer — user
  confirmed it needs to fire even if the PWA is fully closed. Being built
  as its own phase (`push_subscriptions` table, Edge Function, Cron Job).

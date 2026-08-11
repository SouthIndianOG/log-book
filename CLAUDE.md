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
  patient_ref text,
  diagnosis text,
  procedure text,
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
  procedure_type text not null,      -- usg | mtp | contraception | gdm | other
  patient_name text not null,
  patient_ref text,
  entry_date date not null default current_date,
  gestational_age text,
  usg_findings text,
  usg_followup_needed boolean,
  usg_followup_date date,
  mtp_method text,
  mtp_complication text,
  contraception_method text,
  contraception_notes text,
  gdm_visit_type text,               -- new | follow_up
  gdm_fasting_value numeric,
  gdm_pp_value numeric,
  gdm_next_visit_date date,
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

- **Home:** sorted by staleness (`now() - max(logged_at)` desc — longest
  unlogged on top; zero-entries-today sorts above logged-today). Row:
  `patient_name — diagnosis/procedure, POD{n} — last logged {Xh/Xd} ago`.
  Status chip (not logged / logged ✓ / flagged). Counter: "6/9 logged
  today". Filter toggle: unlogged only. **No bed/location sort** —
  deliberately omitted.
- **Quick-log (tap row):** bottom sheet, two-tier. Primary: single large
  **"Stable, no complaints"** button → instant save, `entry_date = today`,
  auto-calc `post_op_day`, `is_stable_quicklog = true`. Secondary
  (expand): free-text note, complication autocomplete/free-text, optional
  photo (async upload). Save returns to list immediately.
- **Discharge:** sheet with outcome, follow-up plan, discharge date
  (default today). On save, case drops to archive.
- **Recall/Backfill:** separate entry point ("Log earlier visit"). Search
  by patient name (not bed/location). Pick date → quick-log sheet with
  `entry_date` = chosen date, `is_backfill = true`. Does not affect today's
  staleness sort for other cases.
- **Evening nudge:** local push ~8–9pm (configurable) if any active case
  has no entry with `entry_date = today`. Tap opens Home filtered to
  unlogged-only. *(Notification permission/implementation details not yet
  pinned down — ask before building.)*

## Mode 2 — OPD Quick Log (behavior summary)

- **Home (type picker):** five large buttons — USG · MTP · Contraception ·
  GDM · Other. Last-used type highlighted for one-tap repeat. Badge: "GDM
  follow-ups due: N" when any `gdm_next_visit_date <= today`.
- **Entry form:** minimal fields per type (see schema above). Save →
  returns to type picker, highlight updates to current type. Optional
  async photo attachment.
- **GDM Follow-ups Due:** list of patient name, due date, days overdue. Tap
  → GDM form pre-filled `gdm_visit_type = follow_up`, linked loosely by
  `patient_name` (no hard FK needed at this scale).

## Export (fellowship submission)

Separate screen, not part of daily flow. Filters: date range, case type
(inpatient/OPD), procedure type, fellowship tag. Output: table view + CSV
export (PDF later if needed). Columns: date, patient ref,
diagnosis/procedure, findings/outcome, complications.

## Folder structure

```
src/
  features/
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

## Explicit non-goals (v1)

- No multi-user / role permissions UI (schema supports it, UI doesn't need
  it yet)
- No sync with Janani EHR (future export-in, not built now)
- No cross-device conflict resolution beyond last-write-wins (single
  device, single user — revisit only if a second device is ever added)
- No bed/ward location tracking (explicitly rejected — too unstable)

## Open items — ask before building

- **Supabase project not yet created.** No project URL/anon key exists
  yet. Setting this up (project, RLS policies, first auth user) is an
  outstanding first step, not an assumed given — confirm with the user
  before wiring env vars or committing any credentials.
- **PWA icon assets** not yet designed — ask for source art or generate
  placeholders and confirm before shipping a manifest.
- **Evening nudge notification mechanism** (Notification API permission
  flow, whether it needs a service worker push vs. a local timer while the
  app is foregrounded) is not detailed in the spec — clarify the intended
  behavior before implementing.

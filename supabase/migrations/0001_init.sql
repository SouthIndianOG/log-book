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

create table attachments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references case_entries(id) on delete cascade,
  opd_entry_id uuid references opd_entries(id) on delete cascade,
  storage_path text not null,
  file_type text,
  uploaded_at timestamptz default now()
);

-- Row-level security: every table scoped to its owning user.
-- attachments has no direct user_id, so it's scoped via its parent
-- case_entries/opd_entries row instead.

alter table cases enable row level security;
alter table case_entries enable row level security;
alter table complication_types enable row level security;
alter table opd_entries enable row level security;
alter table attachments enable row level security;

create policy "cases_owner" on cases for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "case_entries_owner" on case_entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "complication_types_owner" on complication_types for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "opd_entries_owner" on opd_entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "attachments_owner" on attachments for all
  using (
    exists (select 1 from case_entries ce where ce.id = attachments.entry_id and ce.user_id = auth.uid())
    or exists (select 1 from opd_entries oe where oe.id = attachments.opd_entry_id and oe.user_id = auth.uid())
  )
  with check (
    exists (select 1 from case_entries ce where ce.id = attachments.entry_id and ce.user_id = auth.uid())
    or exists (select 1 from opd_entries oe where oe.id = attachments.opd_entry_id and oe.user_id = auth.uid())
  );

-- complication_types defaults (Bleeding, Infection, Fever, Wound issue,
-- Other) are seeded per-user by the app on first login, not here — this
-- migration runs before any auth user exists, so there's no user_id to
-- seed against yet.

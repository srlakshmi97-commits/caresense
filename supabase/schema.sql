-- ═══════════════════════════════════════════════════════════════════════
-- CareSense — Supabase / Postgres schema with row-level security
-- Run in the Supabase SQL editor (or `supabase db push`) on a new project.
--
-- Access model (mirrors src/lib/access.ts — defence in depth):
--   • A PARENT owns exactly one patient record and everything under it.
--   • A FAMILY member sees a patient's data only through an ACTIVE
--     family_link, and only the categories the parent switched on.
--   • Revoking a link takes effect on the very next query.
--   • Family members can never write to the parent's health data.
--   • Original documents are immutable (no UPDATE/DELETE storage policy).
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── tables ─────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('parent', 'family')),
  display_name text not null default '',
  phone text,
  created_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  name text not null,
  date_of_birth date,                      -- age is always computed from this
  sex text check (sex in ('female', 'male', 'other')),
  preferred_language text not null default 'en',
  timezone text,                           -- IANA zone of the patient's phone; medicine times are in this zone
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_number text not null default '112',
  conditions text[] not null default '{}',
  past_history text[] not null default '{}',  -- operations, hospital stays, past illnesses
  allergies text[] not null default '{}',
  protein_goal_g numeric,
  protein_goal_set_by text,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.family_links (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  family_profile_id uuid references public.profiles (id) on delete set null,
  family_name text not null,
  family_phone text,
  relationship text not null default '',
  invite_code text not null unique,
  status text not null check (status in ('pending', 'active', 'revoked')),
  permissions jsonb not null,
  alert_prefs jsonb not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index on public.family_links (family_profile_id);
create index on public.family_links (patient_id);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  check_date date not null,
  feeling text not null default 'fine',
  created_at timestamptz not null default now(),
  unique (patient_id, check_date)
);

create table public.pain_episodes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  locations text[] not null,                -- coarse regions (used by the safety engine)
  muscles text[] not null default '{}',     -- specific muscles, e.g. 'r.deltoid'
  other_location text,
  severity_level text not null check (severity_level in ('none', 'mild', 'moderate', 'strong', 'very_strong')),
  severity_score int not null check (severity_score between 0 and 10),
  started_at timestamptz not null,
  ongoing boolean not null,
  ended_at timestamptz,
  triggers text[] not null default '{}',
  trigger_other text,
  symptoms text[] not null default '{}',
  notes text,
  safety_rules text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.pain_episodes (patient_id, started_at desc);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'snack', 'dinner')),
  eaten_at timestamptz not null,
  items jsonb not null,
  notes text,
  protein_est_g numeric,
  created_at timestamptz not null default now()
);
create index on public.meals (patient_id, eaten_at desc);

create table public.medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  name text not null,
  purpose text,
  dosage text not null default '',
  frequency text not null default '',
  times text[] not null default '{}',          -- "HH:MM", patient-local
  instructions text,
  prescriber text,
  start_date date,
  end_date date,
  important boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.medication_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  medication_id uuid not null references public.medications (id) on delete cascade,
  scheduled_date date not null,
  scheduled_time text not null,
  status text not null check (status in ('taken', 'skipped', 'unsure')),
  logged_at timestamptz not null default now(),
  unique (medication_id, scheduled_date, scheduled_time)
);
create index on public.medication_logs (patient_id, scheduled_date);

create table public.medical_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  title text not null,
  category text not null,
  record_date date,
  uploaded_by uuid not null references public.profiles (id),
  uploaded_by_name text not null default '',
  file_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes int not null,
  extraction_status text not null check (extraction_status in ('pending', 'done', 'unreadable', 'unavailable')),
  created_at timestamptz not null default now()
);

create table public.record_extractions (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.medical_records (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  document_type text,
  document_date date,
  summary text not null,
  findings jsonb not null default '[]',
  events jsonb not null default '[]',
  unclear_parts text[] not null default '{}',
  extracted_text text not null,
  model text not null,
  created_at timestamptz not null default now()
);

create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  event_date date not null,
  type text not null,
  title text not null,
  detail text,
  source text not null check (source in ('record', 'manual')),
  source_record_id uuid references public.medical_records (id) on delete cascade,
  source_quote text,
  created_at timestamptz not null default now()
);

create table public.safety_alerts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  source text not null check (source in ('pain', 'chat')),
  rules text[] not null,
  pain_episode_id uuid references public.pain_episodes (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  family_link_id uuid not null references public.family_links (id) on delete cascade,
  kind text not null check (kind in ('pain', 'medication', 'emergency', 'new_report')),
  title text not null,                      -- English fallback
  body text not null,
  params jsonb not null default '{}',       -- rendered in each reader's language
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  actor_name text not null default '',
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index on public.audit_log (patient_id, created_at desc);

-- ── access helpers (SECURITY DEFINER so policies don't recurse) ─────────
create or replace function public.is_owner(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from patients where id = pid and owner_id = auth.uid());
$$;

-- perm = null → any active link; otherwise that permission must be switched on.
create or replace function public.can_view(pid uuid, perm text default null)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_owner(pid) or exists (
    select 1 from family_links l
    where l.patient_id = pid
      and l.family_profile_id = auth.uid()
      and l.status = 'active'
      and (perm is null or coalesce((l.permissions ->> perm)::boolean, false))
  );
$$;

-- Family member redeems a one-time invite code.
create or replace function public.accept_family_invite(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'family') then
    return null;
  end if;
  update family_links
     set family_profile_id = auth.uid(), status = 'active'
   where invite_code = upper(trim(code)) and status = 'pending'
  returning patient_id into pid;
  return pid;
end;
$$;
revoke all on function public.accept_family_invite(text) from public;
grant execute on function public.accept_family_invite(text) to authenticated;

-- ── row-level security ─────────────────────────────────────────────────
alter table public.profiles           enable row level security;
alter table public.patients           enable row level security;
alter table public.family_links       enable row level security;
alter table public.check_ins          enable row level security;
alter table public.pain_episodes      enable row level security;
alter table public.meals              enable row level security;
alter table public.medications        enable row level security;
alter table public.medication_logs    enable row level security;
alter table public.medical_records    enable row level security;
alter table public.record_extractions enable row level security;
alter table public.timeline_events    enable row level security;
alter table public.safety_alerts      enable row level security;
alter table public.notifications      enable row level security;
alter table public.audit_log          enable row level security;

-- profiles: only your own
create policy "own profile read"   on public.profiles for select using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert with check (id = auth.uid());
create policy "own profile update" on public.profiles for update using (id = auth.uid());

-- patients: owner full access; family read via an active link
create policy "patient read"   on public.patients for select using (public.can_view(id));
create policy "patient insert" on public.patients for insert with check (
  owner_id = auth.uid() and exists (select 1 from profiles where id = auth.uid() and role = 'parent'));
create policy "patient update" on public.patients for update using (owner_id = auth.uid());

-- family_links: owner manages; family member can see their own link (incl. revoked status)
create policy "links read"   on public.family_links for select using (public.is_owner(patient_id) or family_profile_id = auth.uid());
create policy "links insert" on public.family_links for insert with check (public.is_owner(patient_id));
create policy "links update" on public.family_links for update using (public.is_owner(patient_id));

-- Generic pattern for health data: owner writes, family reads with permission.
create policy "checkins owner"  on public.check_ins for all using (public.is_owner(patient_id)) with check (public.is_owner(patient_id));

create policy "pain read"   on public.pain_episodes for select using (public.can_view(patient_id, 'symptoms'));
create policy "pain write"  on public.pain_episodes for insert with check (public.is_owner(patient_id));
create policy "pain update" on public.pain_episodes for update using (public.is_owner(patient_id));
create policy "pain delete" on public.pain_episodes for delete using (public.is_owner(patient_id));

create policy "meals read"   on public.meals for select using (public.can_view(patient_id, 'meals'));
create policy "meals write"  on public.meals for insert with check (public.is_owner(patient_id));
create policy "meals delete" on public.meals for delete using (public.is_owner(patient_id));

create policy "meds read"   on public.medications for select using (public.can_view(patient_id, 'medications'));
create policy "meds write"  on public.medications for insert with check (public.is_owner(patient_id));
create policy "meds update" on public.medications for update using (public.is_owner(patient_id));

create policy "medlogs read"   on public.medication_logs for select using (public.can_view(patient_id, 'medications'));
create policy "medlogs write"  on public.medication_logs for insert with check (public.is_owner(patient_id));
create policy "medlogs update" on public.medication_logs for update using (public.is_owner(patient_id));

create policy "records read"   on public.medical_records for select using (public.can_view(patient_id, 'records'));
create policy "records write"  on public.medical_records for insert with check (public.is_owner(patient_id) and uploaded_by = auth.uid());
create policy "records update" on public.medical_records for update using (public.is_owner(patient_id));

create policy "extractions read"   on public.record_extractions for select using (public.can_view(patient_id, 'records'));
create policy "extractions write"  on public.record_extractions for insert with check (public.is_owner(patient_id));
create policy "extractions delete" on public.record_extractions for delete using (public.is_owner(patient_id));

create policy "timeline read"   on public.timeline_events for select using (
  public.is_owner(patient_id) or (public.can_view(patient_id, 'timeline') and public.can_view(patient_id, 'records')));
create policy "timeline write"  on public.timeline_events for insert with check (public.is_owner(patient_id));
create policy "timeline delete" on public.timeline_events for delete using (public.is_owner(patient_id));

create policy "alerts read"  on public.safety_alerts for select using (public.can_view(patient_id, 'alerts'));
create policy "alerts write" on public.safety_alerts for insert with check (public.is_owner(patient_id));

-- notifications: created by the parent's actions; read/marked-read by the linked family member
create policy "notif insert" on public.notifications for insert with check (public.is_owner(patient_id));
create policy "notif read" on public.notifications for select using (
  public.is_owner(patient_id) or exists (
    select 1 from family_links l where l.id = family_link_id and l.family_profile_id = auth.uid() and l.status = 'active'));
create policy "notif mark read" on public.notifications for update using (
  exists (select 1 from family_links l where l.id = family_link_id and l.family_profile_id = auth.uid() and l.status = 'active'));

-- audit: anyone with access may append as themselves; owner reads all; actors read their own
create policy "audit insert" on public.audit_log for insert with check (actor_id = auth.uid() and public.can_view(patient_id));
create policy "audit read"   on public.audit_log for select using (public.is_owner(patient_id) or actor_id = auth.uid());

-- Family members may only flip `read` on notifications (column-level guard).
revoke update on public.notifications from authenticated;
grant update (read) on public.notifications to authenticated;

-- ── storage: private bucket for ORIGINAL documents ─────────────────────
-- Object path: <patient_id>/<record_id>/<file name>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('medical-records', 'medical-records', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "records upload by owner" on storage.objects for insert to authenticated
  with check (bucket_id = 'medical-records' and public.is_owner(((storage.foldername(name))[1])::uuid));
create policy "records read with permission" on storage.objects for select to authenticated
  using (bucket_id = 'medical-records' and public.can_view(((storage.foldername(name))[1])::uuid, 'records'));
-- Deliberately NO update or delete policy: originals can never be modified.

-- =============================================================================
-- Meds Tracker: esquema completo
-- users (vinculado a auth Google), patients, medications, doses
-- Ejecutar en Supabase SQL Editor o con: supabase db push
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabla public.users (vinculada a auth, email + google_id)
-- -----------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  google_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_users_google_id on public.users(google_id) where google_id is not null;
create index if not exists idx_users_email on public.users(email);

comment on table public.users is 'Se puebla en el primer login (triggers en auth.users y auth.identities); id = auth.users.id, email y google_id desde Google.';

-- Trigger: al primer login se crea el usuario en auth.users -> creamos fila en public.users
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, google_id)
  values (
    new.id,
    new.email,
    (select provider_id from auth.identities where user_id = new.id and provider = 'google' limit 1)
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, public.users.email),
    google_id = coalesce(excluded.google_id, public.users.google_id),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Trigger: cuando se vincula la identidad Google (puede ser después del insert en auth.users),
-- aseguramos public.users con google_id y email por si no estaban disponibles antes
create or replace function public.handle_new_identity()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.provider = 'google' then
    insert into public.users (id, email, google_id)
    select
      new.user_id,
      u.email,
      new.provider_id
    from auth.users u
    where u.id = new.user_id
    on conflict (id) do update set
      google_id = coalesce(excluded.google_id, public.users.google_id),
      email = coalesce(excluded.email, public.users.email),
      updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_identity_created on auth.identities;
create trigger on_auth_identity_created
  after insert on auth.identities
  for each row execute function public.handle_new_identity();

-- Si ya existen usuarios en auth sin fila en public.users, rellenar (ej. después de aplicar migración)
insert into public.users (id, email, google_id)
select
  u.id,
  u.email,
  (select i.provider_id from auth.identities i where i.user_id = u.id and i.provider = 'google' limit 1)
from auth.users u
on conflict (id) do update set
  email = coalesce(excluded.email, public.users.email),
  google_id = coalesce(excluded.google_id, public.users.google_id),
  updated_at = now();

-- -----------------------------------------------------------------------------
-- 2. Tablas de dominio: patients -> medications -> doses
-- -----------------------------------------------------------------------------

-- Pacientes o mascotas (por usuario; user_id apunta a public.users)
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

-- Medicamentos por paciente
create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  name text not null,
  times_per_day int not null check (times_per_day >= 1),
  start_date date not null,
  end_date date,
  color_hint text check (color_hint in ('green','red','yellow','blue','neutral')),
  created_at timestamptz not null default now()
);

-- Dosis marcadas (por medicamento, slot y día)
create table if not exists public.doses (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  medication_id uuid not null references public.medications(id) on delete cascade,
  slot_index int not null check (slot_index >= 0),
  date date not null,
  status text not null check (status in ('given','omitted')),
  created_at timestamptz not null default now(),
  unique(patient_id, medication_id, slot_index, date)
);

-- -----------------------------------------------------------------------------
-- 3. Índices
-- -----------------------------------------------------------------------------
create index if not exists idx_patients_user_id on public.patients(user_id);
create index if not exists idx_medications_patient_id on public.medications(patient_id);
create index if not exists idx_doses_patient_med_slot_date on public.doses(patient_id, medication_id, slot_index, date);

-- -----------------------------------------------------------------------------
-- 4. RLS (Row Level Security)
-- -----------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.patients enable row level security;
alter table public.medications enable row level security;
alter table public.doses enable row level security;

-- users: cada uno solo ve/edita su propia fila (id = auth.uid())
drop policy if exists "users_own_row" on public.users;
create policy "users_own_row" on public.users
  for all using (auth.uid() = id);

-- Pacientes: solo los del usuario
drop policy if exists "users_own_patients" on public.patients;
create policy "users_own_patients" on public.patients
  for all using (auth.uid() = user_id);

-- Medicamentos: solo de pacientes del usuario
drop policy if exists "users_own_medications" on public.medications;
create policy "users_own_medications" on public.medications
  for all using (
    exists (
      select 1 from public.patients p
      where p.id = medications.patient_id and p.user_id = auth.uid()
    )
  );

-- Dosis: solo de pacientes del usuario
drop policy if exists "users_own_doses" on public.doses;
create policy "users_own_doses" on public.doses
  for all using (
    exists (
      select 1 from public.patients p
      where p.id = doses.patient_id and p.user_id = auth.uid()
    )
  );

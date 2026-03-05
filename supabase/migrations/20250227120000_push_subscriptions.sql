-- Suscripciones push por usuario (un dispositivo puede tener una por usuario)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique(endpoint)
);

create index if not exists idx_push_subscriptions_user_id on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- Solo el propio usuario puede insertar/ver/borrar sus suscripciones
drop policy if exists "users_own_push_subscriptions" on public.push_subscriptions;
create policy "users_own_push_subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id);

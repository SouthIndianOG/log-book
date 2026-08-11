create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz default now()
);

alter table push_subscriptions enable row level security;

create policy "push_subscriptions_owner" on push_subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

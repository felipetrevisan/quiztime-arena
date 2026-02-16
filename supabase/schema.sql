-- QuizTime Arena schema
create extension if not exists pgcrypto;

create table if not exists public.categories (
  id text primary key,
  title text not null,
  subtitle text not null,
  description text not null,
  cover_image text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.levels (
  id text primary key,
  category_id text not null references public.categories(id) on delete cascade,
  title text not null,
  description text not null,
  mode text not null default 'quiz' check (mode in ('quiz', 'blank')),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id text primary key,
  level_id text not null references public.levels(id) on delete cascade,
  prompt text not null default '',
  image_path text not null,
  accepted_answers text[] not null default '{}',
  correct_answer_display text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rankings (
  submission_id text primary key,
  quiz_id text not null,
  responder_name text not null,
  responder_avatar_data_url text,
  category_title text not null,
  level_title text not null,
  score integer not null,
  total integer not null,
  answers jsonb not null,
  results jsonb not null,
  submitted_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  email text primary key,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_authenticated()
returns boolean
language sql
stable
as $$
  select auth.uid() is not null;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
  );
$$;

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row execute procedure public.set_updated_at();

drop trigger if exists levels_set_updated_at on public.levels;
create trigger levels_set_updated_at
before update on public.levels
for each row execute procedure public.set_updated_at();

drop trigger if exists questions_set_updated_at on public.questions;
create trigger questions_set_updated_at
before update on public.questions
for each row execute procedure public.set_updated_at();

alter table public.categories enable row level security;
alter table public.levels enable row level security;
alter table public.questions enable row level security;
alter table public.rankings enable row level security;

drop policy if exists "authenticated read categories" on public.categories;
drop policy if exists "public read categories" on public.categories;
create policy "authenticated read categories" on public.categories
for select using (public.is_authenticated());
drop policy if exists "admin write categories" on public.categories;
drop policy if exists "public write categories" on public.categories;
create policy "admin write categories" on public.categories
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "authenticated read levels" on public.levels;
drop policy if exists "public read levels" on public.levels;
create policy "authenticated read levels" on public.levels
for select using (public.is_authenticated());
drop policy if exists "admin write levels" on public.levels;
drop policy if exists "public write levels" on public.levels;
create policy "admin write levels" on public.levels
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "authenticated read questions" on public.questions;
drop policy if exists "public read questions" on public.questions;
create policy "authenticated read questions" on public.questions
for select using (public.is_authenticated());
drop policy if exists "admin write questions" on public.questions;
drop policy if exists "public write questions" on public.questions;
create policy "admin write questions" on public.questions
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "authenticated read rankings" on public.rankings;
drop policy if exists "public read rankings" on public.rankings;
create policy "authenticated read rankings" on public.rankings
for select using (public.is_authenticated());
drop policy if exists "admin write rankings" on public.rankings;
drop policy if exists "public write rankings" on public.rankings;
create policy "authenticated insert rankings" on public.rankings
for insert with check (public.is_authenticated());
drop policy if exists "admin update rankings" on public.rankings;
create policy "admin update rankings" on public.rankings
for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin delete rankings" on public.rankings;
create policy "admin delete rankings" on public.rankings
for delete using (public.is_admin());

insert into storage.buckets (id, name, public)
values ('quiz-assets', 'quiz-assets', true)
on conflict (id) do nothing;

drop policy if exists "authenticated read quiz assets" on storage.objects;
drop policy if exists "public read quiz assets" on storage.objects;
create policy "authenticated read quiz assets"
on storage.objects for select
using (bucket_id = 'quiz-assets' and public.is_authenticated());

drop policy if exists "admin write quiz assets" on storage.objects;
drop policy if exists "public write quiz assets" on storage.objects;
create policy "admin write quiz assets"
on storage.objects for insert
with check (bucket_id = 'quiz-assets' and public.is_admin());

drop policy if exists "admin update quiz assets" on storage.objects;
drop policy if exists "public update quiz assets" on storage.objects;
create policy "admin update quiz assets"
on storage.objects for update
using (bucket_id = 'quiz-assets' and public.is_admin())
with check (bucket_id = 'quiz-assets' and public.is_admin());

-- apos rodar o schema, adicione seu e-mail admin:
-- insert into public.admin_users (email) values ('seu-email@exemplo.com')
-- on conflict (email) do nothing;

begin;

create extension if not exists unaccent;

create table if not exists public.duel_sessions (
  id uuid primary key default gen_random_uuid(),
  quiz_id text not null,
  category_id text not null references public.categories(id) on delete cascade,
  level_id text not null references public.levels(id) on delete cascade,
  host_user_id uuid not null references auth.users(id) on delete cascade,
  guest_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'waiting' check (status in ('waiting', 'running', 'finished', 'cancelled')),
  started_at timestamptz,
  finished_at timestamptz,
  first_finished_user_id uuid references auth.users(id) on delete set null,
  first_finished_at timestamptz,
  winner_user_id uuid references auth.users(id) on delete set null,
  winner_score integer,
  winner_duration_ms integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.duel_entries (
  session_id uuid not null references public.duel_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'Jogador',
  avatar_url text,
  answers jsonb not null default '{}'::jsonb,
  answered_count integer not null default 0,
  current_question integer not null default 1,
  is_submitted boolean not null default false,
  submitted_at timestamptz,
  score integer not null default 0,
  total integer not null default 0,
  duration_ms integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create index if not exists duel_sessions_host_user_id_idx on public.duel_sessions(host_user_id);
create index if not exists duel_sessions_guest_user_id_idx on public.duel_sessions(guest_user_id);
create index if not exists duel_sessions_level_id_idx on public.duel_sessions(level_id);
create index if not exists duel_entries_session_id_idx on public.duel_entries(session_id);

drop trigger if exists duel_sessions_set_updated_at on public.duel_sessions;
create trigger duel_sessions_set_updated_at
before update on public.duel_sessions
for each row execute procedure public.set_updated_at();

drop trigger if exists duel_entries_set_updated_at on public.duel_entries;
create trigger duel_entries_set_updated_at
before update on public.duel_entries
for each row execute procedure public.set_updated_at();

create or replace function public.normalize_quiz_answer(p_value text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(lower(unaccent(coalesce(p_value, ''))), '\s+', ' ', 'g'));
$$;

create or replace function public.compute_duel_score(p_level_id text, p_answers jsonb)
returns integer
language plpgsql
stable
as $$
declare
  v_score integer := 0;
  v_answer text;
  v_correct text;
  v_valid_answers text[];
  v_question record;
begin
  for v_question in
    select
      id,
      accepted_answers,
      correct_answer_display,
      choice_options,
      correct_index
    from public.questions
    where level_id = p_level_id
    order by position asc
  loop
    v_answer := coalesce(p_answers ->> v_question.id, '');
    if public.normalize_quiz_answer(v_answer) = '' then
      continue;
    end if;

    if coalesce(array_length(v_question.choice_options, 1), 0) >= 4 then
      v_correct := coalesce(v_question.choice_options[v_question.correct_index + 1], '');
      v_valid_answers := case
        when btrim(v_correct) <> '' then array[v_correct]
        else '{}'::text[]
      end;
    elsif coalesce(array_length(v_question.accepted_answers, 1), 0) > 0 then
      v_valid_answers := v_question.accepted_answers;
    elsif btrim(coalesce(v_question.correct_answer_display, '')) <> '' then
      v_valid_answers := array[v_question.correct_answer_display];
    else
      v_valid_answers := '{}'::text[];
    end if;

    if exists (
      select 1
      from unnest(v_valid_answers) as valid_answer
      where public.normalize_quiz_answer(valid_answer) = public.normalize_quiz_answer(v_answer)
    ) then
      v_score := v_score + 1;
    end if;
  end loop;

  return v_score;
end;
$$;

create or replace function public.create_duel_session(
  p_quiz_id text,
  p_category_id text,
  p_level_id text,
  p_display_name text,
  p_avatar_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_session_id uuid;
  v_display_name text := coalesce(nullif(btrim(p_display_name), ''), 'Jogador');
begin
  if v_uid is null then
    raise exception 'Usuario nao autenticado';
  end if;

  if not exists (
    select 1
    from public.levels
    where id = p_level_id
      and category_id = p_category_id
      and coalesce(is_published, false) = true
  ) then
    raise exception 'Nivel nao publicado para duelo';
  end if;

  insert into public.duel_sessions (
    quiz_id,
    category_id,
    level_id,
    host_user_id
  )
  values (
    p_quiz_id,
    p_category_id,
    p_level_id,
    v_uid
  )
  returning id into v_session_id;

  insert into public.duel_entries (
    session_id,
    user_id,
    display_name,
    avatar_url
  )
  values (
    v_session_id,
    v_uid,
    v_display_name,
    p_avatar_url
  )
  on conflict (session_id, user_id) do update
    set display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        updated_at = now();

  return v_session_id;
end;
$$;

create or replace function public.join_duel_session(
  p_session_id uuid,
  p_display_name text,
  p_avatar_url text default null
)
returns public.duel_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_session public.duel_sessions%rowtype;
  v_display_name text := coalesce(nullif(btrim(p_display_name), ''), 'Jogador');
begin
  if v_uid is null then
    raise exception 'Usuario nao autenticado';
  end if;

  select *
  into v_session
  from public.duel_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Partida nao encontrada';
  end if;

  if v_session.host_user_id = v_uid then
    null;
  elsif v_session.guest_user_id = v_uid then
    null;
  else
    if v_session.status in ('finished', 'cancelled') then
      raise exception 'Partida encerrada';
    end if;

    if v_session.guest_user_id is not null then
      raise exception 'Partida ja possui dois jogadores';
    end if;

    update public.duel_sessions
      set guest_user_id = v_uid,
          status = 'running',
          started_at = coalesce(started_at, now())
    where id = p_session_id
    returning * into v_session;
  end if;

  insert into public.duel_entries (
    session_id,
    user_id,
    display_name,
    avatar_url
  )
  values (
    p_session_id,
    v_uid,
    v_display_name,
    p_avatar_url
  )
  on conflict (session_id, user_id) do update
    set display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        updated_at = now();

  select *
  into v_session
  from public.duel_sessions
  where id = p_session_id;

  return v_session;
end;
$$;

create or replace function public.upsert_duel_draft(
  p_session_id uuid,
  p_answers jsonb,
  p_answered_count integer,
  p_current_question integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_session public.duel_sessions%rowtype;
begin
  if v_uid is null then
    raise exception 'Usuario nao autenticado';
  end if;

  select *
  into v_session
  from public.duel_sessions
  where id = p_session_id;

  if not found then
    raise exception 'Partida nao encontrada';
  end if;

  if not (v_session.host_user_id = v_uid or v_session.guest_user_id = v_uid) then
    raise exception 'Sem permissao para esta partida';
  end if;

  if v_session.status in ('finished', 'cancelled') then
    return;
  end if;

  insert into public.duel_entries (
    session_id,
    user_id,
    answers,
    answered_count,
    current_question
  )
  values (
    p_session_id,
    v_uid,
    coalesce(p_answers, '{}'::jsonb),
    greatest(0, coalesce(p_answered_count, 0)),
    greatest(1, coalesce(p_current_question, 1))
  )
  on conflict (session_id, user_id) do update
    set answers = excluded.answers,
        answered_count = excluded.answered_count,
        current_question = excluded.current_question,
        updated_at = now();
end;
$$;

create or replace function public.finalize_duel_submission(
  p_session_id uuid,
  p_answers jsonb,
  p_answered_count integer,
  p_display_name text,
  p_avatar_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_session public.duel_sessions%rowtype;
  v_entry public.duel_entries%rowtype;
  v_host_entry public.duel_entries%rowtype;
  v_guest_entry public.duel_entries%rowtype;
  v_started_at timestamptz;
  v_cutoff timestamptz;
  v_total integer := 0;
  v_score integer := 0;
  v_duration_ms integer := 0;
  v_winner_user_id uuid;
  v_winner_score integer;
  v_winner_duration_ms integer;
  v_response jsonb;
  v_display_name text := coalesce(nullif(btrim(p_display_name), ''), 'Jogador');
begin
  if v_uid is null then
    raise exception 'Usuario nao autenticado';
  end if;

  select *
  into v_session
  from public.duel_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Partida nao encontrada';
  end if;

  if not (v_session.host_user_id = v_uid or v_session.guest_user_id = v_uid) then
    raise exception 'Sem permissao para esta partida';
  end if;

  if v_session.status = 'cancelled' then
    raise exception 'Partida cancelada';
  end if;

  if v_session.status = 'finished' then
    select jsonb_build_object(
      'session', row_to_json(v_session)::jsonb,
      'entries', coalesce(jsonb_agg(to_jsonb(e) order by e.created_at asc), '[]'::jsonb),
      'winner_user_id', v_session.winner_user_id
    )
    into v_response
    from public.duel_entries e
    where e.session_id = p_session_id;

    return v_response;
  end if;

  if v_session.started_at is null then
    update public.duel_sessions
      set started_at = now(),
          status = 'running'
    where id = p_session_id
    returning * into v_session;
  end if;

  insert into public.duel_entries (
    session_id,
    user_id,
    display_name,
    avatar_url,
    answers,
    answered_count,
    current_question
  )
  values (
    p_session_id,
    v_uid,
    v_display_name,
    p_avatar_url,
    coalesce(p_answers, '{}'::jsonb),
    greatest(0, coalesce(p_answered_count, 0)),
    greatest(1, coalesce(p_answered_count, 0))
  )
  on conflict (session_id, user_id) do update
    set display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        answers = excluded.answers,
        answered_count = excluded.answered_count,
        current_question = greatest(1, excluded.current_question),
        updated_at = now();

  update public.duel_entries
    set is_submitted = true,
        submitted_at = coalesce(submitted_at, now()),
        updated_at = now()
  where session_id = p_session_id
    and user_id = v_uid;

  if v_session.first_finished_user_id is null then
    update public.duel_sessions
      set first_finished_user_id = v_uid,
          first_finished_at = now(),
          finished_at = now(),
          status = 'finished'
    where id = p_session_id
    returning * into v_session;
  else
    update public.duel_sessions
      set finished_at = coalesce(finished_at, now()),
          status = 'finished'
    where id = p_session_id
    returning * into v_session;
  end if;

  v_started_at := coalesce(v_session.started_at, v_session.created_at);
  v_cutoff := coalesce(v_session.first_finished_at, now());
  select count(*) into v_total from public.questions where level_id = v_session.level_id;

  for v_entry in
    select *
    from public.duel_entries
    where session_id = p_session_id
  loop
    v_score := public.compute_duel_score(v_session.level_id, coalesce(v_entry.answers, '{}'::jsonb));
    v_duration_ms := greatest(
      0,
      floor(extract(epoch from (coalesce(v_entry.submitted_at, v_cutoff) - v_started_at)) * 1000)::integer
    );

    update public.duel_entries
      set score = v_score,
          total = v_total,
          duration_ms = v_duration_ms,
          is_submitted = true,
          submitted_at = coalesce(submitted_at, v_cutoff),
          updated_at = now()
    where session_id = p_session_id
      and user_id = v_entry.user_id;
  end loop;

  select * into v_host_entry
  from public.duel_entries
  where session_id = p_session_id
    and user_id = v_session.host_user_id;

  select * into v_guest_entry
  from public.duel_entries
  where session_id = p_session_id
    and user_id = v_session.guest_user_id;

  if v_guest_entry.user_id is null then
    v_winner_user_id := v_host_entry.user_id;
    v_winner_score := v_host_entry.score;
    v_winner_duration_ms := v_host_entry.duration_ms;
  elsif v_host_entry.score > v_guest_entry.score then
    v_winner_user_id := v_host_entry.user_id;
    v_winner_score := v_host_entry.score;
    v_winner_duration_ms := v_host_entry.duration_ms;
  elsif v_guest_entry.score > v_host_entry.score then
    v_winner_user_id := v_guest_entry.user_id;
    v_winner_score := v_guest_entry.score;
    v_winner_duration_ms := v_guest_entry.duration_ms;
  elsif v_host_entry.duration_ms < v_guest_entry.duration_ms then
    v_winner_user_id := v_host_entry.user_id;
    v_winner_score := v_host_entry.score;
    v_winner_duration_ms := v_host_entry.duration_ms;
  elsif v_guest_entry.duration_ms < v_host_entry.duration_ms then
    v_winner_user_id := v_guest_entry.user_id;
    v_winner_score := v_guest_entry.score;
    v_winner_duration_ms := v_guest_entry.duration_ms;
  else
    v_winner_user_id := coalesce(v_session.first_finished_user_id, v_host_entry.user_id);
    if v_winner_user_id = v_guest_entry.user_id then
      v_winner_score := v_guest_entry.score;
      v_winner_duration_ms := v_guest_entry.duration_ms;
    else
      v_winner_score := v_host_entry.score;
      v_winner_duration_ms := v_host_entry.duration_ms;
    end if;
  end if;

  update public.duel_sessions
    set winner_user_id = v_winner_user_id,
        winner_score = v_winner_score,
        winner_duration_ms = v_winner_duration_ms,
        finished_at = coalesce(finished_at, now()),
        status = 'finished',
        updated_at = now()
  where id = p_session_id
  returning * into v_session;

  select jsonb_build_object(
    'session', row_to_json(v_session)::jsonb,
    'entries', coalesce(jsonb_agg(to_jsonb(e) order by e.created_at asc), '[]'::jsonb),
    'winner_user_id', v_session.winner_user_id
  )
  into v_response
  from public.duel_entries e
  where e.session_id = p_session_id;

  return v_response;
end;
$$;

alter table public.duel_sessions enable row level security;
alter table public.duel_entries enable row level security;

drop policy if exists "duel participants read sessions" on public.duel_sessions;
create policy "duel participants read sessions" on public.duel_sessions
for select using (host_user_id = auth.uid() or guest_user_id = auth.uid());

drop policy if exists "duel participants read entries" on public.duel_entries;
create policy "duel participants read entries" on public.duel_entries
for select using (
  exists (
    select 1
    from public.duel_sessions
    where duel_sessions.id = duel_entries.session_id
      and (duel_sessions.host_user_id = auth.uid() or duel_sessions.guest_user_id = auth.uid())
  )
);

grant execute on function public.create_duel_session(text, text, text, text, text) to authenticated;
grant execute on function public.join_duel_session(uuid, text, text) to authenticated;
grant execute on function public.upsert_duel_draft(uuid, jsonb, integer, integer) to authenticated;
grant execute on function public.finalize_duel_submission(uuid, jsonb, integer, text, text) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'duel_sessions'
    ) then
      alter publication supabase_realtime add table public.duel_sessions;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'duel_entries'
    ) then
      alter publication supabase_realtime add table public.duel_entries;
    end if;
  end if;
end $$;

commit;

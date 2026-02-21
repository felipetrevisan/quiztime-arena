alter table public.levels
  add column if not exists hide_default_question_image boolean not null default true;


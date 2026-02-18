begin;

alter table public.questions
  add column if not exists image_hint text;

update public.questions
set image_hint = ''
where image_hint is null;

alter table public.questions
  alter column image_hint set default '';

alter table public.questions
  alter column image_hint set not null;

commit;

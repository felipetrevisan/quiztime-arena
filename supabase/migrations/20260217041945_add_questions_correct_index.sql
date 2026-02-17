begin;

alter table public.questions
  add column if not exists correct_index integer;

update public.questions
set correct_index = 0
where correct_index is null
   or correct_index < 0
   or correct_index > 3;

alter table public.questions
  alter column correct_index set default 0;

alter table public.questions
  alter column correct_index set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.questions'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%correct_index%'
      and pg_get_constraintdef(c.oid) ilike '%between 0 and 3%'
  ) then
    alter table public.questions
      add constraint questions_correct_index_check
      check (correct_index between 0 and 3);
  end if;
end $$;

commit;

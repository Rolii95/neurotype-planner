-- Persist manual Priority Matrix assignment directly on tasks
begin;

alter table public.tasks
  add column if not exists quadrant text
  check (quadrant in (
    'urgent-important',
    'urgent-not-important',
    'not-urgent-important',
    'not-urgent-not-important'
  ))
  default 'not-urgent-not-important';

update public.tasks
set quadrant = case
  when priority in ('high', 'urgent') and due_date is not null and due_date <= (now() + interval '2 days') then 'urgent-important'
  when priority in ('high', 'urgent') and (due_date is null or due_date > (now() + interval '2 days')) then 'not-urgent-important'
  when (priority is null or priority not in ('high', 'urgent')) and due_date is not null and due_date <= (now() + interval '2 days') then 'urgent-not-important'
  else 'not-urgent-not-important'
end;

create index if not exists idx_tasks_quadrant on public.tasks(quadrant);

commit;

begin;
alter table public.entre_profiles add column onboarding_plan_selected boolean not null default true;
alter table public.entre_profiles alter column onboarding_plan_selected set default false;
commit;
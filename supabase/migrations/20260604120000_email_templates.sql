-- Email templates stored in Postgres; synced to AWS SES via email-template edge function.

create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  html_body text not null,
  html_extensions text[] not null default '{}'::text[],
  text_body text,
  text_extensions text[] not null default '{}'::text[],
  reference jsonb not null default '{}'::jsonb,
  test_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_templates_name_format check (name ~ '^[A-Za-z0-9_-]+$'),
  constraint email_templates_name_unique unique (name)
);

comment on table public.email_templates is
  'Transactional email templates; sync to AWS SES manually from the admin dashboard.';
comment on column public.email_templates.name is
  'SES template name (alphanumeric, underscore, hyphen only). Used as templateId when sending.';

create index email_templates_name_idx on public.email_templates (name);

create trigger email_templates_set_updated_at
  before update on public.email_templates
  for each row
  execute function public.set_updated_at();

alter table public.email_templates enable row level security;

grant select on public.email_templates to authenticated;
grant insert, update, delete on public.email_templates to authenticated;
grant all on public.email_templates to service_role;

create policy "Admins can read email templates"
  on public.email_templates
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can insert email templates"
  on public.email_templates
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update email templates"
  on public.email_templates
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete email templates"
  on public.email_templates
  for delete
  to authenticated
  using (public.is_admin());

-- Cached Transdirect / courier quote responses keyed by normalized freight declaration.
create table public.shipping_quote_cache (
  cache_key text primary key,
  request_payload jsonb not null,
  response_payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_hit_at timestamptz not null default now(),
  hit_count bigint not null default 0
);

comment on table public.shipping_quote_cache is
  'Cached courier quote responses keyed by normalized freight declaration hash.';
comment on column public.shipping_quote_cache.cache_key is
  'SHA-256 hex digest of canonical request JSON.';
comment on column public.shipping_quote_cache.request_payload is
  'Normalized GetCourierQuotesInput used for the quote.';
comment on column public.shipping_quote_cache.response_payload is
  'GetCourierQuotesResult returned by courier providers.';
comment on column public.shipping_quote_cache.expires_at is
  'When this cache entry should be refreshed from the courier API.';
comment on column public.shipping_quote_cache.hit_count is
  'Number of times this entry was served from cache.';

create index shipping_quote_cache_expires_at_idx
  on public.shipping_quote_cache (expires_at);

alter table public.shipping_quote_cache enable row level security;

revoke all on public.shipping_quote_cache from anon, authenticated;
grant all on public.shipping_quote_cache to service_role;

create or replace function public.increment_shipping_quote_cache_hit(p_cache_key text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.shipping_quote_cache
  set hit_count = hit_count + 1,
      last_hit_at = now()
  where cache_key = p_cache_key;
$$;

revoke all on function public.increment_shipping_quote_cache_hit(text) from public;
grant execute on function public.increment_shipping_quote_cache_hit(text) to service_role;

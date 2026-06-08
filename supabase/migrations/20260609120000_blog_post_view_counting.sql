-- Blog post view counting: unified rate limits, server-secret-gated RPC, remove public increment.
create table public.rate_limits (
  action text not null,
  ip_hash text not null,
  slug text not null default '',
  last_action_at timestamptz not null default now(),
  primary key (action, ip_hash, slug),
  constraint rate_limits_action_allowed check (
    action in ('blog_post_view', 'feedback_submit')
  )
);

comment on table public.rate_limits is
  'Rate-limit keys for public RPCs (action + ip hash + optional slug).';
comment on column public.rate_limits.action is
  'Rate-limit scope, e.g. blog_post_view or feedback_submit.';
comment on column public.rate_limits.slug is
  'Resource key when the action is per-resource (empty for global per-IP limits).';
comment on column public.rate_limits.last_action_at is
  'Last time the action was allowed for this key.';

create index rate_limits_last_action_at_idx
  on public.rate_limits (last_action_at);

alter table public.rate_limits enable row level security;

revoke all on public.rate_limits from anon, authenticated;
grant all on public.rate_limits to service_role;

-- Per-post counting_secret on blog_posts; drop global config table.
create or replace function public.record_blog_post_view(
  p_slug text,
  p_ip_hash text,
  p_counting_secret text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_secret text;
  v_last_action_at timestamptz;
  v_counted boolean := false;
  v_view_count integer := 0;
begin
  if p_slug is null
     or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     or p_ip_hash is null
     or length(trim(p_ip_hash)) = 0 then
    raise exception 'invalid request' using errcode = '22023';
  end if;

  select bp.counting_secret
  into v_post_secret
  from public.blog_posts bp
  where bp.slug = p_slug
    and bp.is_published = true
    and (bp.published_at is null or bp.published_at <= now());

  if v_post_secret is null
     or p_counting_secret is distinct from v_post_secret then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select last_action_at
  into v_last_action_at
  from public.rate_limits
  where action = 'blog_post_view'
    and ip_hash = p_ip_hash
    and slug = p_slug
  for update;

  if not found then
    insert into public.rate_limits (action, ip_hash, slug, last_action_at)
    values ('blog_post_view', p_ip_hash, p_slug, now());
    v_counted := true;
  elsif v_last_action_at < now() - interval '1 minute' then
    update public.rate_limits
    set last_action_at = now()
    where action = 'blog_post_view'
      and ip_hash = p_ip_hash
      and slug = p_slug;
    v_counted := true;
  end if;

  if v_counted then
    update public.blog_posts
    set view_count = view_count + 1
    where slug = p_slug
      and is_published = true
      and (published_at is null or published_at <= now())
    returning view_count into v_view_count;
  else
    select bp.view_count
    into v_view_count
    from public.blog_posts bp
    where bp.slug = p_slug
      and bp.is_published = true
      and (bp.published_at is null or bp.published_at <= now());
  end if;

  return jsonb_build_object(
    'counted', v_counted,
    'view_count', coalesce(v_view_count, 0)
  );
end;
$$;

comment on function public.record_blog_post_view(text, text, text) is
  'Increments view_count when rate limit allows; p_counting_secret must match blog_posts.counting_secret for the slug.';

drop table if exists public.blog_view_count_config;

grant execute on function public.record_blog_post_view(text, text, text) to anon, authenticated;

-- Add publication logo column for blog posts (if not already present from create table).
alter table public.blog_posts
  add column if not exists news_logo_image_url text;

comment on column public.blog_posts.news_logo_image_url is
  'Optional publication logo path (e.g. /images/themercury.svg) shown on news cards.';

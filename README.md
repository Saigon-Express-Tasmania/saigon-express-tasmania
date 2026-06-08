This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Supabase Setup

Run these in the Supabase SQL editor after `user_profiles_and_roles` (defines `public.is_admin()`).

### Admin bucket: `saigon-express-tasmania`

Create the bucket as **public** (site menu images use `/object/public/...` URLs). Then grant admins full access:

```sql
-- Bucket (skip if it already exists)
insert into storage.buckets (id, name, public)
values ('saigon-express-tasmania', 'saigon-express-tasmania', true)
on conflict (id) do update set public = excluded.public;

-- Admin full access (SELECT + INSERT + UPDATE + DELETE; upsert needs all three write-related ops)
create policy "Admins can read saigon-express-tasmania"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'saigon-express-tasmania' and public.is_admin());

create policy "Admins can insert saigon-express-tasmania"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'saigon-express-tasmania' and public.is_admin());

create policy "Admins can update saigon-express-tasmania"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'saigon-express-tasmania' and public.is_admin())
  with check (bucket_id = 'saigon-express-tasmania' and public.is_admin());

create policy "Admins can delete saigon-express-tasmania"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'saigon-express-tasmania' and public.is_admin());
```

### Customer bucket: `saigon-express-tasmania-customers`

Must match `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_FOR_CUSTOMER` in `.env`. Private bucket for per-user uploads. Object paths must follow `{parent_folder}/{user_id}/…`, e.g. `avatars/<uuid>/avatar.jpg` (same layout as admin `uploadMedia`).

```sql
-- Bucket (skip if it already exists)
insert into storage.buckets (id, name, public)
values ('saigon-express-tasmania-customers', 'saigon-express-tasmania-customers', false)
on conflict (id) do update set public = excluded.public;

-- Authenticated users: read/write only under {parent}/{their_user_id}/…
create policy "Users can read own saigon-express-tasmania-customers files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'saigon-express-tasmania-customers'
    and array_length(storage.foldername(name), 1) >= 2
    and (storage.foldername(name))[2] = (select auth.uid()::text)
  );

create policy "Users can insert own saigon-express-tasmania-customers files"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'saigon-express-tasmania-customers'
    and array_length(storage.foldername(name), 1) >= 2
    and (storage.foldername(name))[2] = (select auth.uid()::text)
  );

create policy "Users can update own saigon-express-tasmania-customers files"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'saigon-express-tasmania-customers'
    and array_length(storage.foldername(name), 1) >= 2
    and (storage.foldername(name))[2] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'saigon-express-tasmania-customers'
    and array_length(storage.foldername(name), 1) >= 2
    and (storage.foldername(name))[2] = (select auth.uid()::text)
  );

create policy "Users can delete own saigon-express-tasmania-customers files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'saigon-express-tasmania-customers'
    and array_length(storage.foldername(name), 1) >= 2
    and (storage.foldername(name))[2] = (select auth.uid()::text)
  );
```

`(storage.foldername(name))[1]` is the parent folder (e.g. `avatars`); `[2]` must equal the signed-in user's UUID. Files placed directly at `{user_id}/…` (no parent folder) are denied.

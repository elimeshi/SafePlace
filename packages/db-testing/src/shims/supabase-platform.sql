-- Supabase platform shim for the Docker-free RLS harness.
--
-- On a real Supabase project these objects (the anon/authenticated/service_role
-- roles, the auth.* schema + helpers, and the storage.* schema) are provided by
-- the platform BEFORE any of our migrations run. PGlite is bare Postgres, so the
-- harness injects the minimal equivalents here so supabase/migrations/*.sql apply
-- and behave exactly as they would in the cloud.
--
-- This file is TEST-ONLY. Our migrations must never (re)create these — doing so
-- would collide with the platform-provided versions on real Supabase.

-- --- Roles -----------------------------------------------------------------
-- Mirror Supabase's role set. service_role bypasses RLS (it's the pipeline /
-- backend identity); anon + authenticated are subject to it.
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

-- --- auth schema -----------------------------------------------------------
create schema if not exists auth;

-- Minimal stand-in for auth.users. Only the columns our trigger + FKs touch.
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- auth.uid()/auth.role()/auth.jwt() read the request's JWT claims, which the
-- harness sets per "signed-in user" via set_config('request.jwt.claims', ...),
-- exactly as PostgREST does for a real request.
create or replace function auth.uid() returns uuid
  language sql stable
  as $$ select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid $$;

create or replace function auth.role() returns text
  language sql stable
  as $$ select coalesce(nullif(current_setting('request.jwt.claims', true)::json ->> 'role', ''), 'anon') $$;

create or replace function auth.jwt() returns jsonb
  language sql stable
  as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;

grant usage on schema auth to anon, authenticated, service_role;

-- --- storage schema --------------------------------------------------------
-- Minimal stand-in for Supabase Storage so the storage migration (bucket +
-- object RLS) applies. Real signed-URL issuance is a Storage API call and is
-- verified through api-client, not here.
create schema if not exists storage;

create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  created_at timestamptz not null default now()
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets (id),
  name text not null,
  owner uuid,
  created_at timestamptz not null default now()
);

grant usage on schema storage to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to authenticated, service_role;

-- On real Supabase the platform ships storage.objects with RLS already ENABLED;
-- migration 0006 only adds policies. Reproduce that platform state here so the
-- storage policies are actually enforced in the harness.
alter table storage.objects enable row level security;

-- --- public schema usage ---------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

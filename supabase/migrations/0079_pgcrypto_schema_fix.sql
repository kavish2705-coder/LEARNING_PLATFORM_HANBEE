-- Found standing up a fresh staging project: `create extension if not
-- exists "pgcrypto"` in 0001 silently no-ops on a Supabase project that
-- pre-installs pgcrypto into the `extensions` schema, which is not always
-- on the default search_path. gen_random_uuid() kept working regardless
-- (it has been a Postgres core builtin since v13, independent of the
-- extension), masking the gap until 0023's gen_random_bytes() call for
-- organizations.join_token failed with "function does not exist" on the
-- new project. Production happens to already have pgcrypto in `public`
-- (an older default, or a one-time manual fix), so this is a no-op there
-- and only does real work on environments where the extension landed
-- somewhere not on the search_path.
do $$
begin
  if not exists (
    select 1 from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pgcrypto' and n.nspname = 'public'
  ) then
    create extension if not exists pgcrypto;
    alter extension pgcrypto set schema public;
  end if;
end $$;

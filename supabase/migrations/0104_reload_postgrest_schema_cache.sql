-- 0102/0103 applied cleanly (confirmed via supabase migration list and by
-- reading pg_proc directly), but PostgREST's cached schema didn't pick up
-- the new functions (list_poolable_students etc. 404'd with PGRST202 from
-- the live frontend) -- a direct CLI push doesn't always trigger the
-- auto-reload that the Supabase Dashboard SQL editor sends. This forces it.
select pg_notify('pgrst', 'reload schema');

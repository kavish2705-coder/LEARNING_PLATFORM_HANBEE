-- S9 (docs/SECURITY_PLAN.md): private storage for lesson attachments.
-- Migration 0073 reconciles the final object path to <lesson_id>/<file_name>
-- so it matches lesson_materials.storage_path. The frontend should upload
-- with the authenticated Supabase Storage client, then request a signed link
-- with storage.from('lesson-attachments').createSignedUrl(path,
-- expiresInSeconds). The Storage API checks these object policies before
-- issuing the time-limited URL; no service-role key or SQL signing function
-- belongs in the browser.

insert into storage.buckets (id, name, public)
values ('lesson-attachments', 'lesson-attachments', false)
on conflict (id) do update set public = false;

create policy "staff and managers upload lesson attachments"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'lesson-attachments'
    and public.is_staff_or_manager()
    and array_length(storage.foldername(name), 1) = 2
    and exists (
      select 1
      from public.lessons l
      join public.modules m on m.id = l.module_id
      where l.id::text = (storage.foldername(name))[2]
        and m.course_id::text = (storage.foldername(name))[1]
    )
  );

create policy "enrolled students read lesson attachments"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'lesson-attachments'
    and array_length(storage.foldername(name), 1) = 2
    and exists (
      select 1
      from public.lessons l
      join public.modules m on m.id = l.module_id
      where l.id::text = (storage.foldername(name))[2]
        and m.course_id::text = (storage.foldername(name))[1]
        and (
          public.is_staff_or_manager()
          or (
            l.published
            and public.is_enrolled_in_course(m.course_id)
          )
        )
    )
  );

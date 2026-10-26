-- Reconcile storage object keys with lesson_materials.storage_path:
-- <lesson_id>/<file_name>. There is no foreign key between storage.objects
-- and lesson_materials, so callers must keep each metadata row's storage_path
-- equal to this bucket object key for the row's lesson_id.
comment on column public.lesson_materials.storage_path is
  'Must equal the lesson-attachments bucket object key: <lesson_id>/<file_name> for this row''s lesson_id. Keep in sync by convention; Storage objects cannot be referenced by a foreign key.';

drop policy "staff and managers upload lesson attachments" on storage.objects;
create policy "staff and managers upload lesson attachments"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'lesson-attachments'
    and public.is_staff_or_manager()
    and array_length(storage.foldername(name), 1) = 1
    and exists (
      select 1
      from public.lessons l
      join public.modules m on m.id = l.module_id
      where l.id::text = (storage.foldername(name))[1]
    )
  );

drop policy "enrolled students read lesson attachments" on storage.objects;
create policy "enrolled students read lesson attachments"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'lesson-attachments'
    and array_length(storage.foldername(name), 1) = 1
    and exists (
      select 1
      from public.lessons l
      join public.modules m on m.id = l.module_id
      where l.id::text = (storage.foldername(name))[1]
        and (
          public.is_staff_or_manager()
          or (
            l.published
            and public.is_enrolled_in_course(m.course_id)
          )
        )
    )
  );

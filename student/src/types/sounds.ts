/**
 * The student-facing shape of SoundResource
 * (api/app/Domain/SoundLibrary/Http/Resources/SoundResource.php) —
 * `source`/`license`/`is_active` are admin-only fields, omitted from the
 * JSON entirely (not sent as null) for any non-admin caller, confirmed by
 * SoundTest.php's test_students_do_not_see_provenance_fields. This type
 * deliberately doesn't include them — a student token never sees them.
 */
export interface Sound {
  id: number;
  name: string;
  category: string;
  file_url: string;
  created_at: string;
}

/**
 * Mirrors AdminActivityLogResource exactly
 * (api/app/Domain/Admin/Http/Resources/AdminActivityLogResource.php).
 * `action` is a free-text string, not an enum — every known value today
 * (checked by grepping `action: '...'` across app/Domain) comes from a
 * dedicated Action class firing the shared AdminActionPerformed event:
 * 'published_study_material', 'published_flashcard_deck', 'suspended_user',
 * 'reactivated_user', 'broadcast_announcement'. New action strings will
 * show up here automatically as more of the app emits them — the UI maps
 * known ones to a nicer label/icon and falls back gracefully for anything
 * else, rather than hard-coding this into a closed enum.
 */
export interface AdminActivityLog {
  id: number;
  admin_name: string | null;
  action: string;
  subject_type: string | null;
  subject_id: number | null;
  description: string | null;
  created_at: string;
}

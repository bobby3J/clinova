/**
 * Matches UserSettingResource exactly
 * (api/app/Domain/Users/Http/Resources/UserSettingResource.php).
 */
export interface UserSettings {
  default_duration_minutes: number;
  default_sound_id: number | null;
  auto_breaks: boolean;
  notifications_enabled: boolean;
}

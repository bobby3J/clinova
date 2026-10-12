/**
 * Mirrors SoundResource exactly (api/app/Domain/SoundLibrary/Http/Resources/SoundResource.php).
 * No draft/published workflow here, unlike StudyMaterial/FlashcardDeck — a
 * sound is just active or not. source/license/is_active are admin-only
 * (absent, not null, for non-admin callers — same when()-as-closure
 * pattern as StudyMaterialResource).
 */
export interface Sound {
  id: number;
  name: string;
  category: string;
  file_url: string;
  source?: string | null;
  license?: string | null;
  is_active?: boolean;
}

export interface CreateSoundPayload {
  name: string;
  category: string;
  file_url: string;
  source?: string | null;
  license?: string | null;
}

/**
 * is_active is deliberately not here — activate()/deactivate() are the
 * real lifecycle actions for that field, not a field edit. See
 * UpdateSoundRequest::rules() on the backend.
 */
export interface UpdateSoundPayload {
  name?: string;
  category?: string;
  file_url?: string;
  source?: string | null;
  license?: string | null;
}

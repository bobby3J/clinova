<?php

namespace App\Domain\Users\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Domain\AiPractice\Models\AiPracticeSet;
use App\Domain\Shared\Enums\Track;
use App\Domain\StudySessions\Models\StudySession;
use App\Domain\Support\Models\SupportTicket;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

// streak_count/last_active_at are fillable so the streak-update listener's
// update() call actually persists (same reasoning as every other
// Action-mutates-a-field case documented in ARCHITECTURE.md) — no Form
// Request ever validates either key, so client input can't reach them.
#[Fillable(['name', 'email', 'password', 'track', 'level', 'streak_count', 'last_active_at', 'suspended_at'])]
#[Hidden(['password', 'remember_token'])]
#[UseFactory(UserFactory::class)]

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'track' => Track::class,
            'last_active_at' => 'datetime',
            'suspended_at' => 'datetime',
        ];
    }

    public function isSuspended(): bool
    {
        return $this->suspended_at !== null;
    }

    /**
     * The single chokepoint for "is this user allowed to manage curriculum
     * content" (Subject/Topic/StudyMaterial/FlashcardDeck/Flashcard).
     * Admin and lecturer are both trusted with content the same way; they
     * differ on everything else (users, announcements, activity log,
     * analytics, sounds stay admin-only) — those checks are left as plain
     * hasRole('admin') rather than routed through here, so this name means
     * exactly one thing and doesn't quietly grow into a general "is
     * privileged" check.
     */
    public function canManageStudyContent(): bool
    {
        return $this->hasAnyRole(['admin', 'lecturer']);
    }

    /**
     * The inverse of StudySession::user() — a routine bidirectional Eloquent
     * relation pair, not a violation of domain boundaries. Reading a
     * related model across domains is the "legitimate shared reference"
     * case from ARCHITECTURE.md; it's importing another domain's *Actions*
     * that would be the smell.
     */
    public function studySessions(): HasMany
    {
        return $this->hasMany(StudySession::class);
    }

    /**
     * No row exists until SettingsController::show()/update() first calls
     * firstOrCreate() — not created at registration, since most students
     * may never touch Settings at all. This relation is just the typed
     * handle to whatever row (if any) exists.
     */
    public function settings(): HasOne
    {
        return $this->hasOne(UserSetting::class);
    }

    public function aiPracticeSets(): HasMany
    {
        return $this->hasMany(AiPracticeSet::class);
    }

    public function supportTickets(): HasMany
    {
        return $this->hasMany(SupportTicket::class);
    }
}

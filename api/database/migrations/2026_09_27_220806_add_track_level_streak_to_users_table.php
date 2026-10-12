<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('track', ['nursing', 'midwifery'])->nullable()->after('email');
            $table->string('level')->nullable()->after('track');
            $table->unsignedInteger('streak_count')->default(0)->after('level');
            $table->unsignedInteger('weekly_goal_minutes')->default(300)->after('streak_count');
            $table->timestamp('last_active_at')->nullable()->after('weekly_goal_minutes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['track', 'level', 'streak_count', 'weekly_goal_minutes', 'last_active_at']);
        });
    }
};

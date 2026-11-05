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
        // Default 1/1 (not nullable) so existing subjects — real production
        // data, not just test fixtures — keep showing up under Year 1 /
        // Semester 1 instead of disappearing from every list that now
        // filters by these columns. Admin re-assigns each one's real
        // year/semester via Edit after this deploys.
        Schema::table('subjects', function (Blueprint $table) {
            $table->unsignedTinyInteger('year')->default(1)->after('track');
            $table->unsignedTinyInteger('semester')->default(1)->after('year');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            $table->dropColumn(['year', 'semester']);
        });
    }
};

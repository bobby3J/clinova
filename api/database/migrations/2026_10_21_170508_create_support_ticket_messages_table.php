<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_ticket_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('support_ticket_id')->constrained()->cascadeOnDelete();
            // The message's author — a student replying to their own ticket,
            // or an admin replying to it. No separate "is_admin" column:
            // whether an author was an admin *at the time* is derived from
            // the author's current role when the message is displayed (see
            // SupportTicketMessageResource), same as every other
            // "who posted this" field elsewhere in this app.
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_ticket_messages');
    }
};

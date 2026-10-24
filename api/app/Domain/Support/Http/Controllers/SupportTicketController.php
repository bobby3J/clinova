<?php

namespace App\Domain\Support\Http\Controllers;

use App\Domain\Support\Actions\CreateSupportTicketAction;
use App\Domain\Support\Actions\ReplyToSupportTicketAction;
use App\Domain\Support\Http\Requests\CreateSupportTicketRequest;
use App\Domain\Support\Http\Requests\ReplySupportTicketRequest;
use App\Domain\Support\Http\Resources\SupportTicketMessageResource;
use App\Domain\Support\Http\Resources\SupportTicketResource;
use App\Domain\Support\Models\SupportTicket;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * The student-facing half of the support system — every method here only
 * ever touches the caller's own tickets. The admin-facing half
 * (browse/reply-to/resolve *any* student's ticket) is a separate
 * controller, App\Domain\Admin\Http\Controllers\SupportTicketController,
 * routed under the admin-only group — same split StudyLibrary's
 * student-facing StudyMaterialController and the Admin domain's own
 * cross-cutting controllers already establish, not a new pattern.
 */
class SupportTicketController extends Controller
{
    /**
     * GET /api/support/tickets — the caller's own tickets, newest first.
     * Messages aren't eager-loaded here (same reasoning as not loading
     * every flashcard's reviews on the deck list) — the list view only
     * needs subject/status, not the full thread; show() loads messages.
     */
    public function index(Request $request)
    {
        $tickets = $request->user()->supportTickets()->latest()->get();

        return SupportTicketResource::collection($tickets);
    }

    public function store(CreateSupportTicketRequest $request, CreateSupportTicketAction $action)
    {
        $ticket = $action->handle(
            $request->user(),
            $request->validated('subject'),
            $request->validated('category'),
            $request->validated('message'),
        );

        return (new SupportTicketResource($ticket))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, SupportTicket $ticket)
    {
        $this->authorize('view', $ticket);

        $ticket->load('messages.user');

        return new SupportTicketResource($ticket);
    }

    public function replyMessage(
        ReplySupportTicketRequest $request,
        SupportTicket $ticket,
        ReplyToSupportTicketAction $action,
    ) {
        $this->authorize('reply', $ticket);

        $message = $action->handle($request->user(), $ticket, $request->validated('message'));
        $message->load('user');

        return (new SupportTicketMessageResource($message))
            ->response()
            ->setStatusCode(201);
    }
}

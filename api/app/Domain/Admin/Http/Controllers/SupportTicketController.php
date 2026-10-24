<?php

namespace App\Domain\Admin\Http\Controllers;

use App\Domain\Support\Actions\ReplyToSupportTicketAction;
use App\Domain\Support\Actions\UpdateSupportTicketStatusAction;
use App\Domain\Support\Enums\TicketStatus;
use App\Domain\Support\Http\Requests\ReplySupportTicketRequest;
use App\Domain\Support\Http\Requests\UpdateSupportTicketStatusRequest;
use App\Domain\Support\Http\Resources\SupportTicketMessageResource;
use App\Domain\Support\Http\Resources\SupportTicketResource;
use App\Domain\Support\Models\SupportTicket;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * The admin-facing half of the support system — every ticket, not just
 * the caller's own. This lives in the Admin domain (not Support) for the
 * same reason UserManagementController and AnnouncementController do:
 * "act on any student's data" is an Admin-domain concern, even when the
 * underlying model/Action it drives lives in the feature's own domain.
 * Routed under the admin-only middleware group — see routes.php — so
 * there's no role check duplicated in these methods themselves, matching
 * every other controller in this file's siblings.
 */
class SupportTicketController extends Controller
{
    /**
     * GET /api/admin/support/tickets?status=&per_page=
     * Same bounded-pagination convention as UserManagementController::index()
     * — real ticket volume justifies it the same way real signups do.
     */
    public function index(Request $request)
    {
        $perPage = min((int) $request->query('per_page', 25), 100);

        $tickets = SupportTicket::query()
            ->with('user')
            ->when($request->query('status'), fn ($query, $status) => $query->where('status', $status))
            ->latest()
            ->paginate($perPage);

        return SupportTicketResource::collection($tickets);
    }

    public function show(SupportTicket $ticket)
    {
        $ticket->load(['user', 'messages.user']);

        return new SupportTicketResource($ticket);
    }

    public function replyMessage(
        ReplySupportTicketRequest $request,
        SupportTicket $ticket,
        ReplyToSupportTicketAction $action,
    ) {
        $message = $action->handle($request->user(), $ticket, $request->validated('message'));
        $message->load('user');

        return (new SupportTicketMessageResource($message))
            ->response()
            ->setStatusCode(201);
    }

    public function updateStatus(
        UpdateSupportTicketStatusRequest $request,
        SupportTicket $ticket,
        UpdateSupportTicketStatusAction $action,
    ) {
        return new SupportTicketResource(
            $action->handle($ticket, $request->enum('status', TicketStatus::class)),
        );
    }
}

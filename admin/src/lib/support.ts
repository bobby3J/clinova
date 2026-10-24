import { apiGet, apiPatch, apiPost } from "./api";
import type { ApiPaginatedResponse, ApiResponse } from "../types/common";
import type { SupportTicket, TicketMessage, TicketStatus } from "../types/support";

/**
 * GET /admin/support/tickets?status=&page= — every student's tickets,
 * paginated server-side same as getAdminUsers(). `status` is optional;
 * omitting it returns every status, same convention
 * SupportTicketController::index()'s `when()` filter already documents.
 */
export function getAllTickets(status?: TicketStatus | "all", page = 1) {
  const query = new URLSearchParams({ page: String(page) });
  if (status && status !== "all") query.set("status", status);
  return apiGet<ApiPaginatedResponse<SupportTicket>>(
    `/admin/support/tickets?${query.toString()}`,
  );
}

export function getTicket(id: number) {
  return apiGet<ApiResponse<SupportTicket>>(`/admin/support/tickets/${id}`);
}

export function replyToTicket(id: number, message: string) {
  return apiPost<ApiResponse<TicketMessage>>(
    `/admin/support/tickets/${id}/messages`,
    { message },
  );
}

export function updateTicketStatus(id: number, status: TicketStatus) {
  return apiPatch<ApiResponse<SupportTicket>>(
    `/admin/support/tickets/${id}/status`,
    { status },
  );
}

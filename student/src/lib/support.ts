import { apiGet, apiPost } from "./api";
import type { ApiListResponse, ApiResponse } from "../types/common";
import type { SupportTicket, TicketMessage } from "../types/support";

/** GET /support/tickets — the caller's own tickets, newest first. */
export function getTickets() {
  return apiGet<ApiListResponse<SupportTicket>>("/support/tickets");
}

export function createTicket(subject: string, category: string | null, message: string) {
  return apiPost<ApiResponse<SupportTicket>>("/support/tickets", {
    subject,
    category,
    message,
  });
}

/** GET /support/tickets/{id} — includes the full message thread. */
export function getTicket(id: number) {
  return apiGet<ApiResponse<SupportTicket>>(`/support/tickets/${id}`);
}

export function replyToTicket(id: number, message: string) {
  return apiPost<ApiResponse<TicketMessage>>(`/support/tickets/${id}/messages`, { message });
}

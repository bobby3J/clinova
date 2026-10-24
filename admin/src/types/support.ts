/**
 * Matches SupportTicketResource/SupportTicketMessageResource exactly
 * (api/app/Domain/Support/Http/Resources/) — the admin-viewed shape,
 * where `student_name` is always present (it's gated to admins server-
 * side, not omitted here the way the student app's own type reflects).
 */
export type TicketStatus = "open" | "in_progress" | "resolved";

export interface TicketMessage {
  id: number;
  body: string;
  author_name: string;
  is_admin: boolean;
  created_at: string;
}

export interface SupportTicket {
  id: number;
  subject: string;
  category: string | null;
  status: TicketStatus;
  student_name: string;
  created_at: string;
  updated_at: string;
  messages: TicketMessage[];
}

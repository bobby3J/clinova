/**
 * Matches SupportTicketResource/SupportTicketMessageResource exactly
 * (api/app/Domain/Support/Http/Resources/). `student_name` is admin-only
 * — absent entirely for a student viewing their own ticket, same
 * conditional-field convention as PracticeQuestion's correct_option.
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
  student_name?: string;
  created_at: string;
  updated_at: string;
  messages: TicketMessage[];
}

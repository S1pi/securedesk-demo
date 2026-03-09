import { type TicketStatus } from "@/app/generated/prisma/client";

export type TicketActionResult = {
  success: boolean;
  error?: string;
  ticketId?: string;
  status?: TicketStatus;
};

export type TicketListItem = {
  id: string;
  title: string;
  status: TicketStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    id: string;
    email: string;
  };
};

export type ListTicketsResult = {
  success: boolean;
  error?: string;
  tickets?: TicketListItem[];
};

export type TicketStats = {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
};
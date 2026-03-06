import { z } from "zod";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const RegisterSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string().min(12, "Password must be at least 12 characters."),
  role: z.enum(["CUSTOMER", "STAFF"]).optional().default("CUSTOMER"),
});

export const LoginSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

// ---------------------------------------------------------------------------
// Tickets (will be used later)
// ---------------------------------------------------------------------------

export const CreateTicketSchema = z.object({
  title: z.string().min(1, "Title is required.").max(80, "Title must be at most 80 characters."),
  message: z.string().min(1, "Message is required.").max(2000, "Message must be at most 2000 characters."),
});

export const PostReplySchema = z.object({
  content: z.string().min(1, "Message is required.").max(2000, "Message must be at most 2000 characters."),
});

export const ChangeStatusSchema = z.object({
  status: z.enum(["OPEN", "CLOSED"]),
});

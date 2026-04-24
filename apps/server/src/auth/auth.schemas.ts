import { z } from "zod";

export const loginSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z
    .string()
    .trim()
    .min(5, "Phone is required")
    .max(32)
    .regex(/^[\d+\-\s()]+$/, "Invalid phone format"),
});

export type LoginDto = z.infer<typeof loginSchema>;

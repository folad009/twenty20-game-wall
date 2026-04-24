import { z } from "zod";

export const loginFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z
    .string()
    .trim()
    .min(5, "Phone is required")
    .max(32)
    .regex(/^[\d+\-\s()]+$/, "Use digits and common phone symbols only"),
});

export const questionSchema = z.object({
  content: z.string().trim().min(3).max(2000),
});

export const answerSchema = z.object({
  answer: z.string().trim().min(1).max(5000),
});

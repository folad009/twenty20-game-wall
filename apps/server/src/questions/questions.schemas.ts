import { z } from "zod";

export const createQuestionSchema = z.object({
  content: z.string().trim().min(3).max(2000),
});

export const answerQuestionSchema = z.object({
  answer: z.string().trim().min(1).max(5000),
});

export const listQuestionsQuerySchema = z.object({
  status: z.enum(["pending", "answered", "all"]).optional().default("all"),
});

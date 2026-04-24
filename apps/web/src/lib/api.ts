import { apiBaseUrl } from "./env";
import type { Question, User } from "./types";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function parseJson(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${apiBaseUrl}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const data = await parseJson(res);
  if (!res.ok) {
    const msg =
      typeof data === "object" && data && "message" in data
        ? String((data as { message: unknown }).message)
        : res.statusText;
    throw new ApiError(msg || "Request failed", res.status, data);
  }
  return data as T;
}

export type LoginInput = { name: string; phone: string };

export type LoginResponse = {
  accessToken: string;
  user: User;
};

export function login(body: LoginInput) {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function createQuestion(token: string, content: string) {
  return apiFetch<Question>("/questions", {
    method: "POST",
    token,
    body: JSON.stringify({ content }),
  });
}

export function listQuestions(
  token: string,
  status: "pending" | "answered" | "all",
) {
  const q = status === "all" ? "" : `?status=${status}`;
  return apiFetch<Question[]>(`/questions${q}`, { token });
}

export function answerQuestion(token: string, id: string, answer: string) {
  return apiFetch<Question>(`/questions/${id}/answer`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ answer }),
  });
}

export function getWallFeed() {
  return apiFetch<Question[]>("/questions/wall/feed");
}

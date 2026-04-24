export type UserRole = "user" | "admin";

export type User = {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
};

export type QuestionUser = {
  id: string;
  name: string;
  phone?: string;
};

export type Question = {
  id: string;
  content: string;
  answer: string | null;
  status: "pending" | "answered";
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: QuestionUser;
};

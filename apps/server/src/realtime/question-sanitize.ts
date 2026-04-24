import { Question } from "@prisma/client";

export type QuestionWithUser = Question & {
  user: { id: string; name: string; phone: string };
};

/** Public / broadcast shape — never include phone on the wire */
export function toBroadcastQuestion(q: QuestionWithUser) {
  return {
    ...q,
    user: {
      id: q.user.id,
      name: q.user.name,
    },
  };
}

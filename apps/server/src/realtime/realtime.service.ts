import { Injectable } from "@nestjs/common";
import { RealtimeGateway } from "./realtime.gateway";
import { QuestionWithUser, toBroadcastQuestion } from "./question-sanitize";

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  emitNewQuestion(question: QuestionWithUser) {
    this.gateway.server.emit("new_question", {
      question: toBroadcastQuestion(question),
    });
  }

  emitQuestionAnswered(question: QuestionWithUser) {
    this.gateway.server.emit("question_answered", {
      question: toBroadcastQuestion(question),
    });
  }
}

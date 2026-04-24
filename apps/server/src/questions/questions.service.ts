import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeService } from "../realtime/realtime.service";
import { JwtPayload } from "../auth/jwt.strategy";
import { parseBody } from "../common/zod.util";
import {
  answerQuestionSchema,
  createQuestionSchema,
  listQuestionsQuerySchema,
} from "./questions.schemas";

const questionInclude = {
  user: { select: { id: true, name: true, phone: true } },
} as const;

@Injectable()
export class QuestionsService {
  private readonly lastPostByUser = new Map<
    string,
    { at: number; content: string }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  private assertRateLimit(userId: string, content: string) {
    const now = Date.now();
    const prev = this.lastPostByUser.get(userId);
    const cooldownMs = 2000;
    if (prev && now - prev.at < cooldownMs) {
      throw new ConflictException("Please wait before submitting again.");
    }
    if (prev && prev.content === content && now - prev.at < 15_000) {
      throw new ConflictException("Duplicate submission ignored.");
    }
    this.lastPostByUser.set(userId, { at: now, content });
  }

  async create(user: JwtPayload, raw: unknown) {
    const dto = parseBody(createQuestionSchema, raw);
    this.assertRateLimit(user.sub, dto.content);

    const question = await this.prisma.question.create({
      data: {
        content: dto.content,
        status: "pending",
        userId: user.sub,
      },
      include: questionInclude,
    });

    this.realtime.emitNewQuestion(question);
    return question;
  }

  async list(user: JwtPayload, query: Record<string, string | undefined>) {
    const { status } = parseBody(listQuestionsQuerySchema, {
      status: query.status ?? "all",
    });

    const where =
      status === "all"
        ? {}
        : {
            status,
          };

    const isAdmin = user.role === "admin";
    const rows = await this.prisma.question.findMany({
      where,
      include: questionInclude,
      orderBy: { createdAt: "desc" },
      take: isAdmin ? 500 : 100,
    });

    if (!isAdmin) {
      return rows.filter((q) => q.userId === user.sub);
    }
    return rows;
  }

  /** Public feed for display wall — no PII beyond display name */
  async wallFeed(limit = 80) {
    return this.prisma.question.findMany({
      where: {},
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
  }

  async answer(questionId: string, raw: unknown) {
    const dto = parseBody(answerQuestionSchema, raw);

    const existing = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: questionInclude,
    });

    if (!existing) {
      throw new NotFoundException("Question not found");
    }

    if (existing.status === "answered") {
      throw new BadRequestException("Question already answered");
    }

    const question = await this.prisma.question.update({
      where: { id: questionId },
      data: {
        answer: dto.answer,
        status: "answered",
      },
      include: questionInclude,
    });

    this.realtime.emitQuestionAnswered(question);
    return question;
  }
}

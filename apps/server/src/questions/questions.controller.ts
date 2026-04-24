import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { AdminGuard } from "../auth/admin.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { JwtPayload } from "../auth/jwt.strategy";
import { QuestionsService } from "./questions.service";

@Controller("questions")
export class QuestionsController {
  constructor(private readonly questions: QuestionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req: Request & { user: JwtPayload }, @Body() body: unknown) {
    return this.questions.create(req.user, body);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list(
    @Req() req: Request & { user: JwtPayload },
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.questions.list(req.user, query);
  }

  @Get("wall/feed")
  wallFeed() {
    return this.questions.wallFeed();
  }

  @Patch(":id/answer")
  @UseGuards(JwtAuthGuard, AdminGuard)
  answer(@Param("id") id: string, @Body() body: unknown) {
    return this.questions.answer(id, body);
  }
}
